import {PerspectiveCamera, RawShaderMaterial, Matrix4, Color, Vector3, RepeatWrapping, ClampToEdgeWrapping} from 'three';
import vertexShader from '../shaders/text.vertex.glsl?raw';
import fragmentShader from '../shaders/text.fragment.glsl?raw';
import type {IColor4, IShaderMaterialColors} from './interfaces';

const lightColor = new Color(0xffffff),
lightPos = new Vector3(5, 10, 5),
cameraPos = new Vector3(0, 0, 0),
fallbackColor = new Color(0xffffff); // 0x145e22

// Char3DMaterial v 0.7
export class Char3DMaterial {
private camera: PerspectiveCamera;

private id: string;

public texture: Texture|false;
public frontcolor: IColor4; 	//Color4;
public sidewallcolor: IColor4|false; 	//Color4;
public backcolor: IColor4|false; 		//Color4;
public ambient: Color; 			//Color3;
public emissive: Color; 		//Color3;
public diffuse: Color; 			//Color3;
public specular: Color; 		//Color3;
public alpha: number;
public background: boolean;
public bgcolor: IColor4|false; 	//Color4;
public bgtexture: any[]|false; 	//any[]; Texture|false
public bordercolor: IColor4|false; 	//Color4;
public disablelight: number;

public material: Record<string, RawShaderMaterial> = {};

	constructor(id: string, camera: PerspectiveCamera, X: IShaderMaterialColors){

		this.camera = camera;
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
		
		if(this.texture){
			// Keep your vertical coordinate map alignment straight
			this.texture.flipY = false; 

			this.texture.wrapS = RepeatWrapping; // Horizontal wrap
			this.texture.wrapT = RepeatWrapping; // Vertical wrap
		}
		
		if (this.background && this.bgtexture) {
			this.bgtexture.flipY = false;
			this.bgtexture.wrapS = ClampToEdgeWrapping; //RepeatWrapping;
			this.bgtexture.wrapT = ClampToEdgeWrapping; //RepeatWrapping;
			this.bgtexture.needsUpdate = true; 
		}
	};
	

	public applyMaterial(_id: string): void {
		// Account for dynamic button sub-components safely
		const id = _id === this.id ? this.id : _id;

		this.material[id] = new RawShaderMaterial({
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			transparent: true,
			alphaTest: 0.01,
			side: 2, 
			depthWrite: true,
			depthTest: true,

			uniforms: {
				uLightPos:          { value: lightPos }, 
				uLightColor:        { value: lightColor }, 
				uCameraPos:         { value: cameraPos }, 
				
				uDisableLighting:   { value: this.disablelight },
				uAlpha:             { value: this.alpha },
				uTime:       		{ value: 0.0 },
				uEffectSpeed:       { value: 2.0 },
				uEffectIntensity:   { value: 0.0 },
				uSpecularColor:     { value: this.specular ?? fallbackColor },
				uSpecularPower:     { value: 16.0 },
				
				// Remove '?? null' and use direct properties or explicit fallbacks
				uFrontFaceColor:    { value: this.frontcolor?.rgb ?? fallbackColor },//{ value: this.frontcolor?.rgb ?? fallbackColor },
				uFrontAlpha:        { value: this.frontcolor?.alpha ?? 1.0 },

				uSideWallColor:     { value: this.sidewallcolor?.rgb ?? fallbackColor },
				uSideAlpha:         { value: this.sidewallcolor?.alpha ?? 1.0 },

				uBackFaceColor:     { value: this.backcolor?.rgb ?? fallbackColor },
				uBackAlpha:         { value: this.backcolor?.alpha ?? 1.0 },

				uBackgroundColor:   { value: this.bgcolor?.rgb ?? fallbackColor },
				uBackgroundAlpha:   { value: this.bgcolor?.alpha ?? 1.0 },
				
				uCornerColor:       { value: this.bordercolor?.rgb ?? fallbackColor },
				uCornerAlpha:       { value: this.bordercolor?.alpha ?? 1.0 },
				
				uDiffuseTexture:    { value: this.texture || null },
				uHasTexture:        { value: this.texture ? 1.0 : 0.0 },
				
				uDiffuseBackground: { value: this.bgtexture || null },
				uHasBackground:     { value: this.bgtexture ? 1.0 : 0.0 },
				
				uAmbientColor:      { value: this.ambient ?? fallbackColor },
				uEmissiveColor:     { value: this.emissive ?? fallbackColor }, 
				uDiffuseColor:      { value: this.diffuse ?? fallbackColor }
			}
		});


		this.material[id].onBeforeRender = (renderer, scene, camera) => {
			this.material[id].uniforms.uCameraPos.value.copy(this.camera.position);
		};
		
	};
	
	public setColor3(id: string, uniformName: string, colorValue: Color): void {
		if (this.material[id].uniforms[uniformName]) {
			this.material[id].uniforms[uniformName].value.copy(colorValue);
		}
	};

	// helpers update
	public setColor4(id: string, uniformName: string, colorValue: IColor4): void {
		if (this.material[id].uniforms[uniformName]) {
			this.material[id].uniforms[uniformName].value.copy(colorValue?.rgb);
		}
	};

	public setFloat(id: string, uniformName: string, floatValue: number): void {
		
		if (this.material[id].uniforms[uniformName]) {
			this.material[id].uniforms[uniformName].value = floatValue;
		}
	};
	

	public clean(id): void {
		// how to remove the above onBeforeRender?
		this.material[id].dispose();
		this.material = {}
	}
}