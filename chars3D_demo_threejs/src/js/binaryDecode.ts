import type {IG3D, IFontData, IContour} from './interfaces.ts';

// V3.3
export class BinaryDecode {

	constructor(buffer: ArrayBuffer) {
		const dv = new DataView(buffer);
		const fullLen = buffer.byteLength;

		// Magic Number Check
		if (dv.getUint32(0) !== 0x474C5946) {
			throw new Error('NOT_A_GLYF_FILE');
		}

		// Checksum Verification
		const storedSum = dv.getUint32(fullLen - 4);
		const actualSum = BinaryDecode.#calculateChecksum(buffer.slice(0, fullLen - 4));
		if (storedSum !== actualSum) {
			throw new Error('CORRUPTED FILE');
		}

		// Decoding (Start at 4 to skip Magic)
		let offset = 4;

		// Info
		const infoSize = dv.getUint32(offset);
		offset += 4;
		const infoStr = new TextDecoder().decode(new Uint8Array(buffer, offset, infoSize));
		const info = JSON.parse(infoStr);
		offset += infoSize;
		while (offset % 4 !== 0) offset++;

		// Glyph Count
		const glyphCount = dv.getUint32(offset);
		offset += 4;

		const glyphs: IFontData = { _info: info };
		for (let g = 0; g < glyphCount; g++) {
			const blockSize = dv.getUint32(offset);
			offset += 4;
			const result = BinaryDecode.#decodeGlyph(buffer, offset, blockSize);
			glyphs[result.name] = result.glyph;
			offset += blockSize;
		};
		return glyphs
	};
	
	static #calculateChecksum(buffer: ArrayBuffer): number {
		const uint8 = new Uint8Array(buffer),
		len = uint8.length;
		let sum = 0, i = 0;
		for (; i < len; i++) {
			// Use unsigned 32-bit addition (wrapping)
			sum = (sum + uint8[i]) >>> 0; 
		};
		return sum
	};

	static #decodeGlyph(buffer: ArrayBuffer, startOffset: number, blockSize: number): IG3D {
		
		const dv = new DataView(buffer);
		let offset = startOffset;
		const endOffset = startOffset + blockSize; // The absolute end of this glyph's data

		// Decode Key
		const keyLen = dv.getUint32(offset); offset += 4;
		const keyName = new TextDecoder().decode(new Uint8Array(buffer, offset, keyLen));
		offset += keyLen;
		while (offset % 4 !== 0) offset++;

		// Decode Width and 2D Flag
		const width = dv.getUint32(offset); offset += 4;
		const hasV = dv.getUint32(offset); offset += 4;

		let v = null, i = null, n = null, x = null;

		if (hasV === 1) {
			// Decode _v
			const vLen = dv.getUint32(offset); offset += 4;
			v = Array.from(new Float32Array(buffer, offset, vLen));
			offset += vLen * 4;
			
			// DECODE _x
			const xLen = dv.getUint32(offset); offset += 4;
			x = Array.from(new Float32Array(buffer, offset, xLen));
			offset += xLen * 4;
			
			// Decode _i
			const iLen = dv.getUint32(offset); offset += 4;
			i = Array.from(new Uint16Array(buffer, offset, iLen));
			offset += iLen * 2;
			while (offset % 4 !== 0) offset++;
			
			// Decode _n
			const nLen = dv.getUint32(offset); offset += 4;
			n = Array.from(new Float32Array(buffer, offset, nLen));
			offset += nLen * 4;
		};
		
        let _o: IContour[] | undefined;
		let _f: number | undefined;
		// V1
        //let _b: { f: number; v: number[] } | undefined;
		let kern = {};

		// Check if there is enough space for the 3D flag and at least the Kern length
		if (offset + 8 <= endOffset) {
			const has3D = dv.getUint32(offset); offset += 4;
			if (has3D === 1) {
				const contourCount = dv.getUint32(offset); offset += 4;
				_o = [];
				for (let c = 0; c < contourCount; c++) {
					const mLen = dv.getUint32(offset); offset += 4;
					const m = Array.from(new Float32Array(buffer, offset, mLen));
					offset += mLen * 4;
					
					const hCount = dv.getUint32(offset); offset += 4;
					const h = [];
					for (let hole = 0; hole < hCount; hole++) {
						const hLen = dv.getUint32(offset); offset += 4;
						h.push(Array.from(new Float32Array(buffer, offset, hLen)));
						offset += hLen * 4;
					}

					const rCount = dv.getUint32(offset); offset += 4;
					const r = [];
					for (let range = 0; range < rCount; range++) {
						r.push({ 
							s: dv.getUint16(offset), 
							c: dv.getUint16(offset + 2), 
							o: dv.getUint16(offset + 4) 
						});
						offset += 6;
					}
					while (offset % 4 !== 0) offset++;
					_o.push({ m, h, r })
				};
				// V2
				const bf = dv.getUint32(offset); offset += 4;
				_f = bf;

				/*
				// V1
				// Back/Front Data (_b)
				const bf = dv.getUint32(offset); offset += 4;
				const bvLen = dv.getUint32(offset); offset += 4;
				const bv = Array.from(new Float32Array(buffer, offset, bvLen));
				offset += bvLen * 4;
				_b = { f: bf, v: bv }
				*/
			}
		};

		// Final check for Kerning (it should always be the last part of the block)
		if (offset + 4 <= endOffset) {
			const kLen = dv.getUint32(offset); offset += 4;
			if (kLen > 0 && (offset + kLen <= endOffset)) {
				try {
					const kStr = new TextDecoder().decode(new Uint8Array(buffer, offset, kLen));
					kern = JSON.parse(kStr);
				} catch (e) {
					console.warn(`Failed to parse kern for ${keyName}`);
				}
			}
		};

		const glyph = { _w: width, _v: v, _x: x, _i: i, _n: n, _k: kern };
		if (_o) glyph._o = _o;
		if (_f) glyph._f = _f;
		// V1
		//if (_b) glyph._b = _b;

		return { glyph, name: keyName }
	}
}



