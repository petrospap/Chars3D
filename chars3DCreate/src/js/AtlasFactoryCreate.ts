import {UI} from './UI';
import type {Ixy, IG3D, IGlyphXBounds, IFontData} from './interfaces';
// v1.0.1 last bevel working, final, minify, clean IBoundsOut - NOTE IG2D REMOVED

const _MASTERSIZE = 0.001; // _MASTERSIZE MUST HAVE SAME VALUE AS IN UI > _INTERNAL.GLYPH_COORDS_SCALE
const _MITER_LIMIT = 0.8; // spike mitter limit

const normalize = (vector: Ixy): Ixy => {
	// calculate the length (Pythagorean theorem)
	const length:number = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

	// prevent division by zero if the vector is empty
	if (length === 0) return { x: 0, y: 0 };

	// divide by length to get a "Unit Vector" (Length = 1)
	return {
		x: vector.x / length,
		y: vector.y / length
	}
},
setGBounds = (bounds: number[]): IGlyphXBounds => {
    const [xMin, yMin, xMax, yMax] = bounds;

    // FIX: Check explicitly for null/undefined so that a raw '0' coordinate passes safely!
    const rawMinX = (xMin === undefined || xMin === null) ? 0.5 : xMin * _MASTERSIZE;
    const rawMinY = (yMin === undefined || yMin === null) ? 0.5 : yMin * _MASTERSIZE;
    const rawMaxX = (xMax === undefined || xMax === null) ? 0.5 : xMax * _MASTERSIZE;
    const rawMaxY = (yMax === undefined || yMax === null) ? 0.5 : yMax * _MASTERSIZE;

    // Enforce logical orientation boundaries so min is always the lower anchor
    const minX = Math.min(rawMinX, rawMaxX);
    const maxX = Math.max(rawMinX, rawMaxX);
    const minY = Math.min(rawMinY, rawMaxY);
    const maxY = Math.max(rawMinY, rawMaxY);

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    const centerX = minX + (rangeX * 0.5);
    const centerY = minY + (rangeY * 0.5);

    return { minX, minY, maxX, maxY, rangeX, rangeY, centerX, centerY };
};


export class Atlas {
	
static lineSpace: number|string;
static lineBreak: number|string;

static FONT_DATA: Record<string, IFontData> = {};
static CACHE_BLIT: Record<string, any[]> = {};


	constructor(GLYPHS: IFontData) {

		Atlas.FONT_DATA = GLYPHS;
		GLYPHS = null;
		const is3d = Atlas.FONT_DATA._info.is3d;
		
		/** Pre build (Sum everything up) */
		for (const [letter, glyph] of Object.entries(Atlas.FONT_DATA)) {
			
			// charCode of space ' ' is 32
			if(letter == UI.LINESPACE || letter == UI.LETTERSPACE){
				Atlas.lineSpace = letter;
			};
			
			// charCode of caret '^' is 94
			if(letter == UI.LINEBREAK || letter == UI.LETTERLINEBREAK){
				Atlas.lineBreak = letter
			};
			
			if (glyph._v) {
				!is3d ? Atlas.build2D(glyph) : Atlas.build3D(glyph);
			}
		};
		
		
		//console.log('Atlas. fonts',Atlas.FONT_DATA);
	};
	
	private static build2D(g: IG3D): void {
		
		/* Pre-allocate arrays as we know the size (much faster than .push) */
		const ver = g._v,
		vertCount = ver.length / 3,
		P = new Float32Array(vertCount * 3),
		I = new Uint32Array(g._i),
		U = new Float32Array(vertCount * 2),
		FID = new Float32Array(vertCount),
		N = new Float32Array(vertCount * 3),
		{minX, minY, rangeX, rangeY} = setGBounds(g._x);

		let i = 0;
		for (; i < vertCount; i++) {
			const i2 = i * 2,
			i3 = i * 3,
			i4 = i * 4,
			rx = ver[i3],
			ry = ver[i3 + 1];

			/* position */
			P[i3] = rx;
			P[i3 + 1] = ry;
			P[i3 + 2] = 0;

			/* Manual normals for 2D are faster than ComputeNormals */
			N[i3] = 0;     /* nx */
			N[i3 + 1] = 0; /* ny */
			N[i3 + 2] = 1; /* nz (or -1 depending on coordinate system) */

			/* UV's */
			U[i2] = (rx - minX) / rangeX;
			U[i2 + 1] = (ry - minY) / rangeY;
			FID[i] = 0.0; /* ID for Shader: FrontFace */
		};

		/* update/save Data to Object */
		g.P = P;
		g.I = I;
		g.N = N;
		g.U = U;
		g.FID = FID;
		g.L = P.length;
		g.IL = I.length;
		
	};

