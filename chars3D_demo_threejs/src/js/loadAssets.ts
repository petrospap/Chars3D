import { TextureLoader } from 'three';
import { _FILES } from './settings.ts';
import { BinaryDecode } from './binaryDecode.ts';
import { AtlasBinaryDecoder } from './binaryAtlasDecode.ts';
import type { IAssetFile } from './interfaces.ts';

export class Assets {

static _font: Record<string, any> = {};
static _blit: Record<string, any> = {};
static _textures: Record<string, any> = {}; 
static onFinish: () => Promise<void> = async () => {};
static hasblit: boolean = false;
static hasfont: boolean = false;

    constructor() {
        Assets.loadAll()
    };

    private static async loadAll(): Promise<void> {
        try {
            // Three.js instance loader
            const textureLoader = new TextureLoader();

            const loadPromises = _FILES.map(async (F: IAssetFile) => {
                const url = F.path + F.filename;

                switch (F.type) {
                    case 'image':
                        // Three.js loadAsync to convert the loader into a native Promise
                        Assets._textures[F.id] = await textureLoader.loadAsync(url);
                    break;

                    case 'json':
                    case 'jsonfont':
                        const jsonResponse = await fetch(url);
                        if (!jsonResponse.ok) throw new Error(`HTTP error ${jsonResponse.status}`);
                        Assets._font[F.id] = await jsonResponse.json();
						Assets.hasfont = true;
                    break;

                    case 'binfont':
                        const binResponse = await fetch(url);
                        if (!binResponse.ok) throw new Error(`HTTP error ${binResponse.status}`);
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

            // Set all to Promise
            await Promise.all(loadPromises);

            if (Assets.onFinish) {
                await Assets.onFinish();
            }
        } catch (error) {
            console.error('Asset loading failed:', error);
        }
    }
}