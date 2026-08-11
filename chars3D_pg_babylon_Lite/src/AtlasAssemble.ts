import {_SETTINGS} from './settings.ts';
import type {IGlyphBuffers, IBackgroundGeometry, IStats} from './interfaces.ts';

// v:0.20 final
const SEGMENTS: number = 16;
const POINTERS_PER_RING: number = (SEGMENTS + 1) * 4; 			// Exactly 68 points
const POINTERS_MINUS: number = POINTERS_PER_RING - 1;			// 67 points
const BACKGROUND_VERTEX_BASE: number = 1 + POINTERS_PER_RING; 	// 69 vertices
const BACKGROUND_V: number = BACKGROUND_VERTEX_BASE * 3;  		// 207 fields
const BACKGROUND_I: number = POINTERS_PER_RING * 3;  			// 204 fields

// CRITICAL VERIFICATION: If border is true, we have TWO loops of points (Inner + Outer) = POINTERS_PER_RING * 2
const BORDER_VERTEX_BASE: number = POINTERS_PER_RING * 2; // 136 vertices
const BORDER_V: number = BORDER_VERTEX_BASE * 3;          // 408 position float fields
const BORDER_I: number = POINTERS_PER_RING * 6;           // 408 index fields (2 quads per segment = 6 indices * 68)
const _hpi: number = Math.PI / 2;

/**
 * Cubic Bezier Curve for Bevel Profile
 * @param t Progress (0 to 1)
 * @param bevel Max expansion amount
 * @param weight Curve tightness (0.5 = soft, 2.0 = sharp)
 */
const getBezierBevel = (t: number, bevel: number, weight: number = 1.0): number => {
	// Force hard limits to avoid any floating-point interpolation leakage
	if (t <= 0) return bevel;
	if (t >= 1) return 0;
	const invT = 1 - t;

	// Control Points for the "Bulge", we want it to start at 'bevel' and end at '0'
	const p0 = bevel;      // Front Face expansion
	const p1 = bevel * weight; // Shoulder handle
	const p2 = 0;          // Back handle
	const p3 = 0;          // Back Face (zero expansion)

	// Standard Cubic Bezier Math
	return (invT ** 3) * p0 +
		   3 * (invT ** 2) * t * p1 +
		   3 * invT * (t ** 2) * p2 +
		   (t ** 3) * p3;
};

/**
 * Cubic Bezier Curve for Bevel Profile, create a different bevel from getBezierBevel
 * @param t Progress (0 to 1)
 * @param bevel Max expansion amount
 * @param isConvex -1 for Convex (Bulge out), 1 for Concave (Inward curve)
 */
 /*
const getCurveScale =(t: number, bevel: number, isConvex: number): number => {
	// Bulge is 0 at t=0 and 0 at t=1
	const bulge = Math.sin(t * Math.PI);

	// Linear part: we want the expansion to be 'bevel' at the start (t=0)
	// and '0' at the back cap (t=1).
	const linearPart = (1 - t) * bevel;

	return linearPart + (bulge * isConvex * bevel)
};
*/

// AtlasParagraph: v 0.9.1 bevel final
export class AtlasAssemble {

//vds: VertexData;

// Main TypedArrays
P!: Float32Array;
I!: Uint32Array;
U!: Float32Array;
N!: Float32Array;
FID!: Float32Array; // Face ID, shader color 1 float per vertex instead of 4!
// NEW FOR BABYLON Lite
T!: Float32Array; // Tangents
FIDCOLOR!: Float32Array;

// Panel TypedArrays
private PP!: Float32Array;
private PI!: Uint32Array;
private PU!: Float32Array;
private PN!: Float32Array;
private PFID!: Float32Array;
// NEW FOR BABYLON Lite
private PTID!: Float32Array;
private PFIDCOLOR!: Float32Array;

// P, I, update
private panelP: number = 0;
private panelI: number = 0;

// flag
private sizeMightChange: boolean = true;

// offsets
private pOffset: number = 0;
private iOffset: number = 0;
private vBase: number = 0;

// lengths P,I
private totalP: number = 0;
private totalI: number = 0;

// holders
private source: Record<string, IGlyphBuffers> = {};
private panelCache: Record<string, IBackgroundGeometry> = {};
private _vertexMasterBuffer!: ArrayBuffer;
private _vertexPanelBuffer!: ArrayBuffer;

private totalLoop: number = 0;

	constructor() {
		// start JIT
	};
	
