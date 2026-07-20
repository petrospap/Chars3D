import {ShaderMaterial, Effect, Vector3, Color3, Scene} from "@babylonjs/core";
//Texture
import vertexShader from '../shaders/text.vertex.glsl?raw';
import fragmentShader from '../shaders/text.fragment.glsl?raw';
import type {IShaderMaterialColors} from './interfaces.ts';

/* Register shaders */
Effect.ShadersStore['textVertexShader'] = vertexShader;
Effect.ShadersStore['textFragmentShader'] = fragmentShader;

const lightcolor = new Color3(1, 1 ,1),
lightpos = new Vector3(5, 10, 5);

// Char3DMaterial v 0.7
export class Char3DMaterial {

public scene: Scene;
private id: string;
public texture: any[]|false;		//Texture|false;
public frontcolor: number[]; 		//Color4;
public sidewallcolor: number[]; 	//Color4;
public backcolor: number[]; 		//Color4;
public ambient: number[]; 			//Color3;
public emissive: number[]; 			//Color3;
public diffuse: number[]; 			//Color3;
public specular: number[]; 			//Color3;
public alpha: number;
public background: boolean;
public bgcolor: number[]; 			//Color4;
public bgtexture: any[]|false; 		//Texture|false
public bordercolor: number[]; 		//Color4;
public disablelight: number;
public material: Record<string, ShaderMaterial> = {};
static RenderShader: () => void;


/**
 * input options, interface: IShaderMaterialColors
 * @param texture?:			any[];
 * @param frontcolor?: 		number[]; //Color4,
 * @params idewallcolor?: 	number[]; //Color4,
 * @param backcolor?: 		number[]; //Color4,
 * @param ambient?: 		number[]; //Color3,
 * @param emissive?: 		number[]; //Color3,
 * @param diffuse?: 		number[]; //Color3,
 * @param specular?: 		number[]; //Color3,
 * @param alpha?: 			number;
 * @param background?: 		boolean;
 * @param bgcolor?: 		number[]; //Color4,
 * @param bgtexture?: 		any[]; // Texture
 * @param bordercolor?:		number[];
 * @param disablelight?: 	number;
*/
	constructor(id: string, scene: Scene, X: IShaderMaterialColors){
		this.scene = scene;
		this.id = id;
		this.texture = X.texture ?? false;
		this.frontcolor = X.frontcolor;
		this.sidewallcolor = X.sidewallcolor;
		this.backcolor = X.backcolor;
		this.ambient = X.ambient;
		this.emissive = X.emissive;
		this.diffuse =X.diffuse;
		this.specular = X.specular;
		this.alpha = X.alpha;
		this.background = X.background;
		this.bgcolor = X.bgcolor;
		this.bgtexture =  X.bgtexture;
		this.bordercolor = X.bordercolor
		this.disablelight = X.disablelight;
	};


