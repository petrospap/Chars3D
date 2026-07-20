import { Scene, Texture } from '@babylonjs/core';
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
    /**
     * @param sceneContext - Scene
     */
    constructor(sceneContext: Scene) {
		Assets.loadAll(sceneContext)
    };

    private static async loadAll(sceneContext: Scene): Promise<void> {
        try {

            const loadPromises = _FILES.map(async (F: IAssetFile) => {
                const url = F.path+F.filename;
                switch (F.type) {
                    case 'image':
						Assets._textures[F.id] = new Texture(url, sceneContext);
                    break;

                    case 'json':
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
                await Assets.onFinish();
            }
        } catch (error) {
            console.error('Asset loading failed:', error);

        }
    }
}