    public addSource(letter: string, g: IGlyphBuffers): void {

		const _source = this.source[letter];
		 // If this letter has already compiled get only lengths,
        if (_source) {
			this.totalP += _source.L;
			this.totalI += _source.IL
		}else{

			// Save direct zero-copy subarray views straight to the object
			this.source[letter] = g;
			/*
			this.source[letter] = {
				P: g.P,
				I: g.I,
				N: g.N,
				U: g.U,
				FID: g.FID,
				L: g.L, //g.P.length,
				IL: g.IL, //g.I.length,
			};*/
			this.totalP += g.L;
			this.totalI += g.IL
		}
    };


	public build(background: boolean, border: boolean): void {

		if (background || border) {

			this.setBackgroundPI(background, border);
			// Accumulate text size requirements with the panel size requirements
			this.totalP += this.panelP;
			this.totalI += this.panelI;

			// Allocate the isolated structural background buffer
			this.allocatePanel()
			//this.allocatePanel(this.panelP, this.panelI)
		};

		// Allocate final render slabs for letters
		this.allocate()

	};

	/* allocate Master text buffer */
	private allocate(): void {

		// Calculate vertex requirements
		const totalVertices = this.totalP / 3;

		// calculate byte sizes for each vertex attribute slab (Float32 = 4 bytes)
		const bytesP = this.totalP * 4;					// Positions (3 floats per vertex)
		const bytesN = bytesP;							// Normals (3 floats per vertex)
		const bytesU = (totalVertices * 2) * 4;			// UVs (2 floats per vertex)
		const bytesFID = totalVertices * 4;				// Legacy FaceID (1 float per vertex)
		
		// NEW FOR BABYLON Lite Measure out space for our WebGPU attribute stream
        const bytesT = bytesP; 							// Tangents/Miters (3 floats per vertex)
        const bytesFIDCOLOR = (totalVertices * 4) * 4;	// FaceID Color Vector (4 floats per vertex)
		

		// the absolute minimum bytes required for this text
		//const requiredBytes = bytesP + bytesN + bytesU + bytesFID;
		const requiredBytes = bytesP + bytesN + bytesU + bytesFID + bytesT + bytesFIDCOLOR;

		if (!this._vertexMasterBuffer || this._vertexMasterBuffer.byteLength < requiredBytes) {

			// get the current capacity (or 0 if this is the initial boot allocation)
			const currentCapacity = this._vertexMasterBuffer ? this._vertexMasterBuffer.byteLength : 0;

			// calculate exactly how many bytes we are short
			const currentDeficit = requiredBytes - currentCapacity;

			// THE CEILING: Define a single character's vertex byte size
			// 1 Vert = 3 pos + 3 norm + 2 uv + 1 faceId = 9 floats. 9 floats * 4 bytes = 36 bytes per vertex.
			// assuming a standard character generates an average of 4 vertices:
			// 4 vertices * 36 bytes = 144 bytes per character.
			// 64 characters * 144 bytes = 9,216 bytes.
			const sixtyFourCharsInBytes = 64 * 4 * 9 * 4;

			// grow by either the exact deficit or at least 64 characters worth of headroom, whichever is larger!
			const growthStep = Math.max(currentDeficit, sixtyFourCharsInBytes);
			const nextAllocationSize = currentCapacity + growthStep;

			// allocate a clean, step capped, master buffer memory slot
			this._vertexMasterBuffer = new ArrayBuffer(nextAllocationSize);
		}

		// create views slicing out slabs using byte offsets (keeps fast loops identical!)
		let currentByteOffset = 0;

		this.P = new Float32Array(this._vertexMasterBuffer, currentByteOffset, this.totalP);
		currentByteOffset += bytesP;

		this.N = new Float32Array(this._vertexMasterBuffer, currentByteOffset, this.totalP);
		currentByteOffset += bytesN;

		this.U = new Float32Array(this._vertexMasterBuffer, currentByteOffset, totalVertices * 2);
		currentByteOffset += bytesU;

		this.FID = new Float32Array(this._vertexMasterBuffer, currentByteOffset, totalVertices);
		
        // Map new arrays Lite
        this.T = new Float32Array(this._vertexMasterBuffer, currentByteOffset, this.totalP);
        currentByteOffset += bytesT;
        this.FIDCOLOR = new Float32Array(this._vertexMasterBuffer, currentByteOffset, totalVertices * 4);

		// SET THE SAME FIXED STEP TO THE SEPARATE INDEX BUFFER (`this.I`)
		const requiredIndexBytes = this.totalI * 4; // Uint32 = 4 bytes
		if (!this.I || this.I.buffer.byteLength < requiredIndexBytes) {
			const currentIndexCapacity = this.I ? this.I.buffer.byteLength : 0;
			const indexDeficit = requiredIndexBytes - currentIndexCapacity;

			// grow index tracking by at least 64 characters worth of triangle topologies
			// (a standard character quad uses roughly 6 indices: 6 * 4 bytes = 24 bytes)
			const sixtyFourCharsInIndexBytes = 64 * 6 * 4;

			const indexGrowthStep = Math.max(indexDeficit, sixtyFourCharsInIndexBytes);
			const nextIndexElementCount = (currentIndexCapacity + indexGrowthStep) / 4;

			this.I = new Uint32Array(Math.ceil(nextIndexElementCount))
		}
	};


