import {createShaderMaterial, setShaderTexture, setShaderUniform} from '@babylonjs/lite';
import type{ ShaderMaterial, Texture2D} from '@babylonjs/lite';
import type {IShaderMaterialColors, IEffect} from './interfaces.ts';

const vertexSource=`
struct VertexOutput{
@builtin(position) gl_Position: vec4<f32>,
@location(0) vNormalW: vec3<f32>,
@location(1) vUV: vec2<f32>,
@location(2) @interpolate(flat) vFaceId: f32,
@location(3) vPositionW: vec3<f32>,
};

@vertex fn mainVertex(input: VertexInput) -> VertexOutput{
var output: VertexOutput;
let aFaceId=input.color.x; 
output.vFaceId=aFaceId;
output.vUV=input.uv;
let worldPosVec4=shaderSystem.world * vec4<f32>(input.position, 1.0);
output.vPositionW=worldPosVec4.xyz;
var localNormal=vec3<f32>(0.0);
if(aFaceId < 0.5){
localNormal=normalize(vec3<f32>(input.tangent.x * 0.2, input.tangent.y * 0.2, -1.0));
}else if(aFaceId < 1.5){
localNormal=normalize(vec3<f32>(input.tangent.x, input.tangent.y, -0.4));
}else if(aFaceId < 2.5){
localNormal=vec3<f32>(0.0, 0.0, 1.0);
}else{
localNormal=vec3<f32>(0.0, 0.0, -1.0);
}
output.vNormalW=normalize((shaderSystem.world * vec4<f32>(localNormal, 0.0)).xyz);
output.gl_Position=shaderSystem.worldViewProjection * worldPosVec4;
return output;
}`;

const fragmentSource = `
struct VertexOutput {
    @builtin(position) gl_Position: vec4<f32>,
    @location(0) vNormalW: vec3<f32>,
    @location(1) vUV: vec2<f32>,
    @location(2) @interpolate(flat) vFaceId: f32,
    @location(3) vPositionW: vec3<f32>,
};

@fragment fn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {
    var baseColor = vec4<f32>(1.0);
    var isBg = 0.0;
    
    // Isolate geometry surface channels via Face ID mapping
    if (input.vFaceId < 0.5) {
        baseColor = shaderUniforms.uFrontFaceColor;
    } else if (input.vFaceId < 1.5) {
        baseColor = shaderUniforms.uSideWallColor;
    } else if (input.vFaceId < 2.5) {
        baseColor = shaderUniforms.uBackFaceColor;
    } else if (input.vFaceId < 3.5) {
        baseColor = shaderUniforms.uBackgroundColor;
        isBg = 1.0;
    } else {
        baseColor = shaderUniforms.uCornerColor;
    }
    
    // Uniform texture sampling routines to satisfy Chrome control flow rules
    let sampledTextTex = textureSample(uDiffuseTexture, uDiffuseTextureSampler, input.vUV);
    let sampledBgTex = textureSample(uDiffuseBackground, uDiffuseBackgroundSampler, input.vUV);
    
    if (isBg > 0.5) {
        if (shaderUniforms.uHasBackground > 0.5) {
            baseColor = baseColor * sampledBgTex;
        }
    } else {
        if (shaderUniforms.uHasTexture > 0.5) {
            baseColor = baseColor * sampledTextTex;
        }
    }
    
    var finalRGB = baseColor.rgb;
    
    // Process Lighting and Specular paths
    if (shaderUniforms.uDisableLighting < 0.5) {
        let lightDir = normalize(shaderUniforms.uLightPos - input.vPositionW);
        let diff = max(dot(input.vNormalW, lightDir), 0.0);
        
        let ambientComponent = baseColor.rgb * shaderUniforms.uAmbientColor;
        let diffuseComponent = baseColor.rgb * shaderUniforms.uDiffuseColor * diff * shaderUniforms.uLightColor;
        
        finalRGB = ambientComponent + diffuseComponent;
        
        if (isBg < 0.5) {
            let viewDir = normalize(shaderUniforms.uCameraPos - input.vPositionW);
            let reflectDir = reflect(-lightDir, input.vNormalW);
            let spec = pow(max(dot(viewDir, reflectDir), 0.0), shaderUniforms.uSpecularPower);
            finalRGB = finalRGB + (shaderUniforms.uSpecularColor * spec * shaderUniforms.uLightColor);
        }
    }
    
    // Bevel Edge Glow channel handling
    if (input.vFaceId >= 0.5 && input.vFaceId < 1.5) {
        finalRGB = finalRGB + shaderUniforms.uEmissiveColor;
    }
    
    // Hardware clip execution boundary check
    if ((baseColor.a * shaderUniforms.uAlpha) < 0.1) {
        discard;
    }
    
    // EFFECT CONFIGURATOR MATRIX (Runs only across in front faces)
    if (input.vFaceId < 0.5) {
        let t = shaderUniforms.uTime * shaderUniforms.uEffectSpeed;

        // PLASMA EFFECT 1
        if (shaderUniforms.uEffect1 > 0.5) {
            let wave = sin(input.vPositionW.x * 2.0 + t) * cos(input.vPositionW.y * 2.0 + t);
            let neon = vec3<f32>(0.0, 1.0, 0.8);
            finalRGB = mix(finalRGB, neon, wave * shaderUniforms.uEffectIntensity);
        }
        
        // PLASMA EFFECT 2
        if (shaderUniforms.uEffect2 > 0.5) {
            let p = input.vPositionW.xy * 0.5; 
            let v = sin(p.x * 8.0 + t) + sin(p.y * 8.0 + t * 1.3) + sin((p.x + p.y) * 8.0 + t) + sin(length(p) * 10.0 - t * 2.0);
            
            // Computes the cyclical color shifting rings math array
            let plasmaColor = 0.5 + 0.5 * cos(vec3<f32>(v) + vec3<f32>(0.0, 2.0, 4.0));
            
            // Mix the plasma waves into text layout colors matching slider intensities
            finalRGB = mix(finalRGB, plasmaColor, shaderUniforms.uEffectIntensity);
        }
    }
    
    return vec4<f32>(finalRGB, baseColor.a * shaderUniforms.uAlpha);
}`;