	public applyMaterial(_id:string): void {

		const id = _id === this.id ? this.id : _id;

		/* Shader configuration properties */
		this.material[id] = new ShaderMaterial('smat_'+id, this.scene, {
			vertexSource: vertexShader,
			fragmentSource: fragmentShader,

		}, {
			attributes: ['position', 'normal', 'uv', 'aFaceId'],
			uniforms: [
				'worldViewProjection', 'world',
				'uTime', 'uEffectIntensity, uEffectSpeed',
				'uFrontFaceColor', 'uSideWallColor','uBackFaceColor',
				'uBackgroundColor', 'uCornerColor',
				'uLightPos', 'uCameraPos', 'uLightColor',
				'uAmbientColor', 'uEmissiveColor', 'uDiffuseColor',
				'uSpecularColor', 'uSpecularPower', 'uAlpha',
				'uHasTexture', 'uHasBackground', 'uDisableLighting' // FIXED
			],
			samplers: ['uDiffuseTexture', 'uDiffuseBackground']
		});

		/* casting fallback defaults for illumination toggle */
		this.material[id].setFloat('uDisableLighting', this.disablelight);
		//this.material[id].setFloat('uDisableLighting', this.disablelight ?? 1.0);

		
		this.material[id].setFloat('uEffectIntensity', 0.0);
		this.material[id].setFloat('uEffectSpeed', 2.0);

		/* Update scene data lightpos and color */
		this.material[id].setVector3('uLightPos', lightpos);
		this.material[id].setColor3('uLightColor', lightcolor);

		// For the Text Highlights
		this.material[id].setColor3('uSpecularColor', this.specular); /* new Color3(0, 0, 0) Bright highlights 0.5, 0.5, 0.5 */
		this.material[id].setFloat('uSpecularPower', 16.0); // 64, 32, 16, 8, 4 Sharp highlights 240

		/* letter colors */
        this.material[id].setColor4('uFrontFaceColor', this.frontcolor);
        this.material[id].setColor4('uSideWallColor', this.sidewallcolor);
        this.material[id].setColor4('uBackFaceColor', this.backcolor);

		/* classic material colors */
		this.material[id].setColor3('uAmbientColor', this.ambient);
		this.material[id].setColor3('uEmissiveColor', this.emissive); // self-lit, not affected by light, but glow
		(this.material[id] as any).emissiveColor = this.emissive; // apply glow // this.emissive.scale(1.5)
		// test for glow
		//this.material[id].setColor3('uEmissiveColor', new Color3(1.0, 0.0, 0.0)); // Deep Red Glow

		this.material[id].setColor3('uDiffuseColor', this.diffuse);
		this.material[id].setColor4('uCornerColor', this.bordercolor);

		/* apply texture */
        if (this.texture) {

			//this.texture.wrapV = 1;
            this.material[id].setTexture('uDiffuseTexture', this.texture);
			this.material[id].setFloat('uHasTexture', 1.0);
			// CRITICAL: Force texture to wrap infinitely across layout ranges
			// If UV math maps slightly outside 0-1, this forces it to tile instead of stretching a flat edge pixel!
			this.texture.wrapU = 1; // BABYLON.Texture.WRAP_ADDRESSMODE
			this.texture.wrapV = 1;
			
			//this.texture.uScale = 1;
			//this.texture.vScale = 1;
			
			//  NO-REPEAT FIX :
			//this.texture.wrapU = Texture.CLAMP_ADDRESSMODE; // Stop horizontal (U-axis) repetition
			//this.texture.wrapV = Texture.CLAMP_ADDRESSMODE; // Stop vertical (V-axis) repetition
        } else {
			//this._transpTexture = new Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABBJREFUeNpi+P//PwNAgAEACPwC/tuiTRYAAAAASUVORK5CYII=", scene);
			this.material[id].setFloat('uHasTexture', 0.0)
        };

		/* apply Background */
		if (this.background) {
		this.material[id].setColor4('uBackgroundColor', this.bgcolor);
			if (this.bgtexture) {
				this.material[id].setTexture('uDiffuseBackground', this.bgtexture);
				this.material[id].setFloat('uHasBackground', 1.0);
				
			this.bgtexture.wrapU = 0; // BABYLON.Texture.WRAP_ADDRESSMODE
			this.bgtexture.wrapV = 0;
			
			} else {
				this.material[id].setFloat('uHasBackground', 0.0)
			}
		};

		/* Global master fade (makes text + bg, disappear together) */
		this.material[id].setFloat('uAlpha', this.alpha);

		
		/* Turn on blending to fix the depth buffer */
		this.material[id].needAlphaBlending = () => true;
		
		this.material[id].needAlphaTesting = () => true;   /* Force alpha clipping natively */
		//this.material[id].setAlphaTestingImages = () => true; /* < NOT sure dude */


        /* Critical: Always enable backface rendering */
        this.material[id].backFaceCulling = false;
		//this.material[id].cullBackFaces = true;

		/*
		MANDATORY forceDepthWrite to true, ensure the back layer isn't skipped for background.
		NOTE: not display outline on text, reason bg + text combined together as one!!!
		*/
		this.material[id].forceDepthWrite = true;
		/*
		this.material[id].zOffset = 1.0;
		*/


		/* Ensure highlight move with along camera */
		this.RenderShader = () => {
			if (this.material[id] && this.scene.activeCamera) {
				this.material[id].setVector3('uCameraPos', this.scene.activeCamera.position);
			}
		};

		this.scene.onBeforeRenderObservable.add(this.RenderShader)
    };


	public clean(id){
		// https://doc.babylonjs.com/typedoc/classes/_babylonjs_core.ShaderMaterial#dispose
		this.scene.onBeforeRenderObservable.removeCallback(this.RenderShader);
		this.material[id].dispose();
		this.material = {}
	}
}