	/* reallocate rebuild slabs for update */
	public reallocate(background: boolean, border: boolean, sizeMightChange: boolean): void {

		this.reset();
		this.sizeMightChange = sizeMightChange;

		if (background || border) {
			this.setBackgroundPI(background, border);
			this.totalP += this.panelP;
			this.totalI += this.panelI;

			if (this.sizeMightChange) {
				this.allocatePanel()
			}
		};

		// allocate triggered only if P. I. lengths are different (bigger)
		if (this.totalP > this.P.length || this.totalI > this.I.length) {
			this.allocate()
		}
	};


	/* allocate Panel buffer, background OR border OR both */
	private allocatePanel(): void {
		const totalVertices = this.totalP / 3;

		const bytesP = this.totalP * 4;
		const bytesN = bytesP; //totalP * 4;
		const bytesU = (totalVertices * 2) * 4;
		const bytesFID = totalVertices * 4;
		
		
		// NEW FOR BABYLON Lite Measure out space for our WebGPU attribute stream
        const bytesT = bytesP; // Tangents/Miters (3 floats per vertex)
        const bytesPFIDCOLOR = (totalVertices * 4) * 4;	// FaceID Color Vector (4 floats per vertex)
		

		const totalVertexBytes = bytesP + bytesN + bytesU + bytesFID + bytesT + bytesPFIDCOLOR;
		//const totalVertexBytes = bytesP + bytesN + bytesU + bytesFID;
		
		// panels have rigid fixed shapes; allocate exact byte lengths to keep pointers predictable
		if (!this._vertexPanelBuffer || this._vertexPanelBuffer.byteLength < totalVertexBytes) {
			this._vertexPanelBuffer = new ArrayBuffer(totalVertexBytes)
		};

		let currentByteOffset = 0;

		this.PP = new Float32Array(this._vertexPanelBuffer, currentByteOffset, this.totalP);
		currentByteOffset += bytesP;

		this.PN = new Float32Array(this._vertexPanelBuffer, currentByteOffset, this.totalP);
		currentByteOffset += bytesN;

		this.PU = new Float32Array(this._vertexPanelBuffer, currentByteOffset, totalVertices * 2);
		currentByteOffset += bytesU;

		this.PFID = new Float32Array(this._vertexPanelBuffer, currentByteOffset, totalVertices);
		currentByteOffset += bytesFID;
		
		// NEW FOR BABYLON LITE: Allocate matching panel buffers for Tangents and Color IDs
		this.PTID = new Float32Array(this._vertexPanelBuffer, currentByteOffset, this.totalP);    // Holds panel miter alignments
		currentByteOffset += bytesT;
		
		this.PFIDCOLOR = new Float32Array(this._vertexPanelBuffer, currentByteOffset, totalVertices * 4); // Holds panel [FID, 0, 0, 1] states

		if (!this.PI || this.PI.length < this.totalI) {
			this.PI = new Uint32Array(this.totalI)
		}
	};

