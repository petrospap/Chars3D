import {_SETTINGS} from './settings.ts';
import type {Ixy, IG3D, IFontData, IXBounds, IGlyphXBounds, IGlyphBuffers, IBlitBuffers} from './interfaces.ts';
// v0.9.9 bevel working, final clean, minify

// helpers
const _SIZE = _SETTINGS.MASTERSIZE,
normalize = (vector: Ixy): Ixy => {
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
    const rawMinX = (xMin === undefined || xMin === null) ? 0.5 : xMin * _SIZE;
    const rawMinY = (yMin === undefined || yMin === null) ? 0.5 : yMin * _SIZE;
    const rawMaxX = (xMax === undefined || xMax === null) ? 0.5 : xMax * _SIZE;
    const rawMaxY = (yMax === undefined || yMax === null) ? 0.5 : yMax * _SIZE;

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


/**
	V:0.3
	GLYPHS: JSON input structure to build Atlas, looks like:

	Meaning			key
	width			_w
	boundaries		_x
	vertices		_v
	indices			_i
	normals			_n
	main contour	m
	holes			h
	ranges			r
	start			s
	count			c
	isHole			o
	frontCount		_f

    "charCode OR letter OR word": { // depended of what we build, created from buildLetters() || buildSymbols()
        "_w": 665,			// number: width
        "_v": [ ... ],		// array: vertices
		"_x": [ ... ],		// array: boundaries > glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax
        "_i": [ ... ],		// array: indices
        "_n": [ ... ],		// array: normals
		"_k": [ ... ],		// array: kerns < optional

		// the following object and _f, exist only when is IS3D
		"_o": [{					// array->object: contours
		  "m": [ ... ],				// array:  main contour
		  "h": [ [...], [...] ],	// arrays: holes
		  "r": [					// array->objects: ranges
			{ "s":0, "c":12, "o":0 },
			{ "s":12, "c":8, "o":1 }
		  ]
		}],
		"_f": 20			 // number: front/back vertex count
    }
*/

export class Atlas {
/** holds font glyphs/polygons from fonts that we have loaded */
static fonts: Record<string, IFontData> = {};

/* optional count total letters and memory bytes */
static totalFonts: number = 0;
static letters2D: number = 0;
static letters3D: number = 0;
static totalbytes2d: number = 0;
static totalbytes3d: number = 0;
static MITER_LIMIT: number = 0.8; // Cap the spike miter of the bevel width

	constructor(GLYPHS: Record<string, IFontData>, BLIT: IBlitBuffers, hasblit: boolean, hasfont: boolean) {

		if(hasfont){

			/** Pre build (sum everything up) */
			for (const [name, font] of Object.entries(GLYPHS) as [string, any]) {

				Atlas.fonts[name] = {...font};
				const is3d = font._info.is3d;
				//const {is3d, ascender, descender} = font._info;


				for (const [letter, glyph] of Object.entries(font) as [string, any]) {
					if (glyph._v) {
						// set bounds
						// glyph._x = [glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax];
						// const [xMin, yMin, xMax, yMax] = bounds;
						glyph.bounds = setGBounds(glyph._x);
						if(is3d){
							/*
							NOTE, issue with "thin" fonts, like ubuntu (Light), etc,
							if we add a texture, texture applied as vertical lines..
							i.e in letters "a,e,n,m,o,r,s,u,v,w" FrontFace texture has vertical lines,
							while in all other letters FrontFace texture displayed normal!!
							no issue in 3D sidewall's tho..
							one way to fix is to pass ascender, descender, and scale vertical UV's based on them
							
							Atlas.build3D(glyph, ascender, descender)
							Atlas.build2D(glyph, ascender, descender)
							*/
							Atlas.build3D(glyph)
						}else{
							Atlas.build2D(glyph)

						}
					}
				}
			};
			(GLYPHS as any) = [];
		};

		if(hasblit){
			for (const [name, font] of Object.entries(BLIT)) {
				Atlas.fonts[name] = {...font};
				for (const [letter, glyph] of Object.entries(font)) {

					if (glyph._v) {
						// set bounds
						glyph.bounds = setGBounds(glyph._x)
					}
				}
			};
		   BLIT = null
		};

		Atlas.cleanFonts()
		//console.log('Atlas',Atlas.fonts);
	};

	private static cleanFonts(){
		// total fonts that we have load
		Atlas.totalFonts = Object.keys(Atlas.fonts).length;

		for (const [name, font] of Object.entries(Atlas.fonts)) {
			const {is3d, defaultKern} = Atlas.fonts[name]._info;

			for (const [letter, g] of Object.entries(font)) {
				if (g._v) {

					/* free some memory / delete objects that not need any more */
					if(g._v != 1){
						// MANDATORY to replace vertices[] to 1. is a FLAG that we have glyphs. 
						g._v = 1
					};

					if(g._x){
						// delete opentype bounds
						delete g._x 
					};

					if(g._i){
						// remove source indices
						delete g._i
					};

					if(g._n){
						// remove source normals
						delete g._n
					};

					if(defaultKern===false && g._k){
						// remove source kern
						delete g._k
					};

					if(is3d){
						
						if(g._o){
							// remove source contours
							delete g._o
						};

						if(g._f){
							// remove source back/front info
							delete g._f
						};
						// calculate memory
						if(_SETTINGS.debugTime){
							Atlas.letters3D++;
							Atlas.totalbytes3d += g.P.byteLength;
							Atlas.totalbytes3d += g.N.byteLength;
							Atlas.totalbytes3d += g.U.byteLength;
							Atlas.totalbytes3d += g.FID.byteLength;
							Atlas.totalbytes3d += g.I.byteLength;
							// standard flat bounding metric definitions
							Atlas.totalbytes3d += 64; // 8 properties {minX, minY, maxX, maxY, rangeX, rangeY, centerX, centerY} x 8 bytes 64
						}
					}else{
						if(_SETTINGS.debugTime){
							Atlas.letters2D++;
							Atlas.totalbytes2d += g.P.byteLength;
							Atlas.totalbytes2d += g.N.byteLength;
							Atlas.totalbytes2d += g.U.byteLength;
							Atlas.totalbytes2d += g.FID.byteLength;
							Atlas.totalbytes2d += g.I.byteLength;
							Atlas.totalbytes2d += 64;
						}
					}
				}
			}
		}
	};


	/**
	* builds the main Vertex Data 2D
	* @param _i: number[];
	* @param _n: number[];
	* @param _v: number[];
	* @param _w: number;
	* optional pass
	* @param ascender: number,
	* @param descender: number
	*/
	private static build2D(g: IG3D): void {
		/* Pre-allocate arrays as we know the size (much faster than .push) */
		//const globalRangeY: number = (ascender - descender);
		const ver = g._v,
		vLen = ver.length / 3,
		P = new Float32Array(vLen * 3),
		I = new Uint32Array(g._i),
		U = new Float32Array(vLen * 2),
		FID = new Float32Array(vLen),
		N = new Float32Array(vLen * 3),
		{minX, minY, rangeX, rangeY} = g.bounds;

		let i = 0;
		for (; i < vLen; i++) {
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
			//U[i2 + 1] = (ry - descender) / globalRangeY; // uncomment this, and comment the above
			FID[i] = 0.0; /* ID for Shader: FrontFace */
		};

		/* update/save Data to Object */
		g.P = P;
		g.I = I;
		g.N = N;
		g.U = U;
		g.FID = FID;
		g.L = P.length;
		g.IL = I.length
	};


	/**
	* builds the main Vertex Data 3D
	* interface IG3D:
	* @param _w: number;       	// width
	* @param _v: number[]|null; // vertices
	* @param _i: number[];     	// indices
	* @param _n: number[];     	// normals
	* @param _k?: Record<string, number>; // kern
	* @param _o?: IContour[];  	// contours (3D)
	* @param _f?: number;       // back/front vertex count
		
	* optional pass
	* @param ascender: number,
	* @param descender: number
	*/

	private static build3D(g: IG3D): void {
		//const globalRangeY: number = (ascender - descender);
		const P: number[] = [],
		I: number[] = [],
		U: number[] = [],
		N: number[] = [],
		FID: number[] = [], /* colors shader */
		v2: number[] = [],
		i2: number[] = g._i,
		i2len: number = i2.length,
		_FC: number = g._f,
		STEPS = 2, /* Bevel steps: 1 = Flat, 4 = Smooth Curve, Higher = smoother curve, DO NOT ADD MORE THAN 4 */
		{minX, minY, rangeX, rangeY} = g.bounds;
		
		/* V2 replaces "_b" */
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
			const scaledX = rawX * _SIZE;
			const scaledY = rawY * _SIZE;

			// push positions with clean geometry to the buffer
			P.push(scaledX, scaledY, 0);

			// Both the coordinates and bounds are now in the same scale, this creates an absolute, pristine 0.0 to 1.0 UV space coordinate mapping.
			const u = (scaledX - minX) / rangeX;
			const v = (scaledY - minY) / rangeY;
			//const v = (scaledY - descender) / globalRangeY;
			
			U.push(u, v);
			N.push(0, 0, -1); /* Normal points straight at the camera */
			FID.push(0.0)    /* ID for Shader: FrontFace */
		};

		/** Sidewall EDGE's ( Sidewall + Bevel) */
		for (const poly of g._o) {
			/** Identify all paths: the main outline and any internal holes (like in 'O' or 'D') */
			const paths = [{ pts: poly.m, hole: false }, ...poly.h.map(h => ({ pts: h, hole: true }))];
			paths.forEach(({ pts, hole }) => {
				const count = pts.length / 2;

				/** Pre-calculate MITER vectors for the whole path */
				const miters = [];
				let i1 = 0;
				for (; i1 < count; i1++) {
					const prev = (i1 + count - 1) % count;
					const next = (i1 + 1) % count;

					/** Get vectors for previous and next segments */
					const v1 = { x: pts[i1*2] - pts[prev*2], y: pts[i1*2+1] - pts[prev*2+1] };
					const v2 = { x: pts[next*2] - pts[i1*2], y: pts[next*2+1] - pts[i1*2+1] };

					/** Get perpendicular normals */
					const n1 = normalize({ x: -v1.y, y: v1.x });
					const n2 = normalize({ x: -v2.y, y: v2.x });

					/** Average them for the Miter */
					const miter = normalize({ x: n1.x + n2.x, y: n1.y + n2.y });

					/** Miter Length Correction */
					const cosAngle = n1.x * n2.x + n1.y * n2.y;

					let miterLen = 1 / Math.sqrt(Math.max(0, (1 + cosAngle) / 2));

					/** CAP THE SPIKE: Never let the miter be more than 2-3x the bevel */
					if (miterLen > Atlas.MITER_LIMIT) miterLen = Atlas.MITER_LIMIT;
					miters.push(miter.x * miterLen, miter.y * miterLen);
				};

				/* Subdivided Ribbon Matrix Generator, we use the Above Miters */
				let i = 0;
				for (; i < count; i++) {
					const next = (i + 1) % count;
					for (let s = 0; s < STEPS; s++) {
						const zStart = s / STEPS;
						const zEnd = (s + 1) / STEPS;
						const bvs = P.length / 3;
						/**
						 POSITION: Store the ACTUAL font points (pts)
                         Save raw font anchor coordinates.
                         Z-axis value acts as the localized 't' parameter (0.0 to 1.0) to bevel
						*/
						P.push(pts[i * 2] * _SIZE, pts[i * 2 + 1] * _SIZE, zStart);    	/* 0: Top Left */
						P.push(pts[next * 2] * _SIZE, pts[next * 2 + 1] * _SIZE, zStart); /* 1: Top Right */
						P.push(pts[next * 2] * _SIZE, pts[next * 2 + 1] * _SIZE, zEnd);   /* 2: Bottom Right */
						P.push(pts[i * 2] * _SIZE, pts[i * 2 + 1] * _SIZE, zEnd);      	/* 3: Bottom Left */

						/**
						 NORMALS
						 Anchor the matching miters directly to the matching corner index paths
						 N buffer tells assemble3D which way to "push" the bevel.
						*/
						N.push(miters[i * 2], miters[i * 2 + 1], zStart);     	/* direction for point i start */
						N.push(miters[next * 2], miters[next * 2 + 1], zStart); /* direction for point next start */
						N.push(miters[next * 2], miters[next * 2 + 1], zEnd);   /* direction for point next end */
						N.push(miters[i * 2], miters[i * 2 + 1], zEnd);      	/* direction for point i end */

						/* UV & INDICES (stay the same) */
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

			// Scale them uniformly to match the 3D world sizing boundaries
			const scaledX = rawX * _SIZE;
			const scaledY = rawY * _SIZE;

			// Push back cap geometry to buffer at maximum depth position
			// (t = 1.0 or depth depending on layout arrangement)
			//P.push(scaledX, scaledY, 1.0);
			P.push(scaledX, scaledY, 2);

			// Aligned UV Math matching the same scale space
			const u = (scaledX - minX) / rangeX;
			const v = (scaledY - minY) / rangeY;
			//const v = (scaledY - descender) / globalRangeY;

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

		/* Store Raw Indices */
		const I3D = new Uint32Array(I);

		/*
		 Final Data Assembly
		 VertexData.ComputeNormals is skipped, as manually provided smooth normals.
		*/
		const P3D = new Float32Array(P);

		g.P = P3D;
		g.I = I3D;
		g.N = new Float32Array(N);
		g.U = new Float32Array(U);
		g.FID = new Float32Array(FID);
		g.L = P3D.length;
		g.IL = I3D.length
	}

}