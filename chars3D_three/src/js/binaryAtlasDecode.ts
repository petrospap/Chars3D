/**
 * Blit font: v: 0.1
 * Parses a verified, secure .c3da binary file into clean, self-contained runtime Blit memory module
 */

export class AtlasBinaryDecoder {

	constructor(c3daBuffer: ArrayBuffer) {
        const dv = new DataView(c3daBuffer);

        // MAGIC SIGNATURE CHECK
        const magic = dv.getUint32(0, false);
        if (magic !== 0x41544C53) { // 'ATLS'
            throw new Error('Error Invalid file format.')
        };

        // SECURE VERIFICATION CHECKSUM CHECK
        const dataBytesLength = c3daBuffer.byteLength - 4;
        const writtenChecksum = dv.getUint32(dataBytesLength, true);

        const sliceToVerify = c3daBuffer.slice(0, dataBytesLength);
        const generatedChecksum = AtlasBinaryDecoder.#calculateChecksum(sliceToVerify);


        if (writtenChecksum !== generatedChecksum) {
            throw new Error('Error File is corrupted.')
        };

        // READ SECTION BLOCKS METADATA
        let offset = 4; // Advance past the 'ATLS' header

        // Read Info
        const infoLen = dv.getUint32(offset, true); offset += 4;
        const infoString = new TextDecoder('utf-8').decode(new Uint8Array(c3daBuffer, offset, infoLen));
        const info = JSON.parse(infoString);
        offset += infoLen;
        offset += (4 - (offset % 4)) % 4; // Cleanly re-align past 4-byte padding boundary

        // Read Character LUT (Lookup Table) Dictionary Index
        const lutLen = dv.getUint32(offset, true); offset += 4;
        const lutString = new TextDecoder('utf-8').decode(new Uint8Array(c3daBuffer, offset, lutLen));
        const lut = JSON.parse(lutString);
        offset += lutLen;
        offset += (4 - (offset % 4)) % 4;

        // EXTRACT MASTER SLABS (Convert total byte length to float element counts by dividing by 4)
        const pBytesLen = dv.getUint32(offset, true); offset += 4;
        const megaP = new Float32Array(c3daBuffer, offset, pBytesLen / 4);
        offset += pBytesLen;

        const nBytesLen = dv.getUint32(offset, true); offset += 4;
        const megaN = new Float32Array(c3daBuffer, offset, nBytesLen / 4);
        offset += nBytesLen;

        const uBytesLen = dv.getUint32(offset, true); offset += 4;
        const megaU = new Float32Array(c3daBuffer, offset, uBytesLen / 4);
        offset += uBytesLen;

        const fidBytesLen = dv.getUint32(offset, true); offset += 4;
        const megaFID = new Float32Array(c3daBuffer, offset, fidBytesLen / 4);
        offset += fidBytesLen;

        const iBytesLen = dv.getUint32(offset, true); offset += 4;
        const megaI = new Uint32Array(c3daBuffer, offset, iBytesLen / 4);
        offset += iBytesLen;

        // Create the clean runtime font destination container object
        const activeFontRegistry: Record<string, any> = {
            _info: info
        };

        // HYDRATE RUNTIME GLYPH OBJECT VIEWS VIA 'L' AND 'IL' METRIC VALUES
        for (const [letter, meta] of Object.entries(lut)) {
            // Handle non-geometry spaces and linebreaks safely
			if (!meta._v) {
                activeFontRegistry[letter] = {
                    _w: meta._w,
                    _v: null
                };
                continue
            };

            // Calculate active element sizes matching the exact layout parameters
            const posLen = meta.L;           // Length of Positions & Normals
            const uvLen = (posLen / 3) * 2;  // Length of UV maps (2 floats per vertex)
            const fidLen = posLen / 3;       // Length of Face IDs (1 float per vertex)
            const indexLen = meta.IL;        // Length of Index connection layout

            activeFontRegistry[letter] = {
                _w: meta._w,
                _v: 1,
                _x: meta._x,
                _k: meta._k || null,
                L: posLen,
                IL: indexLen,
                //bounds: setGBounds(meta._x) // optional pass bounds direct, NOTE: then you must remove it from AtlasFactory
                // Zero-copy direct subarray views isolated precisely to positions!
                P: megaP.subarray(meta.pStart, meta.pStart + posLen),
                N: megaN.subarray(meta.nStart, meta.nStart + posLen),
                U: megaU.subarray(meta.uStart, meta.uStart + uvLen),
                FID: megaFID.subarray(meta.fidStart, meta.fidStart + fidLen),
                I: megaI.subarray(meta.iStart, meta.iStart + indexLen)
            }
        }

        return activeFontRegistry
    };

	static #calculateChecksum(buffer: ArrayBuffer): number {
		const uint8 = new Uint8Array(buffer), len = uint8.length;
		
		let sum = 0, i = 0;
		for (; i < len; i++) {
			sum = (sum + uint8[i]) >>> 0
		};
		return sum
	}
}