	/* create 2D letter */
	public assemble2D(key: string, x: number, y: number, z: number, size: number): void {

		const source = this.source[key];
		if (!source) return;

		const destP = this.pOffset;
		const vertexCount = source.L / 3; // how many vertices this letter contains

		// BLIT flat static data
		this.N.set(source.N, destP);
		this.U.set(source.U, (destP / 3) * 2);
		this.FID.set(source.FID, destP / 3);
		
		// NEW FOR BABYLON LITE: Copy raw Miter directions into Tangents (T)
		// This bypasses Babylon Lite's automatic normal clamping routines entirely!
		this.T.set(source.N, destP); // source.N contains perfect raw miter math

		// NEW FOR BABYLON LITE: Expand 1-Float FID into 4-Float WebGPU Vectors [FID, 0, 0, 1]
		//console.log('extra loop cost> '+vertexCount+ 'source.L loop> '+source.L+' source.IL> '+source.IL);
		const destColorStart = (destP / 3) * 4;
		let i = 0
		for (; i < vertexCount; i++) {
			const clolorIdx = destColorStart + (i * 4);
			
			// Grab the single float ID value from source array
			this.FIDCOLOR[clolorIdx] = source.FID[i]; // Store ID cleanly in the X channel slot
			this.FIDCOLOR[clolorIdx + 1] = 0.0;       // Y element placeholder
			this.FIDCOLOR[clolorIdx + 2] = 0.0;       // Z element placeholder
			this.FIDCOLOR[clolorIdx + 3] = 1.0;       // W opacity parameter
		};

		// scale and place positions
		let v = 0;
		//const pLen = source.L;
		for (; v < source.L; v += 3)  {
			const dIdx = destP + v;
			this.P[dIdx] = (source.P[v] * size) + x;
			this.P[dIdx + 1] = (source.P[v + 1] * size) + y;
			this.P[dIdx + 2] = z; // flat Z axis
		};

		// index shift
		//const iLen = source.IL;
		//const sourceI = source.I;
		let j = 0;
		for (; j < source.IL; j++) {
			this.I[this.iOffset + j] = source.I[j] + this.vBase
			//this.I[this.iOffset + j] = sourceI[j] + this.vBase
		};

		this.pOffset += source.L;
		this.iOffset += source.IL;
		this.vBase += (source.L / 3)
	};


