import { Engine, Scene, Camera, ArcRotateCamera, HemisphericLight, Mesh, MeshBuilder, Vector3, Color3, Color4, Layer, GlowLayer, DynamicTexture, TransformNode, KeyboardEventTypes, PointerEventTypes, Animation} from '@babylonjs/core';
import {_SETTINGS} from './settings.ts';
import {Chars3D} from './char3d.ts';
import {Assets} from './loadAssets.ts';


export class App{

static engine: Engine;
static scene: Scene;
static Cam: ArcRotateCamera;
static canvas: HTMLCanvasElement;
static _score: number = 0;

	constructor(){

		App.canvas = document.querySelector('#renderCanvas');
		App.engine = new Engine(App.canvas, true);
		App.scene = new Scene(App.engine);

		App.scene.clearColor = Color3.FromHexString('#f53d72'); //new Color3(0, 0, 0);
		

		const _pi = Math.PI / 2;
		App.Cam = new ArcRotateCamera('arc-camera', _pi, _pi, 30, Vector3.Zero(), App.scene);
		App.Cam.wheelPrecision = 50;

        App.Cam.attachControl(App.canvas, true);

		const light = new HemisphericLight('light', new Vector3(0, 0, 0), App.scene);
		light.intensity = 2;
		
		const glow = new GlowLayer('glow', App.scene);
		glow.intensity = 0.6;
		glow.blurKernelSize = 64;
		
		/* load our font assets / textures */
		new Assets(App.scene);
		
		/* Wait for all files to finish decoding */
		//Assets._manager.onFinish = async () => {
		Assets.onFinish = async () => {

			new Chars3D(App.scene, Assets._font, Assets._blit, Assets._textures,  Assets.hasblit, Assets.hasfont);
			App.init();
			App.runGame();
			App.canvas.focus()
		};
		
		window.addEventListener('resize', () => {
			App.engine.resize()
		})
	};
	

/**
All variables that can be passed to draw a text
NOTE: all colors must be in HEX

id: 					string;  	    MANDATORY 'uniqueID'
txt: 					string;			MANDATORY 'text to draw'
planePos: 				{x,y,z}; 		SEMI MANDATORY, Position of TransformNode default {x:0,y:0,z:0}
letterpos?: 			{x,y,z}; 		Position of text, default {x:0,y:0,z:0}
parent?: 				Mesh;	 		Use an existing Mesh, instant of TransformNode
meta?: 					any[]; 	 		Buttons callback, i.e {charname: App.function1, ..etc};
buttons?: 				number;  		// used but not in full mode, executes drawButtons()
around?: 				boolean; 		// used only to execute drawAnimation()
font?: 					string;  		Font name to use
size?: 					number;  		size of the letters, default 1
kern?: 					number;	 		i.e 100 if not set, default kern (if exist) | 0, final this value + if exist kern, 
spacing?: 				number;			default space | spacing + default space, i.e 400
lineheight?: 			number;         line height of letter, i.e 1.2
paragraphwidth?: 		number;			Set max width of paragraph
font3d?: 				number;			Set depth of 3D (if font has builded with 3D), i.e 0.5
bevel?: 				number;			Set bevel (has an issue) i.e 0.5, default 0.1, final 3D depth is font3d + bevel
frontcolor?: 			string;			front color for all letters, default #ffffff, Color4.FromHexString(string)
sidewallcolor?: 		string;			side color for 3D letters, Color4.FromHexString(string)
backcolor?: 			string;			back color for 3D letters, Color4.FromHexString(string)
texture?: 				string;			texture to apply in all letters (this texture must be Set in setting > _FILES)
emissivecolor?: 		string;			emissive color, Color3.FromHexString(string)
ambientcolor?: 			string;			ambient color, Color3.FromHexString(string)
diffusecolor?: 			string;			diffuse color, Color3.FromHexString(string)
specularcolor?:			string;			specular color, Color3.FromHexString(string)
alpha?: 				number;			alpha 0.0 to 1.0
background?: 			boolean;		Set if paragraph OR button has a background
padding					number[];		Set padding of paragraph [top/bottom, left/right], default [1, 1] 
bgcolor?: 				string;			background color, Color4.FromHexString(string)
bgimage?: 				string;			background texture to apply (this texture must be Set in setting > _FILES)	
billboard?: 			number;			billboard, 0, 1, 2, 4, 7 default 7
notenable?: 			boolean;		Set if text is enabeld/visible
border?: 				number;			border radius, i.e 0.3 
borderthickness?: 		number;			border thickness, i.e 0.5 
//borderalpha?: 		number;			// removed, set alpha to bordercolor
bordercolor?: 			string,			border color, Color4.FromHexString(string) // issue, does not apply if was a texture! only alpha is working
outline?: 				boolean;		Set if text has outline, // issue does not working if has a background, reason, text and background/border is one mesh
outlinedepth?: 			number;			outline depth, default 0.1
outlinecolor?: 			string;			outline,color default #f5eb9b, Color3.FromHexString
sticky?: 				number;			experiment, set any text to be sticky, i.e 20 = how far in front of camera, (has issues on text with background, not in Buttons with background)
disablelight?: 			boolean;		disable light, TODO: although has set, not passed yet as calculation in textFragmentShader
exclude?:				boolean			exclude from enable/disable, mesh is always is visible if is set to true
*/

	
	static init(): void {

		// Basic paragraph's
		Chars3D.draw({
			id: 'PARAGRAPH', 
			txt: 'Welcome to Chars3D',
			planepos: {x:14, y:0, z:-12},
			frontcolor: '#22B14C', //'#f53d72'
			font3d: 0.4, // depth
			background: true,
			bgradius: 0.3,
			padding: [3, 3],
			bgimage: 'fractal',
			bgcolor: '#cccccc',
			lineheight: 1,

		});
		
		// test update/dispose
		/*
		setTimeout(()=> {
			Chars3D.update({id:'PARAGRAPH', txt: 'What App we gonna to build?'});
			//Chars3D.dispose('PARAGRAPH');
		}, 5000)
		*/


		Chars3D.draw({
			id: 'SCORE', 
			planepos: {x:22, y:-7, z:-4},
			letterpos:{x:8, y:-1, z:0},
			txt: 'SCORE: [0]',
			kern: 100,
			spacing: 0,
			meta: { SCORE: App.newScore },
			padding:[1,1.4],
			size: 0.8,
			font3d: 0.1, // depth
			//bevel: 0.1,
			texture: 'flowers',
			frontcolor: '#999999',
			sidewallcolor: '#fafafa',
			background: true,
			bgcolor:'#fafafa40', // #fafafa40 CC9D74 0960824d
			//padding:[1.5, 0.6],
			bgradius: 0.2,
			border: true, // NOTE: border image takes value from "texture"
			bgimage: 'milad', // ONLY FOR background, not for border
			bgthickness: 0.02,
			//bgradius:0.5,
			bordercolor:'#ffffff', // 5CEAA136
		});
	
		// register Action to SCORE /
		Chars3D.addAction({type:'click', id:'Scores', M:Chars3D.ch['SCORE'].paragraph});
	}

	
	/* text click */
	static newScore(): void {
		App._score++;

		Chars3D.update( {
			id: 'SCORE', 
			txt: `SCORE: [${App._score}]`
		});
		// not happy with this.. 
		// each time we must to re create addAction since we delete Mesh on update!!
		Chars3D.addAction({type:'click', id:'Scores', M:Chars3D.ch['SCORE'].paragraph});
	};
	
/*
	private static pauseGame(): void {
	  App.engine.stopRenderLoop();
	  App.scene.animationsEnabled = false
	};
*/
	private static runGame(): void {
		App.engine.runRenderLoop(() => {
			App.scene.render()
		});
		App.scene.animationsEnabled = true
	};
	

}