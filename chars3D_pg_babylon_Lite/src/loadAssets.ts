import { Texture2D, loadTexture2D} from '@babylonjs/lite';
import type { EngineContext } from '@babylonjs/lite';

import { _FILES } from './settings.ts';
import { BinaryDecode } from './binaryDecode.ts';
import { AtlasBinaryDecoder } from './binaryAtlasDecode.ts';
import type { IFontData, IAssetFile } from './interfaces.ts';


export class Assets {

static _font: Record<string, IFontData> = {};
static _blit: Record<string, any> = {};
static _textures: Record<string, Texture2D> = {}; 
static onFinish: () => Promise<void> = async () => {};
static hasblit: boolean = false;
static hasfont: boolean = false;
    /**
     * @param engineContext
     */
    constructor(engine: EngineContext) {
		Assets.loadAll(engine)
    };


    private static async loadAll(engine: EngineContext): Promise<void> {
        try {

            const loadPromises = _FILES.map(async (F: IAssetFile) => {
                const url = F.path+F.filename;
                switch (F.type) {
                    case 'image':
						Assets._textures[F.id] = await loadTexture2D(engine, url);
						/*
						Assets._textures[F.id] = await loadTexture2D(engine, url, {
							invertY: true,
							addressModeU: "clamp-to-edge",
							addressModeV: "clamp-to-edge",
							
							mipMaps: false,
							//minFilter: "linear",
							//magFilter: "linear",
							// Premultiplied alpha so bilinear filtering at the transparent crest/cloud
							// edges blends correctly (straight alpha bleeds the transparent-black texels
							// into a dark fringe; premultiplied makes them contribute zero).
							premultiplyAlpha: true,
						});
						*/
                    break;
                    case 'jsonfont':
						const jsonResponse = await fetch(url);
						if (!jsonResponse.ok) throw new Error(`HTTP ${jsonResponse.status} FILE: ${F.filename}`);
						Assets._font[F.id] = await jsonResponse.json();
						Assets.hasfont = true;
                    break;

                    case 'binfont':
                        const binResponse = await fetch(url);
						if (!binResponse.ok) throw new Error(`HTTP ${binResponse.status} FILE: ${F.filename}`);
                        const arrayBuffer = await binResponse.arrayBuffer();
                        Assets._font[F.id] = new BinaryDecode(arrayBuffer);
						Assets.hasfont = true;
                    break;
					
                    case 'c3dafont':
                        const c3daResponse = await fetch(url);
						if (!c3daResponse.ok) throw new Error(`HTTP ${c3daResponse.status} FILE: ${F.filename}`);
                        const c3daBuffer = await c3daResponse.arrayBuffer();
                        Assets._blit[F.id] = new AtlasBinaryDecoder(c3daBuffer);
						Assets.hasblit = true;
                    break;
                }
            });

            await Promise.all(loadPromises);

            if (Assets.onFinish) {
                await Assets.onFinish()
            }
        } catch (error) {
            console.error('Asset loading failed:', error)
        }
    }
}