	/* create 3D letter with FINAL bevel!!*/
	public assemble3D(key: string, x: number, y: number, z: number, size: number, depth: number, bevel: number): void {

		const source = this.source[key];
		if (!source) return;

		const destP = this.pOffset;
		const vertexCount = source.L / 3; // how many vertices this letter contains
		//const pLen = source.L;

		this.N.set(source.N, destP);
		this.U.set(source.U, (destP / 3) * 2);
		this.FID.set(source.FID, destP / 3);
		
		// NEW FOR BABYLON LITE: Copy raw Miter directions into Tangents (T)
		// This bypasses Babylon Lite's automatic normal clamping routines entirely!
		this.T.set(source.N, destP); // source.N contains perfect raw miter math
		
		// NEW FOR BABYLON LITE: Expand 1-Float FID into 4-Float WebGPU Vectors [FID, 0, 0, 1]
		//console.log('extra loop cost> '+vertexCount+ ' source.L loop> '+source.L+' source.IL> '+source.IL);
		const destColorStart = (destP / 3) * 4;
		let i = 0
		for (; i < vertexCount; i++) {
			const clolorIdx = destColorStart + (i * 4);
			// Grab the single float ID value from source array
			this.FIDCOLOR[clolorIdx] = source.FID[i]; // Store ID cleanly in the X channel slot
			this.FIDCOLOR[clolorIdx + 1] = 0.0;       // Y element placeholder
			this.FIDCOLOR[clolorIdx + 2] = 0.0;       // Z element placeholder
			this.FIDCOLOR[clolorIdx + 3] = 1.0;       // W opacity parameter
		};
		
		let v = 0;
		for (; v < source.L; v += 3) {
			const dIdx = destP + v;
			const rawX = source.P[v];
			const rawY = source.P[v + 1];
			const rawZ = source.P[v + 2]; // 0=front, 1=sidewall-back, 2=backface

			const vxNormal = rawX * size;
			const vyNormal = rawY * size;

			let vx = 0, vy = 0, vz = 0;
			if (rawZ < 0.5) {
				// FRONT FACE: Z=0, no bevel, sits flush
				vx = vxNormal;
				vy = vyNormal;
				vz = 0;

			} else if (rawZ < 1.5) {
				// SIDEWALL: rawZ=0 is front-edge, (full bevel), rawZ=1 is back-edge (zero bevel)
				// different bevel..
				// const curveOffset = bevel > 0  ? getCurveScale(rawZ, bevel, 1) : 0;
				const curveOffset = bevel > 0 ? getBezierBevel(rawZ, bevel, 0.5) : 0;
				vx = vxNormal + (source.N[v]  * curveOffset);
				vy = vyNormal + (source.N[v + 1] * curveOffset);
				vz = rawZ * depth // 0 > 0, 1 > depth (linear Z, bevel only affects X/Y)

			} else {
				// BACK FACE: Z=2, always flush, no bevel
				vx = vxNormal;
				vy = vyNormal;
				vz = depth
			};

			this.P[dIdx] = vx + x;
			this.P[dIdx + 1] = vy + y;
			this.P[dIdx + 2] = vz + z
		};

		// indices (unchanged)
		//const iLen = source.IL,
		//sourceI = source.I;
		let j = 0;
		for (; j < source.IL; j++) {
			this.I[this.iOffset + j] = source.I[j] + this.vBase
		};

		this.pOffset += source.L;
		this.iOffset += source.IL;
		this.vBase += (source.L / 3)
	};


/**
 * Assemble rounded panel having background or border stroke.
 * @param cx Center X coordinate of the text
 * @param cy Center Y coordinate of the text
 * @param cz Z depth position (O.letterpos.z + O.zdepth)
 * @param width Half-width extent of the bounding box (including text padding)
 * @param height Half-height extent of the bounding box (including text padding)
 * @param radius The radius of the corner curve (0 = perfectly sharp rectangle)
 * @param thickness border stroke
 * @param drawBackground if has background
 * @param drawBorder if has border
*/
	public assemblePanel(cx: number, cy: number, cz: number, width: number, height: number, radius: number, thickness: number, drawBackground: boolean, drawBorder: boolean): void {
		if (drawBackground || drawBorder) {
			// REBUILD PANEL GEOMETRY IF SIZE HAS CHANGED
			if (this.sizeMightChange) {
				const width2 = width * 2;
				const height2 = height * 2;
				const _cx = cx - width;
				const _cy = cy - height;
				//const panelKey = this.setPanel(width2, height2, radius, thickness);
				const panelKey = this.setPanel(width, height, radius, thickness);
				const geo = this.panelCache[panelKey];

				let vIdx = 0, iIdx = 0;

				// BLIT BACKGROUND
				if (drawBackground) {
					const bgBaseVtx = 0;
					const vIdx3 = vIdx * 3;
					this.PP[vIdx3] = cx;
					this.PP[vIdx3 + 1] = cy;
					this.PP[vIdx3 + 2] = cz;
					this.PN[vIdx3] = 0;
					this.PN[vIdx3 + 1] = 0;
					this.PN[vIdx3 + 2] = -1;
					this.PU[vIdx * 2] = 0.5;
					this.PU[vIdx * 2 + 1] = 0.5;
					this.PFID[vIdx] = 3.0;
					vIdx++;

					let b = 0;
					for (; b < POINTERS_PER_RING; b++) {
						const ix = cx + geo.innerX[b];
						const iy = cy + geo.innerY[b];
						const currentV = bgBaseVtx + 1 + b;
						const vdx4 = vIdx * 3;

						this.PP[vdx4] = ix;
						this.PP[vdx4 + 1] = iy;
						this.PP[vdx4 + 2] = cz;

						this.PN[vdx4] = 0;
						this.PN[vdx4 + 1] = 0;
						this.PN[vdx4 + 2] = -1;

						this.PU[vIdx * 2] = (ix - _cx) / width2;
						this.PU[vIdx * 2 + 1] = (iy - _cy) / height2;
						//this.PU[vIdx * 2] = (ix - (cx - width)) / width2;
						//this.PU[vIdx * 2 + 1] = (iy - (cy - height)) / height2;

						this.PFID[vIdx] = 3.0;
						vIdx++;

						// Preventing Vertex Overruns
						if (b < POINTERS_MINUS) {
							this.PI[iIdx++] = bgBaseVtx;
							this.PI[iIdx++] = currentV;
							this.PI[iIdx++] = currentV + 1
						}
					};

					this.PI[iIdx++] = bgBaseVtx;
					this.PI[iIdx++] = bgBaseVtx + POINTERS_PER_RING;
					this.PI[iIdx++] = bgBaseVtx + 1
				};

				// BLIT BORDER
				if (drawBorder) {
				//if (drawBorder && geo.outerX && geo.outerY) {
					const innerRingBase = vIdx;
					let i = 0;
					for (; i < POINTERS_PER_RING; i++) {
						const ix = cx + geo.innerX[i];
						const iy = cy + geo.innerY[i];
						const vdx5 = vIdx * 3;

						this.PP[vdx5] = ix;
						this.PP[vdx5 + 1] = iy;
						this.PP[vdx5 + 2] = cz;
						this.PN[vdx5] = 0;
						this.PN[vdx5 + 1] = 0;
						this.PN[vdx5 + 2] = -1;

						//this.PU[vIdx * 2] = (ix - (cx - width)) / width2;
						//this.PU[vIdx * 2 + 1] = (iy - (cy - height)) / height2;
						
						this.PU[vIdx * 2] = (ix - _cx) / width2;
						this.PU[vIdx * 2 + 1] = (iy - _cy) / height2;
						
						this.PFID[vIdx] = 4.0;
						vIdx++
					};

					const outerRingBase = vIdx;
					let o = 0;
					for (; o < POINTERS_PER_RING; o++) {
						const ox = cx + geo.outerX[o];
						const oy = cy + geo.outerY[o];
						const vdx6 = vIdx * 3;

						this.PP[vdx6] = ox;
						this.PP[vdx6 + 1] = oy;
						this.PP[vdx6 + 2] = cz;
						this.PN[vdx6] = 0;
						this.PN[vdx6 + 1] = 0;
						this.PN[vdx6 + 2] = -1;

						//this.PU[vIdx * 2] = (ox - (cx - width)) / width2;
						//this.PU[vIdx * 2 + 1] = (oy - (cy - height)) / height2;
						this.PU[vIdx * 2] = (ox - _cx) / width2;
						this.PU[vIdx * 2 + 1] = (oy - _cy) / height2;
						this.PFID[vIdx] = 4.0;
						vIdx++
					};

					let p = 0;
					for (; p < POINTERS_PER_RING; p++) {
						const next = (p + 1) % POINTERS_PER_RING;
						const iCurrent = innerRingBase + p;
						const iNext = innerRingBase + next;
						const oCurrent = outerRingBase + p;
						const oNext = outerRingBase + next;

						this.PI[iIdx++] = iCurrent;
						this.PI[iIdx++] = oCurrent;
						this.PI[iIdx++] = oNext;

						this.PI[iIdx++] = iCurrent;
						this.PI[iIdx++] = oNext;
						this.PI[iIdx++] = iNext;
					}
				}
			};

			/**
			 * COPIES GEOMETRY INTO THE RENDERING ARRAYS APPENDING TO THE BACK
			 * We pass the current text offset markers so data is written behind the text.
			 */
			this.copyPanel(this.pOffset, this.iOffset);

			/**
			 * final, update pointers to include both the text and panel elements,
			 * calculating the full size of the sub-array slice
			 */
			this.pOffset += this.panelP;
			this.iOffset += this.panelI;
			this.vBase += this.panelP / 3;
		}
	}