	private static build3D(g: IG3D): void {

		const P: number[] = [],
		I: number[] = [],
		U: number[] = [],
		N: number[] = [], /* Manual Normals */
		FID: number[] = [], /* colors shader */
		v2: number[] = [],
		i2: number[] = g._i,
		i2len: number = i2.length,
		_FC = g._f,
		
		/*
		// V1
		v2 = g._b.v,
		i2 = g._i,
		_FC = g._b.f,
		*/
		STEPS = 2, /* Bevel steps: 1 = Flat, 4 = Smooth Curve, Higher = smoother curve, DO NOT ADD MORE THAN 4 */
		{minX, minY, rangeX, rangeY} = setGBounds(g._x);
		
		for (const c of g._o) {
			v2.push(...c.m);
			// holes
			for (const h of c.h) {
				v2.push(...h)
			}
		};
		
		/** FRONT FACE Builds the front cap of the letter at Z=0 */
		let fi = 0;
		for (; fi < _FC; fi++) {
			const idf = fi * 2;

			// the raw, unscaled positions
			const rawX = v2[idf];
			const rawY = v2[idf + 1];

			// Scale to match 3D world sizing
			const scaledX = rawX * _MASTERSIZE;
			const scaledY = rawY * _MASTERSIZE;

			// push positions with clean geometry to the buffer
			P.push(scaledX, scaledY, 0);

			// Both the coordinates and bounds are now in the same scale, this creates an absolute, pristine 0.0 to 1.0 UV space coordinate mapping.
			const u = (scaledX - minX) / rangeX;
			const v = (scaledY - minY) / rangeY;
			U.push(u, v);
			N.push(0, 0, -1); /* Normal points straight at the camera */
			FID.push(0.0)    /* ID for Shader: FrontFace */
		};

		/** THE UNIFIED EDGE ( Sidewall + Bevel) */
		for (const poly of g._o) {
			/** Identify all paths: the main outline and any internal holes (like in 'O' or 'D') */
			const paths = [{ pts: poly.m, hole: false }, ...poly.h.map(h => ({ pts: h, hole: true }))];
			paths.forEach(({ pts, hole }) => {
				const count = pts.length / 2;

				/** Pre-calculate MITER vectors for the whole path */
				const miters = [];
				for (let i = 0; i < count; i++) {
					const prev = (i + count - 1) % count;
					const next = (i + 1) % count;

					/** Get vectors for previous and next segments */
					const v1 = { x: pts[i*2] - pts[prev*2], y: pts[i*2+1] - pts[prev*2+1] };
					const v2 = { x: pts[next*2] - pts[i*2], y: pts[next*2+1] - pts[i*2+1] };

					/** Get perpendicular normals */
					const n1 = normalize({ x: -v1.y, y: v1.x });
					const n2 = normalize({ x: -v2.y, y: v2.x });

					/** Average them for the Miter */
					const miter = normalize({ x: n1.x + n2.x, y: n1.y + n2.y });

					/** Miter Length Correction (the 'denom' you used before) */
					const cosAngle = n1.x * n2.x + n1.y * n2.y;

					let miterLen = 1 / Math.sqrt(Math.max(0, (1 + cosAngle) / 2));

					/** CAP THE SPIKE: Never let the miter be more than 2-3x the bevel */
					if (miterLen > _MITER_LIMIT) miterLen = _MITER_LIMIT;
					/*if (miterLen > 1.5) miterLen = 1.5; */
					miters.push(miter.x * miterLen, miter.y * miterLen);
				};

				/* Subdivided Ribbon Matrix Generator, we use the Above Miters */
				for (let i = 0; i < count; i++) {
					const next = (i + 1) % count;
					for (let s = 0; s < STEPS; s++) {
						const zStart = s / STEPS;
						const zEnd = (s + 1) / STEPS;
						const bvs = P.length / 3;
						/*
						 POSITION: Store the ACTUAL font points (pts)
                         Save raw font anchor coordinates.
                         Z-axis value acts as the localized 't' parameter (0.0 to 1.0) to bevel
						*/
						P.push(pts[i * 2] * _MASTERSIZE, pts[i * 2 + 1] * _MASTERSIZE, zStart);    	/* 0: Top Left */
						P.push(pts[next * 2] * _MASTERSIZE, pts[next * 2 + 1] * _MASTERSIZE, zStart); /* 1: Top Right */
						P.push(pts[next * 2] * _MASTERSIZE, pts[next * 2 + 1] * _MASTERSIZE, zEnd);   /* 2: Bottom Right */
						P.push(pts[i * 2] * _MASTERSIZE, pts[i * 2 + 1] * _MASTERSIZE, zEnd);      	/* 3: Bottom Left */

						/*
						 NORMALS
						 Anchor the matching miters directly to the matching corner index paths
						 N buffer tells assemble3D which way to "push" the bevel.
						*/
						N.push(miters[i * 2], miters[i * 2 + 1], zStart);     /* Direction for point i */
						N.push(miters[next * 2], miters[next * 2 + 1], zStart); /* Direction for point next */
						N.push(miters[next * 2], miters[next * 2 + 1], zEnd);   /* direction for point next */
						N.push(miters[i * 2], miters[i * 2 + 1], zEnd);      /* Direction for point i */

						/* 3. UV & INDICES (Stay the same) */
						U.push(i/count, zStart, (i+1)/count, zStart, (i+1)/count, zEnd, i/count, zEnd);

						/* set correct INDICES for holes */
						if (hole) {
							I.push(bvs, bvs + 2, bvs + 1, bvs, bvs + 3, bvs + 2)
						} else {
							I.push(bvs, bvs + 1, bvs + 2, bvs, bvs + 2, bvs + 3)
						};

						FID.push(1.0, 1.0, 1.0, 1.0) /* ID for Shader: sidewall */
					}
				}
			})
		};

		/*
		 BACK FACE
		 Builds the back cap of the letter at Z=2
		*/
		const backStart = P.length / 3;
		let bi = 0;

		for (; bi < _FC; bi++) {
			const idx2 = bi * 2;

			// Get raw unscaled positions from matching data stream
			const rawX = v2[idx2];
			const rawY = v2[idx2 + 1];

			// Scale them uniformly to match 3D world sizing boundaries
			const scaledX = rawX * _MASTERSIZE;
			const scaledY = rawY * _MASTERSIZE;

			// Push back cap geometry to buffer at maximum depth position
			// (t = 1.0 or depth depending on layout arrangement)
			//P.push(scaledX, scaledY, 1.0);
			P.push(scaledX, scaledY, 2);

			// Aligned UV Math matching the same scale space
			const u = (scaledX - minX) / rangeX;
			const v = (scaledY - minY) / rangeY;

			// Reverse X axis so the image orientation mirrors perfectly on the reverse side
			U.push(1.0 - u, v);
			N.push(0, 0, 1);  // Normal points straight away from the camera
			FID.push(2.0);    // ID for Shader: BackFace
		}

		/*
		Why we use 1 - u: When you look at the front of a transparent letter, "left" is (0).
		When you walk around to the back, that same "left" edge is now on your right.
		By using 1 - u, the texture starts from the opposite side relative to the geometry,
		making the image appear in the same orientation on both sides.
		*/

		/*
		 CAP INDICES
		 Combines the front and back indices. Back face triangles are reversed.
		*/
		//const i2len = i2.length;
		let k = 0;
		for (; k < i2len; k += 3) {
			I.push(i2[k], i2[k+1], i2[k+2]);
			I.push(backStart + i2[k], backStart + i2[k+2], backStart + i2[k+1]);
		};

		/* Indices */
		const I3D = new Uint32Array(I);
		
		/* Positions */
		const P3D = new Float32Array(P);
		
		/*
		 Final Data Assembly
		 VertexData.ComputeNormals is skipped as manually provided smooth normals.
		*/
		
		g.P = P3D;
		g.I = I3D;
		g.N = new Float32Array(N);
		g.U = new Float32Array(U);
		g.FID = new Float32Array(FID);
		g.L = P3D.length
		g.IL = I3D.length;
	};


