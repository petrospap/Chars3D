import type {IFontData, IG3D} from './interfaces.ts';

/**
	V:0.3
	GLYPHS: JSON output (compact), structure looks like:

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

		// the following object exist only when is IS3D
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


export class BinaryEncode {

    /**
    * Encodes font data into a single ArrayBuffer
    */
	static encode(data: IFontData): ArrayBuffer {
		const info = data._info;
		const glyphEntries = Object.entries(data).filter(([key]) => key !== '_info');

		const enc = new TextEncoder();
		const infoBytes = enc.encode(JSON.stringify(info));
		const encodedGlyphs: ArrayBuffer[] = [];

		for (const [key, glyph] of glyphEntries) {
			encodedGlyphs.push(BinaryEncode.#encodeGlyph(key, glyph as IG3D));
		}

		// Calculate Size of Content
		let contentSize = 0;
		contentSize += 4 + infoBytes.byteLength; // Info size header + bytes
		while (contentSize % 4 !== 0) contentSize++;

		contentSize += 4; // Glyph Count
		for (const buf of encodedGlyphs) {
			contentSize += 4 + buf.byteLength
		};

		// Total Size = Magic(4) + Content + Checksum(4)
		const out = new ArrayBuffer(4 + contentSize + 4);
		const dv = new DataView(out);
		let offset = 0;

		// Magic Number
		dv.setUint32(offset, 0x474C5946);
		offset += 4;

		// Info Header
		dv.setUint32(offset, infoBytes.byteLength);
		offset += 4;
		new Uint8Array(out, offset, infoBytes.byteLength).set(infoBytes);
		offset += infoBytes.byteLength;
		while (offset % 4 !== 0) offset++;

		// Glyph Count
		dv.setUint32(offset, encodedGlyphs.length);
		offset += 4;

		// Glyphs
		for (const buf of encodedGlyphs) {
			dv.setUint32(offset, buf.byteLength);
			offset += 4;
			new Uint8Array(out, offset, buf.byteLength).set(new Uint8Array(buf));
			offset += buf.byteLength;
		}

		// Footer Checksum
		const checksum = BinaryEncode.#calculateChecksum(out.slice(0, offset));
		dv.setUint32(offset, checksum);

		return out
	};


	static #calculateChecksum(buffer: ArrayBuffer): number {
		const uint8 = new Uint8Array(buffer), len = uint8.length
		let sum = 0, i = 0;
		for (; i < len; i++) {
			// Use unsigned 32-bit addition (wrapping)
			sum = (sum + uint8[i]) >>> 0
		};
		return sum
	};

    static #encodeGlyph(key: string, g: IG3D): ArrayBuffer {
        const enc = new TextEncoder();
        const keyBytes = enc.encode(key);
        const kernData = (g._k && Object.keys(g._k).length > 0) ? JSON.stringify(g._k) : "";
        const kernBytes = kernData ? enc.encode(kernData) : new Uint8Array(0);

        const v = g._v || [];
		const x = g._x || []; // new bounds
        const i = g._i || [];
        const n = g._n || [];
		//v2
		const has3D = !g._o ? 0 : 1;
		const contours = g._o || [];
		const back = g._f || null;

        // SIZE CALCULATION
        let size = 0;
        size += 4 + keyBytes.length; // Key
        while (size % 4 !== 0) size++;
        size += 8; // _w (4) + hasV (4)

        if (v.length > 0) {
            size += 4 + (v.length * 4); // _v
			size += 4 + (x.length * 4); // _x
            size += 4 + (i.length * 2); // _i
            while (size % 4 !== 0) size++;
            size += 4 + (n.length * 4); // _n
        }

        size += 4; // has3D flag
        if (has3D) {
            size += 4; // contours count
            for (const c of contours) {
                size += 4 + (c.m.length * 4); // main
                const holes = c.h || [];
                size += 4; // hole count
                for (const h of holes) size += 4 + (h.length * 4);
                const ranges = c.r || [];
                size += 4 + (ranges.length * 6); // s,c,o = 3xUint16
                while (size % 4 !== 0) size++;
            }
			// v1
			size += 4;
        }

        size += 4 + kernBytes.length; // Kern
        while (size % 4 !== 0) size++;

        // WRITE DATA
        const buffer = new ArrayBuffer(size);
        const dv = new DataView(buffer);
        let offset = 0;

        // Header
        dv.setUint32(offset, keyBytes.length); offset += 4;
        new Uint8Array(buffer, offset, keyBytes.length).set(keyBytes);
        offset += keyBytes.length;
        while (offset % 4 !== 0) offset++;

        dv.setUint32(offset, g._w || 0); offset += 4;
        dv.setUint32(offset, v.length > 0 ? 1 : 0); offset += 4;

		if (v.length > 0) {
			// Write _v
			dv.setUint32(offset, v.length); offset += 4;
			new Float32Array(buffer, offset, v.length).set(v);
			offset += v.length * 4;

			// Write _x
			dv.setUint32(offset, x.length); offset += 4;
			new Float32Array(buffer, offset, x.length).set(x);
			offset += x.length * 4;

			// Write _i
			dv.setUint32(offset, i.length); offset += 4;
			new Uint16Array(buffer, offset, i.length).set(i);
			offset += i.length * 2;
			while (offset % 4 !== 0) offset++;

			// Write _n
			dv.setUint32(offset, n.length); offset += 4;
			new Float32Array(buffer, offset, n.length).set(n);
			offset += n.length * 4;
		}

        // 3D Write
        dv.setUint32(offset, has3D); offset += 4;
        if (has3D) {
            dv.setUint32(offset, contours.length); offset += 4;
            for (const c of contours) {
                dv.setUint32(offset, c.m.length); offset += 4;
                new Float32Array(buffer, offset, c.m.length).set(c.m);
                offset += c.m.length * 4;

                const holes = c.h || [];
                dv.setUint32(offset, holes.length); offset += 4;
                for (const h of holes) {
                    dv.setUint32(offset, h.length); offset += 4;
                    new Float32Array(buffer, offset, h.length).set(h);
                    offset += h.length * 4;
                }

                const ranges = c.r || [];
                dv.setUint32(offset, ranges.length); offset += 4;
                for (const r of ranges) {
                    dv.setUint16(offset, r.s); offset += 2;
                    dv.setUint16(offset, r.c); offset += 2;
                    dv.setUint16(offset, r.o); offset += 2;
                }
                while (offset % 4 !== 0) offset++;
            }
			
			//v2
			dv.setUint32(offset, back); offset += 4;
			
			// v1
			/*
            dv.setUint32(offset, back ? back.f : 0); offset += 4;
            const bv = back?.v || [];
            dv.setUint32(offset, bv.length); offset += 4;
            new Float32Array(buffer, offset, bv.length).set(bv);
            offset += bv.length * 4;
			*/
        }

        // Kern Write
        dv.setUint32(offset, kernBytes.length); offset += 4;
        if (kernBytes.length > 0) {
            new Uint8Array(buffer, offset, kernBytes.length).set(kernBytes);
        }

        return buffer
    }
}