	/* copies and append Panel To Back of Main TypedArrays */
	private copyPanel(textVertexOffset: number, textIndexOffset: number): void {
		if (this.PP && this.PP.length >= this.panelP) {

			const totalPanelVertices = this.panelP / 3;

			// =================================================================
			// FOR BABYLON LITE: Populate PFIDCOLOR dynamically!
			// This completely saves from touching any loops inside assemblePanel.
			// =================================================================
			for (let i = 0; i < totalPanelVertices; i++) {
				const loopColorIdx = i * 4;
				const rawIdValue = this.PFID![i]; // Captures the 3.0 (background) or 4.0 (border)
				
				this.PFIDCOLOR![loopColorIdx]     = rawIdValue; // Matches shader input.color.x
				this.PFIDCOLOR![loopColorIdx + 1] = 0.0;
				//this.FIDCOLOR_FOR_PANEL_FIX_IF_NEEDED: // (keeping track)
				this.PFIDCOLOR![loopColorIdx + 2] = 0.0;
				this.PFIDCOLOR![loopColorIdx + 3] = 1.0;
			}

			// =================================================================
			// ALSO FOR BACKGROUND MITERS:
			// Flat backgrounds don't need miters, copy normal paths to keep it safe.
			// =================================================================
			this.PTID!.set(this.PN!.subarray(0, this.panelP), 0);

			// =================================================================
			// MASTER STREAMING ARRAY WRITING (updated sequential copying)
			// =================================================================
			// vertices copy straight into the back position slots
			this.P.set(this.PP.subarray(0, this.panelP), textVertexOffset);
			this.N.set(this.PN!.subarray(0, this.panelP), textVertexOffset);

			// UV and Face ID arrays use 2D and 1D indexing layout ranges respectively
			const uvOffset = (textVertexOffset / 3) * 2;
			this.U.set(this.PU!.subarray(0, totalPanelVertices * 2), uvOffset);

			const fidOffset = textVertexOffset / 3;
			this.FID.set(this.PFID!.subarray(0, totalPanelVertices), fidOffset);
			
			// NEW FOR BABYLON LITE: Copy raw Miter data to Tangents (T)
			this.T.set(this.PTID!.subarray(0, this.panelP), textVertexOffset);
			
			const colorOffset = fidOffset * 4;
			// NEW FOR BABYLON LITE: Copy pre-packed [FID, 0, 0, 1] vectors to FIDCOLOR
			this.FIDCOLOR.set(this.PFIDCOLOR!.subarray(0, totalPanelVertices * 4), colorOffset);

			/**
			 * CRITICAL SHIFTING STEP FOR THE PANEL INDICES:
			 * Because the panel vertices are appended at position textVertexOffset / 3,
			 * we loop through the panel index array and shift each value forward
			 * so it correctly maps to the trailing vertex data locations.
			 */
			const indexShiftValue = textVertexOffset / 3;
			let i = 0;
			for (; i < this.panelI; i++) {
				this.I[textIndexOffset + i] = this.PI[i] + indexShiftValue
			}
		}
	};