// Char3DMaterial v 0.1 for babylonjs/lite
export class Char3DMaterial {
private id: string;
public hastexture: boolean = false;
public hasbgtexture: boolean = false;
public texture: Texture2D;			//Texture;
public frontcolor: number[]; 		//Color4;
public sidewallcolor: number[]; 	//Color4;
public backcolor: number[]; 		//Color4;
public ambient: number[]; 			//Color3;
public emissive: number[]; 			//Color3;
public diffuse: number[]; 			//Color3;
public specular: number[]; 			//Color3;
public alpha: number;
public bgcolor: number[]; 			//Color4;
public bgtexture: Texture2D; 		//Texture
public bordercolor: number[]; 		//Color4;
public disablelight: number;
public material: Record<string, ShaderMaterial> = {};
//static RenderShader: () => void;
public emptyTexture: Texture2D; 	//Texture
public background: boolean = false;
private plasmatime: number = 0;
private plasmaEffects: string[] = ['uEffect1', 'uEffect2'];


/**
 * input options, interface: IShaderMaterialColors
 * @param hastexture: 		boolean;
 * @param hasbgtexture: 	boolean;
 * @param texture?:			Texture2D
 * @param frontcolor?: 		number[]; //Color4,
 * @param sidewallcolor?: 	number[]; //Color4,
 * @param backcolor?: 		number[]; //Color4,
 * @param ambient?: 		number[]; //Color3,
 * @param emissive?: 		number[]; //Color3,
 * @param diffuse?: 		number[]; //Color3,
 * @param specular?: 		number[]; //Color3,
 * @param alpha?: 			number;
 * @param background?: 		boolean;
 * @param bgcolor?: 		number[]; //Color4,
 * @param bgtexture?: 		Texture2D;
 * @param bordercolor?:		number[];
 * @param disablelight?: 	number;
 * @param empty: 			Texture2D
*/

	constructor(id: string, X: IShaderMaterialColors){
		this.id = id;
		this.hastexture = X.hastexture;
		this.hasbgtexture = X.hasbgtexture;
		this.texture = X.texture;// ?? false;
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
		this.emptyTexture = X.empty;
	};
	