	/* prepare and sum data */
	static async buildMegaAtlas(): Promise<any> {
		let PSize = 0,
		ISize = 0,
		USize = 0,
		NSize = 0,
		FIDSize = 0;

		// Calculate precise length for each TypedArray
		for (const [letter, g] of Object.entries(Atlas.FONT_DATA)) {
			if (g._v) {
				PSize += g.P.length;
				ISize += g.I.length;
				USize += g.U.length;
				NSize += g.N.length;
				FIDSize += g.FID.length
			}
		};
		
		// offsets 
		let pOffset = 0,
		iOffset = 0,
		uOffset = 0,
		nOffset = 0,
		fidOffset = 0;

		// Reset CACHE_BLIT
		Atlas.CACHE_BLIT = {};
		
		for (const [id, g] of Object.entries(Atlas.FONT_DATA)) {
			// add info
			if (id === '_info') {
				Atlas.CACHE_BLIT[id] = g;
				continue
			};

			// add non-geometry letters
			if (id == Atlas.lineSpace || id == Atlas.lineBreak) {
				Atlas.CACHE_BLIT[id] = {
					_w: g._w,
					_v: null
				};
				continue
			};
			
			if (g._v) {
				// set data for geometry letters
				Atlas.CACHE_BLIT[id] = {
					_w: g._w,	// width
					_v: 1,		// mark
					_x: g._x, 	// bounds
					_k: g._k || null, // kern
					L: g.L, 	// P.length
					IL: g.IL,	// I.length
					pStart: pOffset, pEnd: pOffset + g.L,
					iStart: iOffset, iEnd: iOffset + g.IL,
					uStart: uOffset, uEnd: uOffset + g.U.length,
					nStart: nOffset, pEndN: nOffset + g.N.length, 
					fidStart: fidOffset, fidEnd: fidOffset + g.FID.length
				};

				pOffset += g.L;
				iOffset += g.IL;
				uOffset += g.U.length;
				nOffset += g.N.length;
				fidOffset += g.FID.length;
			}
		}

		//  Assemble unified typed tracking blocks
		const megaP = new Float32Array(PSize);
		const megaI = new Uint32Array(ISize);
		const megaU = new Float32Array(USize);
		const megaN = new Float32Array(NSize);
		const megaFID = new Float32Array(FIDSize);

		for (const [id, g] of Object.entries(Atlas.FONT_DATA)) {
			if (g._v) {
				const meta = Atlas.CACHE_BLIT[id];
				
				megaP.set(g.P, meta.pStart);
				megaU.set(g.U, meta.uStart);
				megaN.set(g.N, meta.nStart);
				megaFID.set(g.FID, meta.fidStart);
				megaI.set(g.I, meta.iStart);
			}
		};
		
		Atlas.FONT_DATA = {};
		// Package everything as PURE raw TypedArrays
		return {megaP, megaI, megaU, megaN, megaFID}
	}