	/* create Panel once for specific cacheKey! */
	private setPanel(width: number, height: number, radius: number, thickness: number): string {

		const roundedW = Math.round(width * 10) / 10;
		const roundedH = Math.round(height * 10) / 10;
		const roundedR = Math.round(radius * 10) / 10;
		const roundedT = Math.round(thickness * 100) / 100;
		const cacheKey = `${roundedW}_${roundedH}_${roundedR}_${roundedT}`;

		if (this.panelCache[cacheKey] === undefined) {

			const maxRadius = Math.min(roundedW, roundedH);
			const r = Math.min(roundedR, maxRadius);
			const rOuter = r + roundedT;

			const innerX = new Float32Array(POINTERS_PER_RING);
			const innerY = new Float32Array(POINTERS_PER_RING);
			const outerX = new Float32Array(POINTERS_PER_RING);
			const outerY = new Float32Array(POINTERS_PER_RING);


			const centers = [
				{ x: roundedW - r,  y: roundedH - r },  // Top Right
				{ x: -roundedW + r, y: roundedH - r },  // Top Left
				{ x: -roundedW + r, y: -roundedH + r }, // Bottom Left
				{ x: roundedW - r,  y: -roundedH + r }  // Bottom Right
			];

			const angles = [0, _hpi, Math.PI, 3 * _hpi];
			let pIdx = 0;

			for (let q = 0; q < 4; q++) {
				const center = centers[q];
				const startAngle = angles[q];
				let s = 0;

				for (; s <= SEGMENTS; s++) {
					const theta = startAngle + (s / SEGMENTS) * _hpi;
					const cos = Math.cos(theta);
					const sin = Math.sin(theta);

					// Cache local-space vectors relative to the center origin (0,0)
					innerX[pIdx] = center.x + cos * r;
					innerY[pIdx] = center.y + sin * r;

					outerX[pIdx] = center.x + cos * rOuter;
					outerY[pIdx] = center.y + sin * rOuter;
					pIdx++;
				}
			};

			this.panelCache[cacheKey] = { innerX, innerY, outerX, outerY }
		};
		//console.log('cacheKey? '+cacheKey);
		return cacheKey
	};

	// assemble Button
	public assembleButton(key: string, x: number, y: number, z: number, size: number, radius: number, thickness: number, padding: number[], hasBg: boolean, hasborder: boolean, width: number, height: number, worldCX: number, worldCY: number): void {

		const source = this.source[key];
		if (!source) return;

		// reset local pointers to start of the buffer
		this.reset();

		// assemble 2D letter
		this.assemble2D(key, x, y, z, size);

		// assemble the background/border into the SAME buffers
		if (hasBg||hasborder) {

			const finalW = (width + padding[0] ) / 2;
			const finalH = (height + padding[1]) / 2;

			this.assemblePanel(worldCX, worldCY, z + _SETTINGS.zdepth, finalW, finalH, radius, thickness, hasBg, hasborder)
		}
	};