	public applyMaterial(_id: string): void {
		const id = _id === this.id ? this.id : _id;

		this.material[id] = createShaderMaterial({
			name: 'smat_'+id, 
			vertexSource,
			fragmentSource,
			attributes: ['position', 'normal', 'uv', 'color', 'tangent'],
			uniforms: [
				'world', 'worldViewProjection', 'cameraPosition',
				{ name: 'uLightPos', type: 'vec3<f32>', defaultValue: [5, 10, 5]},
				{ name: 'uCameraPos', type: 'vec3<f32>', defaultValue: [0, 0, 0]},
				{ name: 'uLightColor', type: 'vec3<f32>', defaultValue: [1, 1, 1]},
				{ name: 'uFrontFaceColor', type: 'vec4<f32>', defaultValue: this.frontcolor},
				{ name: 'uSideWallColor', type: 'vec4<f32>', defaultValue: this.sidewallcolor },
				{ name: 'uBackFaceColor', type: 'vec4<f32>', defaultValue: this.backcolor },
				{ name: 'uBackgroundColor', type: 'vec4<f32>', defaultValue: this.bgcolor },
				{ name: 'uCornerColor', type: 'vec4<f32>', defaultValue: this.bordercolor},
				{ name: 'uEmissiveColor', type: 'vec3<f32>', defaultValue: this.emissive},
				{ name: 'uAmbientColor', type: 'vec3<f32>', defaultValue: this.ambient},
				{ name: 'uDiffuseColor', type: 'vec3<f32>', defaultValue: this.diffuse},
				{ name: 'uSpecularColor', type: 'vec3<f32>', defaultValue: this.specular},
				{ name: 'uSpecularPower', type: 'f32', defaultValue: 16.0 },
				{ name: 'uAlpha', type: 'f32', defaultValue: this.alpha },
				{ name: 'uDisableLighting', type: 'f32', defaultValue: this.disablelight},
				{ name: 'uHasTexture', type: 'f32', defaultValue: (!this.hastexture ? 0.0 : 1.0) }, // (!this.texture ? 0.0 : 1.0)
				{ name: 'uHasBackground', type: 'f32', defaultValue: (!this.hasbgtexture ? 0.0 : 1.0) }, //(!this.bgtexture ? 0.0 : 1.0)
				{ name: 'uTime', type: 'f32', defaultValue: 0.0 },
				{ name: 'uEffect1', type: 'f32', defaultValue: 0.0 },
				{ name: 'uEffect2', type: 'f32', defaultValue: 0.0 },
				{ name: 'uEffectIntensity', type: 'f32', defaultValue: 0.1 },
				{ name: 'uEffectSpeed', type: 'f32', defaultValue: 1.0 }
			],
			samplers: ['uDiffuseTexture', 'uDiffuseBackground'],
			backFaceCulling: false,
			depthWrite: true,
			needAlphaBlending: false,
			//blendMode: "standard", // are this blendMode exist??
			blendMode: "additive"
		});
		
		/* apply texture */
		setShaderTexture(this.material[id], 'uDiffuseTexture', this.texture);
		
		/* apply Background */
		setShaderTexture(this.material[id], 'uDiffuseBackground', this.bgtexture);

	};

	/**
	* Update, update color effect
	*/
	public update(id: string, uniformName: string, value: number|number[]){
		setShaderUniform(this.material[id], uniformName, value)
	};
	
	
	/**
	 * plasmaUpdate, shader effect
	 * IEffect
	 * @param id: string
	 * @param tick: number
	 * @param speed?: number
	 * @param intensity?: number
	 * @param effect: string // choose effect Type, there two effects 'uEffect1', uEffect2 
	**/
	public plasmaUpdate(X: IEffect){
		

		const effect = this.plasmaEffects[X.effect] ?? 'uEffect1';
		const mat = this.material[X.id];
		
		setShaderUniform(mat, effect, 1.0);
		
		if(this.plasmatime > 500){
			this.plasmatime = 0
		};

		this.plasmatime +=X.tick;

		setShaderUniform(mat, 'uTime', this.plasmatime);
		
		if(X.intensity){
			setShaderUniform(mat, 'uEffectIntensity', X.intensity)  // default: 0.1
		};
		
		if(X.speed){
			setShaderUniform(mat, 'uEffectSpeed', X.speed) // default: 1.0
		}
	};

	public clean(id: string){
		this.material = {}
	}
}