import { Engine, Scene, Camera, ArcRotateCamera, HemisphericLight, Mesh, MeshBuilder, Vector3, Color3, Color4, Layer, GlowLayer, DynamicTexture, TransformNode, KeyboardEventTypes, PointerEventTypes, Animation} from '@babylonjs/core';
import {_SETTINGS, log, _color, Performance} from './settings.ts';
import {Chars3D} from './char3d.ts';
import {Assets} from './loadAssets.ts';


/* backgrounds helper, plus color animations */
const GRADIENT = {
purple: ['#9D00FF','#3C0061'], // #3C0061 6E00B3
BlackGreen: ['#6c7971','#000000'],
BlackWhite1: ['#bec1c0','#111111'],
Green1: ['#7ae48e','#145e22'],
Blue1: ['#aaf5ef','#216696'],
Yellow1: ['#f5eb9b','#e6b10e'],
Red1: ['#f53d72','#8a0a2e'],
gradients: ['#f5eb9b','#e6b10e', '#7ae48e','#145e22','#aaf5ef','#216696','#f53d72','#8a0a2e']
},
pad = (n: string|number): number => {return n < 10 ? '0' + n : n},
memoryMB = (bytes: number): number => {
	return (bytes / 1024 / 1024).toFixed(2)
};


export class App{

static engine: Engine;
static scene: Scene;
static Cam: ArcRotateCamera;
static canvas: HTMLCanvasElement;
static tick: number = 0;
static Render: () => void; 
static _Date: Date = new Date();
static _score: number = 0;
static animationCamera: Animation = new Animation('cameraAlpha', 'alpha', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
static _width: number;
static _height: number;
static _freezeWorld: boolean = false;

	constructor(){
		log('%cChars3D: [%s] on [%s]',_color.success,'is started',App._Date);

		App.canvas = document.querySelector('#renderCanvas');
		App.engine = new Engine(App.canvas, true);
		App.scene = new Scene(App.engine);
		App.scene.clearColor = new Color3(0, 0, 0);
		
		App._width = App.engine.getRenderWidth() / 2 / 100;
		App._height = App.engine.getRenderHeight() / 2 / 100;
		
		const _pi = Math.PI / 2;
		App.Cam = new ArcRotateCamera('arc-camera', _pi, _pi, 30, Vector3.Zero(), App.scene);
		App.Cam.wheelPrecision = 50;

        App.Cam.attachControl(App.canvas, true);

		const light = new HemisphericLight('light', new Vector3(0, 0, 0), App.scene);
		light.intensity = 2;
		
		const glow = new GlowLayer('glow', App.scene);
		glow.intensity = 0.6;
		glow.blurKernelSize = 64;
		
		/* load assets font/textures */
		new Assets(App.scene);
		
		/* Wait for all files to finish loading/decoding */
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
All variables that can be used to draw a text
NOTE: all colors must be in HEX

id: 					string;  	    MANDATORY 'uniqueID'
txt: 					string;			MANDATORY 'text to draw'
planepos: 				{x,y,z}; 		SEMI MANDATORY, Position of TransformNode default {x:0,y:0,z:0}
letterpos?: 			{x,y,z}; 		Position of text, default {x:0,y:0,z:0}
parent?: 				Mesh;	 		Use an existing Mesh, instant of TransformNode
meta?: 					any[]; 	 		Buttons callback, i.e {charname: App.function1, ..etc};
buttons?: 				boolean;  		used to execute drawButtons()
around?: 				boolean; 		used only to execute drawAnimation()
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
border?: 				boolean;		Set if paragraph OR button has a border
bgradius?: 				number;			border radius, i.e 0.3
bgthickness?: 			number;			border thickness, i.e 0.5 
bordercolor?: 			string,			border color, Color4.FromHexString(string) // issue, does not apply if was a texture! only alpha is working
adjustY?:				number;			panel adjust Y, i.e 0.05, default: 0.07
adjustX?:				number;			panel adjust X, i.e 0.10
outline?: 				boolean;		Set outline to text, outline not working if has a background/border, reason, text and background/border is one mesh
outlinedepth?: 			number;			outline depth, default 0.1
outlinecolor?: 			string;			outline,color default #f5eb9b, Color3.FromHexString
billboard?: 			number;			billboard, 0, 1, 2, 4, 7 default 7
notenable?: 			boolean;		Set if text is enabeld/visible
sticky?: 				number;			experiment, set any text to be sticky, i.e 20 = how far in front of camera
disablelight?: 			boolean;		disable light, TODO: although has set, not passed yet as calculation in textFragmentShader
exclude?:				boolean			exclude from enable/disable, mesh is always is visible if is set to true
*/


	static init(): void {
		// background colors: purple, BlackGreen, BlackWhite1, Green1, Blue1, Yellow1
		App.createGradientTexture('bg1', true, GRADIENT.BlackGreen);
		
		/* plain custom text "notenable" */
		Chars3D.draw({
			id:'gamepause', // MANDATORY
			txt:'Game Paused', // MANDATORY
			letterpos: {x:0, y:1, z:0},
			notenable: true,
			sticky: 20,
			size:1.2, 
			frontcolor:'#EED509',
			border:true,
			bordercolor: '#22222260'
			//emissivecolor:'#ffffff'
			//emissivecolor:'#EED509'
		});
		
		// Simply 3D text
		// 3D with bevel
		Chars3D.draw({
			id: 'BABYLON3D', // MANDATORY
			txt: `BabylonJS`, // MANDATORY
			planepos: {x:8, y:-4, z:8}, // MANDATORY
			font: 'b3d_',
			font3d: 1.5, // depth
			bevel:0.5,
			kern:-50,
			//spacing: 50,
			frontcolor: '#D1C79A',
			sidewallcolor: '#de6161',
			//backcolor: '#D1C79A',
			texture: 'rothenberg',
			//emissivecolor:'#418c35',
			size:1.8,
			//disablelight: true
		});

		// 3D with with color Animation /
		Chars3D.draw({
			id: 'CHARS3D', // MANDATORY
			txt:'CHARS3D', //  MANDATORY
			planepos: {x:-4, y:4, z:-6}, // MANDATORY
			font: 'bebasbin',
			font3d: 1.5, // depth
			//bevel:0.8,
			//kern:300,
			frontcolor: '#0DDE07',
			sidewallcolor: '#ffffff',
			backcolor: '#000000',//25e516
			texture: 'goldencrack',
			size: 1.8,
			//disablelight: true
		});
		
		// our pre build font (blit), draws directly and not need to run Atlas functions to build font!!!
		Chars3D.draw({
			id: 'BLIT', 
			txt: `Blit Script`,
			planepos: {x:16, y:-3, z:2},
			font: 'blit',
			size: 1.3,
			background: true,
			bgradius: 0.3,
			padding: [3, 1],
			adjustY: 0,
			bgimage: 'grunge_small',
			bgcolor: '#145e22',
			//kern: 500,
			//spacing: 400,
			//lineheight: 1.8,
			frontcolor: '#f53d72',
			//outline: false, // does not working if has a background, reason, text and background/border is one mesh
		});
		
		// Basic paragraph's /
		Chars3D.draw({
			id: 'PARAGRAPH', 
			txt: `Hello!^Welcome to new Chars3D^An easy? and fast way to create 3D text with Babylon.js OR Three.js..^And with little effort can be used with any other game library!`,
			//txt: `My name is Megara, and even I’m still amazed that I’m a goddess. It’s ironic because ever since I was a child on Earth, I’ve always seen religion as a way to subjugate people. But we’ll get back to that later. If you’re reading this, my plans have probably come to fruition. If my memoirs have been released from the Great Library’s production units, it’s because it has deemed humanity capable of understanding this history (and if not, then at least I had the pleasure of writing them in the first place). But don’t skip to the end! Let’s go over how things have gone so far. As I said, my name is Megara, and I’m about 29,000 years old as I write this (you lose track of a decade or century or two here and there after the first couple of millennia). I’m also the supreme deity of the planet of Illuminaria. However, before achieving this divine status, I was a human, just like you. I wasn’t born on Illuminaria but rather on a planet called Earth in the year 2245 of the local calendar. Earth is (or perhaps I should say "was") located a long haul from Illuminaria, and so I’ve spent much of my life traveling the vast distances of the cosmos. I know all this might seem incomprehensible from your point of view. We’ll start at the beginning so you can better understand my story and your own legacy.`,
			//paragraphwidth: 18, // calculated as the width of paragraph
			planepos: {x:14, y:0, z:-12},
			//font: 'testfont',
			//size: 1.3,
			//texture: 'rothenberg', // BUG, texture not render correctly with "thin" lowercase, flat-topped or rounded characters fonts, the issue is on the UV's in AtlasFactory and in Char3DMaterial > this.texture.wrapV = 1;
			background: true,
			bgradius: 0.3,
			padding: [3, 3],
			bgimage: 'grunge',
			bgcolor: '#cccccc',
			//lineheight: 1,
			frontcolor: '#f53d72', // f53d72 aaf5ef 145e22
			//outline: false, //  does not working if has a background, reason, text and background/border is one mesh
		});

		// test update
			//setTimeout(()=> {
			//	Chars3D.update({id:'PARAGRAPH', txt: 'what next?'});
			//Chars3D.dispose('PARAGRAPH')
			//}, 5000)
		
			
		// simply border /
		Chars3D.draw({
			id: 'BORDER', 
			txt: 'a simply border', 
			font: 'ramborsborder',
			planepos: {x:0, y:10, z:-12},
			frontcolor: '#E30235',
			emissivecolor: '#6d132d',
			border:true,
			padding:[1.5,1.5],
			adjustY:0.20,
			bordercolor:'#6d132d',
			bgradius: 0.3,
			bgthickness: 0.05,
			outline: true,
			outlinedepth: 0.5,
			outlinecolor: '#6D253E'
		});
		

		/** simply sticky
		* ABOUT sticky: to make sticky work, MUST be set ONLY letterpos, this is the ABSOLUTE position of text in 3D world
		* not perfect, need to catch and apply position on resize??
		*/
		//const stickyY: number = App._height;
		Chars3D.draw({
			id: 'FPS', 
			txt: 'FPS: 00',
			letterpos: {x:App._width - 4, y:App._height, z:-2},
			font: 'kenneypixel',
			kern: 100,
			size: 0.8,
			sticky: 30,
			frontcolor:'#e5165f',
			outline: true,
			outlinedepth: 0.2,
			outlinecolor: '#111111',
			//emissivecolor:'#ffffff'
		});
		
		Chars3D.draw({
			id: 'INFO', 
			txt: 'Hello Babylon JS!', // HBJSFPeloabyn1234567890:[]! // HTFPSJelohr1234567890!:[]!
			letterpos: {x:-App._width + 4, y:App._height, z:-2},
			font: 'kenneypixel',
			//kern: 500,
			//spacing: 200,
			size: 0.8,
			sticky: 30,
			frontcolor:'#e5165f',
			outline: true,
			outlinedepth: 0.2,
			outlinecolor: '#111111'
		});

		
		// create a Box /
		const box = MeshBuilder.CreateBox('box', {height: 1.25, width: 1.55, depth: 0.35}, App._scene);
		box.material = Chars3D.createMaterial({id:'box', texture:'wave', usecolors:true, emissive:'#8a8133', disablelight:true});
		box.position.set(20, 10, -10);
		
		// draw text parent to Box /
		Chars3D.draw({
			id: 'TIME', 
			font: 'timedigital7',
			//txt: 'TIME: 00:00:00', // you should add always the highest letters?
			txt: `TIME: ${pad(App._Date.getHours())}:${pad(App._Date.getMinutes())}:${pad(App._Date.getSeconds())}`,
			//planepos: {x:20, y:10, z:-10}, // since we have a parent, we don't need to set a planepos
			letterpos: {x:0, y:2.5, z:0},
			parent: box,
			//texture: 'rothenberg',
			size:0.9,
			kern: 50,
			frontcolor: '#5CB7EAEB',
			border: true,
			padding:[1,1],
			bgthickness: 0.03,
			//bgradius:0.2,
			bordercolor:'#5CEAA136',
			outline: false,
			outlinedepth: 0.5,
			outlinecolor: '#216696'
		});
		

		//setTimeout(()=> {
		//	Chars3D.update({id:'INFO', txt: 'info need an image^next to text?'});
		//}, 5000)
		
		
		// Extra: text position and Animation /
		const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 4, segments:256 }, App.scene);
		sphere.material = Chars3D.createMaterial({id:'sphere', texture:'abstract', usecolors:true, disablelight:true});
		sphere.position.set(-20, 0, 0);
		// a simply Animation around sphere /
		Chars3D.draw({
			id: 'AROUNDGLOBE', 
			txt: `A banner around globe..`, 
			//planepos: {x:-20, y:0, z:0},
			parent: sphere,
			around:true, // MANDATORY to execute drawAnimation
			frontcolor: '#418c35',
			//emissivecolor:'#418c35'
		});
	
		
		// BUTTONS /
		Chars3D.draw({
			id: 'Buttons', 
			font: 'designiconsbtn',
			// vertical
			letterpos: {x:App._width + 4.5, y:App._height + 1, z:0},
			txt: !_SETTINGS.debugTime ? 'power_settings_new^electric_bolt^_3d_rotation^fullscreen' : 'power_settings_new^electric_bolt^_3d_rotation^fullscreen^stacks',
	
			/*
			// horizontal
			letterpos: {x:-6.2, y:-App._height-4, z:0}, 
			txt: !_SETTINGS.debugTime ? 'power_settings_new electric_bolt _3d_rotation fullscreen' : 'power_settings_new electric_bolt _3d_rotation fullscreen stacks',
			*/
			
			// examples from other fonts
			//txt: !_SETTINGS.debugTime ? 'house circle-play' : 'house circle-play circle-stop', // < Fontawesome
			//txt: !_SETTINGS.debugTime ? 'a b' : 'a b c', // < any font
			meta: { power_settings_new: App.runPauseGame, electric_bolt: App.animateCamera, _3d_rotation: App.set3Drotation, fullscreen: App.runFullScreen, stacks: App.viewDebugTime }, 
			buttons: true, // MANDATORY to execute drawButtons
			sticky: 30, // experiment, how far in front of camera
			exclude:true, // exclude to enable/disable, mesh is always is visible
			size:0.6,
			kern: 600,
			spacing: 800,
			lineheight: 2.2,
			frontcolor: '#ffffff',
			background: true,
			//border:true,
			//bordercolor: '#222222',
			bgcolor:'#216696', // set alpha in backgroundcolor to have opacity 216696
			bgimage: 'btngreen',
			padding:[1.8, 1.5],
			//bgradius: 0.3, // not need as image is rounded
		});
		
		// register Action /
		Chars3D.ch['Buttons'] && Chars3D.ch['Buttons'].meshes.forEach(B => {
			Chars3D.addAction({type:'button', id:'Buttons', M:B});
		});
	
		Chars3D.draw({
			id: 'SCORE', 
			planepos: {x:22, y:-7, z:-4},
			letterpos:{x:8, y:-1, z:0},
			font:'oxbscore',
			txt: 'SCORE: [0]',
			kern: 100,
			spacing: 0,
			meta: { SCORE: App.newScore },
			padding:[1,1.4],
			size: 0.8,
			font3d: 0.1, // depth
			//bevel: 0.1,
			texture: 'rothenberg',
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
		

		// debug info
		if(_SETTINGS.debugTime){
			Chars3D.draw({
				id: 'debuginfo', // MANDATORY
				txt: App.debugInfo(), //  MANDATORY
				planepos: {x:-2, y:8, z:-15}, // MANDATORY
				lineheight:1.1,
				background: true,
				bgcolor:'#145e22',//'#216696 968F28',145e22
				bgradius: 0.3,
				padding:[3,3],
				//outline: true,
				//outlinedepth:0.02,
				//outlinecolor: '#8a0a2e',
				size: 0.8, 
				frontcolor:'#ffffff',
				notenable: true
			});
			
			// setTimeout used just to catch the above timing!
			setTimeout(()=> {
				const finaldebugText = App.debugInfo();
				Chars3D.update({id:'debuginfo', txt: finaldebugText})
			}, 250)
		};


		/* 
		* Animation timers setup, just example for updates
		*/
		const step = [1, 3, 0.050], /* timer steps, seconds/ms between updates (1 is every second) */
		elapsed = [0, 0, 0]; /* accumulated time */
		
		let index = 0, /* current position in array */
		elapsedLen = elapsed.length,
		lenValue = GRADIENT.gradients.length, /* animation color */
		sphereAxis = new Vector3(Math.sin(23 * Math.PI/180), Math.cos(23 * Math.PI/180), 0); /* animation rotate */

		/* custom render animations */
		App.Render = () => {
			
			/* set time tick once, can be used across APP */
			App.tick = App.scene.getEngine().getDeltaTime() / 1000;
			
			/* pass time to elapsed */
			for (let i = 0; i < elapsedLen; ++i) {
				elapsed[i] += App.tick
			};
			
			/* Sphere rotate animation */
			sphere.rotate(sphereAxis, 0.005, 0);
			
			/* Plasma animation: params: id, time, speed */
			Chars3D.plasmaUpdate('CHARS3D', App.tick, 1.8);
			
			/* step[0] has set to update time every 1 sec */
			if (elapsed[0] >= step[0]) {
				const _t = new Date(),
				s = _t.getSeconds(),
				h = _t.getHours(),
				m = _t.getMinutes();
				elapsed[0] = 0;
				
				Chars3D.update( {
					id: 'TIME', 
					txt: `TIME: ${pad(h)}:${pad(m)}:${pad(s)}`
				})
			
			};
			
			/* Color animation every 3 sec */
			if (elapsed[1] >= step[1]) {
				elapsed[1] = 0;
				Chars3D.update({id: 'PARAGRAPH', frontcolor: GRADIENT.gradients[index]});
				index = (index + 1) % lenValue;
			};
			
			/* draw fps */
			Chars3D.update({
				id: 'FPS', 
				txt: 'FPS: '+App.engine.getFps().toFixed(),
			})
			
		};

		/* register and start render our animations */
		App.scene.onBeforeRenderObservable.add(App.Render);
		
		
		//log('Active Vertices: %s', App.scene.getEngine().getVertexBuffersCount());
		//log('Total Meshes: %s', App.scene.meshes.length);
		
		/* keyboard actions */
		App.scene.onKeyboardObservable.add((e) => {
			switch (e.type) {
				case KeyboardEventTypes.KEYDOWN:
					switch (e.event.key) {
						case 'f':
							App.runFullScreen();
						break;
						case 'p':
							App.runPauseGame();
						break;
						case 's':
							App.#createScreenshot();
							// https://doc.babylonjs.com/features/featuresDeepDive/scene/renderToVideo
							// https://doc.babylonjs.com/typedoc/variables/BABYLON.ScreenshotTools
							//Tools.CreateScreenshot(App.engine, App.Cam, {precision: 1.0})
						break;
					}
				break
			}
		})
	};
	
	/* create Screenshot for debug? */
	static #createScreenshot(): HTMLImageElement {
		App.scene.render();
		
		App.canvas.toBlob((blob) => {
			const _time = new Date(),
			url = URL.createObjectURL(blob),
			a = document.createElement('a');
			a.download = `Charc3D-capture-${_time.toISOString()}.png`;
			a.href = url;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		}, 'image/png'); //'image/webp'
	}
	

	/* write debug Info */
	static debugInfo(): string {
		const br = _SETTINGS.LETTERLINEBREAK;
		let text: string = ``,
		ids: number = 1;
		const totalIds = Object.keys(Chars3D.logPerformance).length - 3;
		for(const [id,v] of Object.entries(Chars3D.logPerformance)){
			if(id === 'started'){
				text += `Chars3D Started:${br}${v}${br}${br}Total Time To Build [${totalIds}] ids, with Total Chars (and spaces) in Screen: [${Chars3D.total.letters}], and with ${Chars3D.total.totalfonts} different fonts!${br}Ready in ${Chars3D.total.performance}ms!${br}${br}Memory:${br}`
			}else if(id === 'totalbytes'){
				const _totalbytes2d = memoryMB(Chars3D.total.totalbytes2d),
				_totalbytes3d = memoryMB(Chars3D.total.totalbytes3d);
				text += `MegaAtlas totalBytes used to build 2D: ${Chars3D.total.totalbytes2d} Memory: ${_totalbytes2d} MB ${br}totalBytes used to build 3D: ${Chars3D.total.totalbytes3d} Memory: ${_totalbytes3d} MB ${br}${br}Vertex letters:${br}`
			}else if(id === 'prebuild'){
				text += `Total 2D letters: [${Chars3D.total.letters2D}]${br}Total 3D letters: [${Chars3D.total.letters3D}]${br}time took to build: ${v.time} ms${br}${br}Draws:${br}`
			}else{
				const textMemory = memoryMB(v.memory),
				panel = v.panelv === 0 ? `` : ` Background[ Triangles: ${v.panelp}, Vertices: ${v.panelv} ]`;
				text += `${ids}) ID: ${id} > It took ${v.time} ms, Chars: ${v.len}, Memory: ${textMemory} MB, Triangles: ${v.textp}, Vertices: ${v.textv}. ${panel}${br}`
				ids++;
			}
		};
		return text
	};
	

	
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
	
	
	/* button click */
	static runFullScreen(){
		if (document.fullscreenElement?.nodeName === 'CANVAS') {
			document.exitFullscreen()
		}else{
			App.canvas.requestFullscreen()
		}
	};

	
	static set3Drotation(): void {
		!App._freezeWorld ? App.freezeWorld() : App.unfreezeWorld()
	}
	
	private static freezeWorld(): void {
		App._freezeWorld = true;
		for(const id in Chars3D.ch){
			if (id !== 'AROUNDGLOBE' && Chars3D.ch[id].paragraph !== null && Chars3D.ch[id].sticky === false) {
				Chars3D.ch[id].paragraph.freezeWorldMatrix()
			}
		}
		App.animateCamera(true);
	}
	
	private static unfreezeWorld(): void {
		App._freezeWorld = false;
		for(const id in Chars3D.ch){
			if (id !== 'AROUNDGLOBE' && Chars3D.ch[id].paragraph !== null && Chars3D.ch[id].sticky === false) {
				Chars3D.ch[id].paragraph.unfreezeWorldMatrix()
			}
		}
	};
	
	/* button click */
	private static animateCamera(pos?: boolean): void {
		const _pos = !pos ? (2 * Math.PI) : 2.5;
		const _frame = !pos ? 120 : 60;

		App.animationCamera.setKeys([{frame:0, value:App.Cam.alpha}, {frame:_frame, value:App.Cam.alpha + _pos}]);
		App.Cam.animations.push(App.animationCamera);
		App.scene.beginAnimation(App.Cam, 0, _frame, false); // true = loop
	};
	
	/* button click */
	private static viewDebugTime(): void {
		if(App.scene.animationsEnabled){
			const _isEnabled = !Chars3D.ch['debuginfo'].plane.isEnabled(false);
			Chars3D.drawEnableOrDisable({enable:_isEnabled,id:'debuginfo'})
		}
	};
	
	/* App background */
	private static createGradientTexture(id: string, enable: boolean, color: string[]): Layer {
		const _layer = new Layer(id, null, App.scene, true),
		bg = new DynamicTexture(id+'dt', 256, App.scene), // 512
		ctx = bg.getContext(),
		gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 256); // 512
		gradient.addColorStop(0, color[0]);
		gradient.addColorStop(1, color[1]);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 256, 256); // 512
		bg.update();
		_layer.texture = bg;
		_layer.isEnabled = enable;
		return _layer
	};

	private static pauseGame(): void {
	  App.engine.stopRenderLoop();
	  App.scene.animationsEnabled = false
	};

	private static runGame(): void {
		App.engine.runRenderLoop(() => {
			App.scene.render()
		});
		App.scene.animationsEnabled = true
	};
	
	static runPauseGame(): void {
		if(App.scene.animationsEnabled){
			App.scene.onBeforeRenderObservable.removeCallback(App.Render);
			Chars3D.drawEnableOrDisable({enable:true, id:'gamepause'});
			setTimeout(()=>{ App.pauseGame() },50)
		} else {
			App.runGame();
			App.scene.onBeforeRenderObservable.add(App.Render);
			Chars3D.drawEnableOrDisable({enable:false, id:'gamepause'})
		}
	}
}