	private setBackgroundPI(background: boolean, border: boolean): void {

		this.panelP = 0;
		this.panelI = 0;

		if (background) {
			this.panelP += BACKGROUND_V;  // 207 fields
			this.panelI += BACKGROUND_I;  // 204 fields
		}

		if (border) {
			this.panelP += BORDER_V;      // 408 fields
			this.panelI += BORDER_I;      // 408 fields
		}
	};

	// reset offsets
	public reset(): void {
		this.pOffset = 0;
		this.iOffset = 0;
		this.vBase = 0;
	};

	
	// get some stats 
	public getAssembledStats(): IStats {
		let panelVertices = 0;
		let panelPolygons = 0;
		
		// Total Vertices/Polygons (triangles) computed directly from current loop offsets
		let textVertices = this.pOffset / 3;
		let textPolygons = this.iOffset / 3; 

		// 1. TEXT GEOMETRY BUFFER: Capture the absolute physical size of the text buffer.
		// This value ALREADY contains P, N, U, FID, T, and FIDCOLOR!
		let masterVertexBytes = this._vertexMasterBuffer ? this._vertexMasterBuffer.byteLength : 0;
		
		// 2. TEXT INDEX BUFFER: Add the text index array (allocated on its own separate block)
		let masterIndexBytes = this.I ? this.I.byteLength : 0;
		
		// Combine them to get the true total memory used for your 3D text models
		let totalTextMemory = masterVertexBytes + masterIndexBytes;
		
		// 3. ISOLATE LITE ATTRIBUTES: Calculate exactly how much of that master buffer 
		// is being used specifically by your new WebGPU attributes (T and FIDCOLOR)
		let extraTb = 0;
		if (this.T && this.FIDCOLOR) {
			extraTb = this.T.byteLength + this.FIDCOLOR.byteLength;
		}
		
		/* Background/border panel cache check */
		if (this.PP && this.PP.byteLength) {
			// Compute panel geometry totals directly from layout allocations
			panelVertices = this.panelP / 3;
			panelPolygons = this.panelI / 3;
			
			// Isolate the pure typographic geometry by backing out the panel offsets
			textVertices = textVertices - panelVertices;
			textPolygons = textPolygons - panelPolygons;
			
			// 4. PANEL GEOMETRY BUFFER: Add the separate physical panel buffer size
			// This value ALREADY contains PP, PN, PU, PFID, PTID, and PFIDCOLOR!
			if (this._vertexPanelBuffer) {
				totalTextMemory += this._vertexPanelBuffer.byteLength;
			}
			
			// 5. PANEL INDEX BUFFER: Add the separate panel index array block
			if (this.PI) {
				totalTextMemory += this.PI.byteLength;
			}
			
			// 6. ISOLATE LITE PANEL ATTRIBUTES: Calculate the chunk of the panel buffer
			// dedicated to WebGPU attributes (PTID and PFIDCOLOR)
			if (this.PTID && this.PFIDCOLOR) {
				extraTb += (this.PTID.byteLength + this.PFIDCOLOR.byteLength);
			}
		}
		
		return {
			memory: totalTextMemory,	// Absolute real-world byte footprint across your RAM
			textv: textVertices,
			textp: textPolygons,
			panelv: panelVertices,
			panelp: panelPolygons,
			extraMemory: extraTb		// The specific fraction of that memory used by your WebGPU layouts
		}
	}


	// dispose, nullify TypedArrays to free up the "Slabs pointer"
	public clean(): void {
		// nullify our main TypedArray buffer
		this.P = null!;
		this.N = null!;
		this.U = null!;
		this.FID = null!;
		this.I = null!;
		// New Lite
		this.T = null!;
		this.FIDCOLOR = null!;

		// nullify the Panel buffer
		this.PP = null!;
		this.PN = null!;
		this.PU = null!;
		this.PFID = null;
		this.PI = null!;
		// New Lite
		this.PTID = null!;
		this.PFIDCOLOR = null;

		// nullify the raw allocation ArrayBuffers to free memory slots for GC
		this._vertexMasterBuffer = null!;
		this._vertexPanelBuffer = null!;

		// clear our source Cache
		this.totalP = 0;
		this.totalI = 0;
		this.source = {};

		// clear dictionary cache tracking geometries
		if (this.panelCache) {
			this.panelP = 0;
			this.panelI = 0;
			this.panelCache = {}
		};

		// Reset layout pointers offsets
		this.reset()
	}
}