	/**
	 * Serializes all parsed character glyphs into a single binary format (.c3d) payload.
	 * Ready for instant runtime injection without any loop overhead!
	 */
	static encodeAndDownload(exportName: string, packageData: any): void {
		const { megaP, megaI, megaU, megaN, megaFID } = packageData;

		// Separate info
		const infoSection = Atlas.CACHE_BLIT['_info'];
		
		if(!infoSection){
			throw new Error("Encoding INFO failed.");
		};
		// remove info
		delete Atlas.CACHE_BLIT['_info'];

		const encoder = new TextEncoder();
		const infoBytes = encoder.encode(JSON.stringify(infoSection));
		const blitBytes  = encoder.encode(JSON.stringify(Atlas.CACHE_BLIT));

		// Calculate byte boundaries including 4-byte padding alignments
		let fBytes = 4; // Space for 'ATLS' Magic Header
		fBytes += 4 + infoBytes.byteLength;
		
		let infoPadding = (4 - (fBytes % 4)) % 4;
		fBytes += infoPadding;

		fBytes += 4 + blitBytes.byteLength;
		let lutPadding = (4 - (fBytes % 4)) % 4;
		fBytes += lutPadding;

		// Track total block byte capacities
		fBytes += 4 + megaP.byteLength;
		fBytes += 4 + megaN.byteLength;
		fBytes += 4 + megaU.byteLength;
		fBytes += 4 + megaFID.byteLength;
		fBytes += 4 + megaI.byteLength;
		fBytes += 4; // Space for Checksum Footer

		// Allocate binary block structure
		const _Buffer = new ArrayBuffer(fBytes);
		const dv = new DataView(_Buffer);
		let offset = 0;

		// Set Magic Header (0x41544C53 = 'ATLS')
		dv.setUint32(offset, 0x41544C53, false); 
		offset += 4;

		// Write Info Block
		dv.setUint32(offset, infoBytes.byteLength, true); offset += 4;
		new Uint8Array(_Buffer, offset, infoBytes.byteLength).set(infoBytes);
		offset += infoBytes.byteLength;
		offset += infoPadding;

		// Write Character Dictionary LUT Block
		dv.setUint32(offset, blitBytes.byteLength, true); offset += 4;
		new Uint8Array(_Buffer, offset, blitBytes.byteLength).set(blitBytes);
		offset += blitBytes.byteLength;
		offset += lutPadding;

		// Write Floating-point array slices
		dv.setUint32(offset, megaP.byteLength, true); offset += 4;
		new Float32Array(_Buffer, offset, megaP.length).set(megaP); 
		offset += megaP.byteLength;

		dv.setUint32(offset, megaN.byteLength, true); offset += 4;
		new Float32Array(_Buffer, offset, megaN.length).set(megaN); 
		offset += megaN.byteLength;

		dv.setUint32(offset, megaU.byteLength, true); offset += 4;
		new Float32Array(_Buffer, offset, megaU.length).set(megaU); 
		offset += megaU.byteLength;

		dv.setUint32(offset, megaFID.byteLength, true); offset += 4;
		new Float32Array(_Buffer, offset, megaFID.length).set(megaFID); 
		offset += megaFID.byteLength;

		dv.setUint32(offset, megaI.byteLength, true); offset += 4;
		new Uint32Array(_Buffer, offset, megaI.length).set(megaI); 
		offset += megaI.byteLength;

		// add SECURE FOOTER CALCULATIONS
		const checksumBytes = _Buffer.slice(0, offset);
		const checksum = Atlas.#calculateChecksum(checksumBytes);
		
		// Write out the checksum integer
		dv.setUint32(offset, checksum, true);

		// create blob and download
		const blob = new Blob([_Buffer], { type: 'application/octet-stream' });
		const url = URL.createObjectURL(blob);
		const dl = document.createElement('a');
		dl.href = url;
		dl.download = `${exportName}.c3da`;
		document.body.appendChild(dl);
		dl.click();
		//dl.remove()
		
		setTimeout(() => {
			Atlas.CACHE_BLIT = {}
			document.body.removeChild(dl);
			URL.revokeObjectURL(url);
		}, 1);

		//console.log(`File Compiled Successfully: ${exportName}.c3da (Checksum: ${checksum})`);
	};

	/**
	 * Fast bitwise checksum tracking algorithm
	 */
	static #calculateChecksum(buffer: ArrayBuffer): number {
		const uint8 = new Uint8Array(buffer), len = uint8.length
		let i = 0, sum = 0;
		for (; i < len; i++) {
			sum = (sum + uint8[i]) >>> 0
		};
		return sum
	}
}
