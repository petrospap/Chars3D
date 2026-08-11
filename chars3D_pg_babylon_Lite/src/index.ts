import {
addToScene,
attachControl,
createArcRotateCamera,
createFreeCamera, // Standard stationary camera helper
enableOrthographicCamera,
registerScene,
startEngine,
stopEngine,
resizeEngine,
createEngine,
createHemisphericLight,
createDirectionalLight,
createSceneContext,
createStandardMaterial,
createBox,
createSphere,
createGround,
setParent,
createGpuPicker,
pickAsync,
onBeforeRender
} from '@babylonjs/lite';
import type {ArcRotateCamera, FreeCamera} from '@babylonjs/lite'; // PickingInfo
import {_SETTINGS, log, _color, Performance, hexToColor4} from './settings.ts';
import {Assets} from './loadAssets.ts';
import {Chars3D} from './char3d.ts';

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
pad = (n: string | number): string => {
const val = typeof n === 'string' ? parseInt(n, 10) : n;
return val < 10 ? '0' + val : '' + val;
},
memoryMB = (bytes: number): string => {
return (bytes / 1024 / 1024).toFixed(2)
};


export class App{
static engine: createEngine;
static scene: createSceneContext;
static UIScene: createSceneContext;
static readonly Cam: ArcRotateCamera;
static readonly UICam: FreeCamera;
static canvas: HTMLCanvasElement;
static tick: number = 0;
static _Date: Date = new Date();
static w: number = 0;
static h: number = 0;
static _width: number = 0;
static _height: number = 0;
static isRunning: boolean = false;
static _score: number = 0;
static Render: () => void; 
static _typewriter: string[] = [];
	constructor() {
        log('%cChars3D for Babylon/lite: [%s] on [%s]', _color.success, 'is started', App._Date);
        // set canvas element
        App.canvas = document.querySelector('#renderCanvas') as HTMLCanvasElement;
        if (!App.canvas) {
            throw new Error("Could not find #renderCanvas element.");
        };
		App.getCanvasWidth();
		App.runEngine()
	};


	static async runEngine(): Promise<void> {

        // Await WebGPU context initialization safely before continuing
        App.engine = await createEngine(App.canvas);

		// CAMERA A: THE MAIN 3D WORLD  Generate Scene Context
		const cameraTarget = { x: 0, y: 4.5, z: 0 };
        App.scene = createSceneContext(App.engine);
        App.scene.clearColor =  { r: 0.05, g: 0.06, b: 0.09, a: 1 };
        const _pi = Math.PI / 2;

		//App.Cam = createArcRotateCamera(-Math.PI / 2, 1.1, 6, { x: 0, y: 0.5, z: 0 });
		App.Cam = createArcRotateCamera(-_pi, _pi, 50, cameraTarget);
		App.scene.camera = App.Cam;
		App.Cam.wheelPrecision = 50;
		App.Cam.nearPlane = 1;
		App.Cam.farPlane = 1000;
		
		attachControl(App.Cam as ArcRotateCamera, App.canvas, App.scene);

		//addToScene(App.scene, createDirectionalLight([0, -1, 1], 0.75));
		addToScene(App.scene, createHemisphericLight([0, 2, 0], 1.0));
		
		// CAMERA B: THE 2D UI OVERLAY SCENE Generate Static Scene Context
		App.UIScene = createSceneContext(App.engine);

		App.UICam = createFreeCamera({ x: 0, y: 0, z: -60 }, { x: 0, y: 0, z: 0 });
		App.UIScene.camera = App.UICam;
		
		//enableOrthographicCamera(App.UICam, { top: 0, bottom: App._height, left: 0, right: App._width });
		//enableOrthographicCamera(App.UICam, { halfHeight:30});

		/* load assets font/textures */
		new Assets(App.engine);
		
		/* Wait for all files to finish loading/decoding */
		Assets.onFinish = async () => {
			new Chars3D(App.scene, App.UIScene, App.engine, Assets._font, Assets._blit, Assets._textures, Assets.hasblit, Assets.hasfont);
			App.initText();
			
			registerScene(App.scene);
			registerScene(App.UIScene);
			
			// Fire off game loop and runtime systems
			await App.runGame();
			App.canvas.focus();
			App.listenToActions();
		}
    };
	
	private static getCanvasWidth(): void {
		
        App.w = (App.canvas.clientWidth * window.devicePixelRatio) | 0;
        App.h = (App.canvas.clientHeight * window.devicePixelRatio) | 0;
		App._width = App.w * 0.01;
		App._height = App.h * 0.01;
		/*
		log('App.w: %s App.h: %s',App.w, App.h);
		log('App._width: %s App._height: %s',App._width, App._height);
		*/

	};


	//private static async initText(): Promise<void>{
	private static initText(): void{
		
		const ground = createGround(App.engine, { width: 32, height: 32 });
		const groundMat = createStandardMaterial();
		ground.position.set(0, 0, 0);
		//groundMat.diffuseColor = [0.2, 0.23, 0.27];
		groundMat.diffuseTexture = Assets._textures['surface'];
		
		ground.material = groundMat;
		addToScene(App.scene, ground);
		
		// Basic paragraph /
	
		Chars3D.draw({
			id: 'PARAGRAPH', 
			txt: `Hello!^Welcome to new Chars3D^An easy? and fast way to create 3D text with Babylon.js OR Three.js..^And with little effort can be used with any other game library!`,
			//txt: `My name is Megara, and even I’m still amazed that I’m a goddess. It’s ironic because ever since I was a child on Earth, I’ve always seen religion as a way to subjugate people. But we’ll get back to that later. If you’re reading this, my plans have probably come to fruition. If my memoirs have been released from the Great Library’s production units, it’s because it has deemed humanity capable of understanding this history (and if not, then at least I had the pleasure of writing them in the first place). But don’t skip to the end! Let’s go over how things have gone so far. As I said, my name is Megara, and I’m about 29,000 years old as I write this (you lose track of a decade or century or two here and there after the first couple of millennia). I’m also the supreme deity of the planet of Illuminaria. However, before achieving this divine status, I was a human, just like you. I wasn’t born on Illuminaria but rather on a planet called Earth in the year 2245 of the local calendar. Earth is (or perhaps I should say "was") located a long haul from Illuminaria, and so I’ve spent much of my life traveling the vast distances of the cosmos. I know all this might seem incomprehensible from your point of view. We’ll start at the beginning so you can better understand my story and your own legacy.`,
			//paragraphwidth: 18, // calculated as the width of paragraph
			//planepos: {x:-7, y:3, z:1},
			//notenable: true,
			letterpos: {x:0, y:2, z:12},
			parent: ground,
			//font: 'testfont',
			size: 0.6,
			texture: 'rothenberg', // BUG, texture not render correctly with "thin" lowercase, flat-topped or rounded characters fonts, the issue is on the UV's in AtlasFactory and in Char3DMaterial > this.texture.wrapV = 1;
			
			background: true,
			
			bgradius: 0.3,
			padding: [2, 2],
			bgimage: 'grunge',
			bgcolor: '#ffffff',
			border:true,
			bordercolor: '#f5eb9b', // green
			//bordercolor:'#5CEAA136', // 5CEAA136
			bgthickness: 0.2,
			//lineheight: 1,
			frontcolor: '#7ae48e',
			//emissivecolor: '#EED509',
			//ambientcolor: '#EED509',
			//diffusecolor: '#7ae48e',
			//specularcolor:'#f5eb9b',
		});
	
		
		const sphere = createSphere(App.engine, { diameter: 4, segments: 32 });
		sphere.position.set(14, 12, 5);
		//sphere.position.set(-20, 0, 0);
		const sphereMat = createStandardMaterial();
		sphereMat.diffuseTexture = Assets._textures['abstract'];
		//sphereMat.diffuseColor = [0.85, 0.34, 0.2];
		sphere.material = sphereMat;
		addToScene(App.scene, sphere);
		Chars3D.draw({
			id: 'AROUNDGLOBE', 
			txt: `A banner around globe..`,
			letterpos: {x:0, y:-6, z:0},
			//letterpos: {x:0, y:1.5, z:0},
			parent: sphere,
			around:true, // MANDATORY to execute drawAnimation
			frontcolor: '#418c35',
			//emissivecolor:'#418c35'
		});
	
		
		/* plain custom text "notenable" */
		Chars3D.draw({
			id: 'gamepause', // MANDATORY
			txt: 'Game Paused', // MANDATORY
			planepos: {x:0, y:2, z:0},
			sticky: 1,
			size:2.6, 
			frontcolor:'#EED509',
			border:true,
			bordercolor: '#ffffff', // 22222260
			padding:[5,1],
			adjustY: -1,
			//emissivecolor:'#ffffff'
			//emissivecolor:'#EED509'
		});

		
		// 3D with bevel
		Chars3D.draw({
			id: 'BABYLON3D', // MANDATORY
			txt: 'Babylon/lite', // MANDATORY LiteJS BabylonJS
			planepos: {x:0, y:2, z:-14}, // MANDATORY
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

		Chars3D.draw({
			id: 'CHARS3D', // MANDATORY
			txt:'CHARS3D', //  MANDATORY
			planepos: {x:0, y:2, z:0}, //{x:8, y:12, z:8}, // MANDATORY
			//letterpos:{x:0, y:0, z:5},
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
		
	/*	
		Chars3D.draw({
			id: 'NOBLIT', 
			txt: 'No Blit Script in PG..^Sorry!',
			planepos: {x:-4, y:12, z:2},
			//font: 'blit',
			size: 1.3,
			background: true,
			bgradius: 0.3,
			padding: [3, 1],
			adjustY: 0,
			bgimage: 'grunge_small',
			bgcolor: '#145e22',
			//kern: 500,
			//spacing: 400,
			lineheight: 1.4,
			frontcolor: '#f53d72',
		});
	*/
	// our pre build font (blit), draws directly and not need to run Atlas functions to build font!!!?
		Chars3D.draw({
			id: 'BLIT', 
			txt: 'Blit Script',
			planepos: {x:-4, y:12, z:2},
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
			frontcolor: '#f53d72'
		});
		
		// simply border /
		Chars3D.draw({
			id: 'BORDER', 
			txt: 'a simply border', 
			font: 'ramborsborder',
			letterpos: {x:-7, y:2.8, z:-2},
			frontcolor: '#E30235',
			emissivecolor: '#6d132d',
			border:true,
			padding:[1.5,1.5],
			adjustY:0.20,
			bordercolor:'#6d132d',
			bgradius: 0.3,
			bgthickness: 0.05
		});

		const box = createBox(App.engine, 2);
		box.position.set(10, 7, -5);
		const boxMat = createStandardMaterial();
		boxMat.diffuseTexture = Assets._textures['wave'];
		//sphereMat.diffuseColor = [0.85, 0.34, 0.2];
		box.material = boxMat;
		
		addToScene(App.scene, box);
		Chars3D.draw({
			id: 'TIME', 
			font: 'timedigital7',
			//txt: 'TIME: 00:00:00', // you should add always the highest letters?
			txt: `TIME: ${pad(App._Date.getHours())}:${pad(App._Date.getMinutes())}:${pad(App._Date.getSeconds())}`,
			//planepos: {x:2, y:1, z:-10}, // since we have a parent, we don't need to set a planepos, except if we need to set NEW pos on parent

			letterpos: {x:0, y:1.5, z:0},
			parent: box,
			//texture: 'rothenberg',
			size:0.9,
			kern: 50,
			frontcolor: '#5CB7EAEB',
			border: true,
			padding:[1,0.5], // padding[0] = left/right, padding[1] = top/bottom
			bgthickness: 0.03,
			//bgradius:0.2,
			bordercolor:'#5CEAA136'
		});

		Chars3D.draw({
			id: 'FPS', 
			txt: 'FPS: 00',
			letterpos: {x: App._width, y: -App._height, z:0},
			font: 'kenneypixel',
			kern: 100,
			size: 1.3,
			sticky: 1,
			frontcolor:'#e5165f',
			//emissivecolor:'#ffffff'
		});
		
		Chars3D.draw({
			id: 'INFO', 
			txt: 'Hello Babylon lite!',
			letterpos: {x:-App._width, y:App._height, z:0},
			font: 'kenneypixel',
			kern: 150,
			size: 1.3,
			sticky: 1,
			frontcolor:'#e5165f'
		});
		

		// BUTTONS
		const buttonPosX = (App._width * 2) - 0.5;
		const buttonPosYHorizontal = (App._height * 2) + 2;
		Chars3D.draw({
			id: 'Buttons', 
			font: 'designiconsbtn',
			// vertical
			//planepos: {x:App._width, y:5, z:0},
			letterpos: {x:buttonPosX, y:5, z:0},
			txt: !_SETTINGS.debugTime ? 'power_settings_new^electric_bolt^_3d_rotation^fullscreen' : 'power_settings_new^electric_bolt^_3d_rotation^fullscreen^stacks',
			// horizontal
			/*
			letterpos: {x:-7.2, y: -buttonPosYHorizontal, z:0}, 
			txt: !_SETTINGS.debugTime ? 'power_settings_new electric_bolt _3d_rotation fullscreen' : 'power_settings_new electric_bolt _3d_rotation fullscreen stacks',
			*/
		
			// examples from other fonts
			//txt: !_SETTINGS.debugTime ? 'house circle-play' : 'house circle-play circle-stop', // < Fontawesome
			//txt: !_SETTINGS.debugTime ? 'a b' : 'a b c', // < any font
			meta: { "power_settings_new": App.runPauseGame, "electric_bolt": App.animateCamera, "_3d_rotation": App.set3Drotation, "fullscreen": App.runFullScreen, "stacks": App.viewDebugTime }, 
			buttons: true, // MANDATORY to execute drawButtons
			sticky:1, // experiment, how far in front of camera
			exclude:true, // exclude to enable/disable, mesh is always is visible
			size:0.8,
			kern: 600,
			spacing: 800,
			lineheight: 1.6,
			frontcolor: '#ffffff',
			background: true,
			border:true,
			bordercolor: '#222222',
			bgcolor:'#216696', // set alpha in backgroundcolor to have opacity 21669680
			padding:[2.2, 1.8],
			//bgradius: 0.3,
		});
		
		Chars3D.draw({
			id: 'SCORE', 
			planepos: {x:-22, y:10, z:4},
			// OR
			//letterpos: {x:-App._width, y:-App._height, z:-2},  
			//sticky:1,
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
			bgcolor:'#fafafa',

			bgradius: 0.2,
			border: true, // NOTE: border image takes value from "texture"
			bgimage: 'milad', // ONLY FOR background, not for border
			bgthickness: 0.02,
			//bgradius:0.5,
			bordercolor:'#ffffff', // 5CEAA136
		});
		
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
		// tests
			setTimeout(()=> {
				Chars3D.update({id:'PARAGRAPH', 
				txt: 'what next?'
				//txt: `My name is Megara, and even I’m still amazed that I’m a goddess. It’s ironic because ever since I was a child on Earth, I’ve always seen religion as a way to subjugate people. But we’ll get back to that later. If you’re reading this, my plans have probably come to fruition. If my memoirs have been released from the Great Library’s production units, it’s because it has deemed humanity capable of understanding this history (and if not, then at least I had the pleasure of writing them in the first place). But don’t skip to the end! Let’s go over how things have gone so far. As I said, my name is Megara, and I’m about 29,000 years old as I write this (you lose track of a decade or century or two here and there after the first couple of millennia). I’m also the supreme deity of the planet of Illuminaria. However, before achieving this divine status, I was a human, just like you. I wasn’t born on Illuminaria but rather on a planet called Earth in the year 2245 of the local calendar. Earth is (or perhaps I should say "was") located a long haul from Illuminaria, and so I’ve spent much of my life traveling the vast distances of the cosmos. I know all this might seem incomprehensible from your point of view. We’ll start at the beginning so you can better understand my story and your own legacy.`,
			});
			//Chars3D.dispose('FPS')
			}, 10000)
		*/

	};
	
	private static listenToActions(): void {
		
        window.addEventListener("resize", () => {
			App.getCanvasWidth();
			resizeEngine(App.engine);
        });
		
		
		document.body.addEventListener("keydown", (e) => {
			switch (e.key) {
				case 'f':
					App.runFullScreen();
				break;
				case 'p':
					App.runPauseGame();
				break;
				case 'v':
					App.viewDebugTime();
				break;
				case 's':
					App.createScreenshot();
				break;
			}
		});
		
		/*
		// semi working, i don't know why not get hit
		const picker = createGpuPicker(App.scene);
		App.canvas.addEventListener('pointerdown', async (e) => {
			log('pointerup offsetX: %s offsetY: %s',e.offsetX, e.offsetY);

			const info = await pickAsync(picker, e.offsetX, e.offsetY);
			log('info',info);
			if(info.hit === true){
				const n = info.pickedMesh.name;
				const hitMesh = Chars3D.ch[n].meta;
				if (n && typeof hitMesh[n] === 'function') {
					hitMesh[n]();

				}
			}
		});
		*/
		const uipicker = createGpuPicker(App.UIScene);
		//disposePicker(picker);

		// click-to-pick buttons ONLY.
		App.canvas.addEventListener('pointerdown', async (e) => {
			const UIinfo = await pickAsync(uipicker, e.offsetX, e.offsetY);
			if(UIinfo.hit === true && UIinfo.pickedMesh && UIinfo.pickedMesh.parent){
				const un = UIinfo.pickedMesh.name;
				//log('UIinfo.pickedMesh.parent.name,',UIinfo.pickedMesh.parent.name); // why complain about name??
				const hitMeshUI = Chars3D.ch[UIinfo.pickedMesh.parent.name].meta;
				if (un && hitMeshUI && typeof hitMeshUI[un] === 'function') {
					hitMeshUI[un]();
					if('power_settings_new' !== un){
						App.newScore()
					}
				}
			}
		})
	};
	

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
				text += `Total 2D letters: [${Chars3D.total.letters2D}]${br}Total 3D letters: [${Chars3D.total.letters3D}]${br}time took to build: ${v.time} ms${br}${br}Draws:${br}${br}`
			}else{
				const textMemory = memoryMB(v.memory),
				extra = memoryMB(v.extraMemory),
				hasextra = extra > 0 ? ` EXTRA MEMORY for Lite: ${extra} MB` : ``,
				panel = v.panelv === 0 ? `` : ` Background[ Triangles: ${v.panelp}, Vertices: ${v.panelv} ]`;
				text += `${ids}) ID: ${id} > It took ${v.time} ms, Chars: ${v.len}, Memory: ${textMemory} MB, Triangles: ${v.textp}, Vertices: ${v.textv}. ${panel}${hasextra}${br}`
				ids++;
			}
		};

		return text
	};
/*
	private static pauseGame(): void {
	  stopEngine(App.engine)
	  App.isRunning = false
	};
*/

	/* text click */
	private static newScore(): void {
		App._score++;

		Chars3D.update( {
			id: 'SCORE', 
			txt: `SCORE: [${App._score}]`
		})
	};
	
	
    private static async _wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
    };
	
	private static async _removeAction(ms: number): Promise<boolean> {
	  await App._wait(ms);
	  return true
	};

	private static async Notify(_id:string, text:string, time?:number): Promise<void> {
		const timeToRemove: number = time ?? 4e3;
		if(App._typewriter.length > 0){

			App._typewriter.forEach((item) => {
				if(item!==_id){
					Chars3D.disable(item);
					//Chars3D.dispose(item)
					//App._typewriter = App._typewriter.filter(v => v !== item);
				}
			})
		};
		

		if(App._typewriter.includes(_id)){
			if(Chars3D.ch[_id].paragraph.visible === true){
				// if clicked and is visible
				return
			};
			
			if(Chars3D.ch[_id].Len === text.length){
				// if is same text
				Chars3D.enable(_id)
			}else{
				// update with new text
				Chars3D.update({id: _id, txt: text})
				//Chars3D.dispose(_id);
				//App.drawNotify(_id, text);
			}
			
		}else{
			// new notify, add it to holder
			App._typewriter.push(_id);
			const _paragraphpos = text.length * 0.1;
			const _posx = App._width - _paragraphpos;
			
			Chars3D.draw({	
				id: _id, 
				txt: text,
				letterpos: {x:_posx, y:App._height, z:0},
				//letterpos: {x:App._width, y:App._height, z:0},
				//size: 1.2,
				background: true,
				bgradius: 0.3,
				padding: [2, 1],
				bgcolor: '#ffffff',
				sticky:1,
				frontcolor:'#e5165f'
			})
		};

		await App._removeAction(timeToRemove);
		Chars3D.disable(_id);
		//Chars3D.dispose(_id);
		//App._typewriter = App._typewriter.filter(v => v !== _id);
	};
	
	
	/* button click */
	private static runFullScreen(){
		App.Notify('runFullScreen', 'Todo: fullscreen!')
	};
	
	private static viewDebugTime(){
		if(App.isRunning){
			const _isEnabled = Chars3D.ch['debuginfo'].plane.visible === false ? true:false;
			Chars3D.drawEnableOrDisable({enable:_isEnabled, id:'debuginfo'})
		}
	};

	private static set3Drotation(): void {
		App.Notify('set3Drotation', 'Todo: billboard!')
	};

	private static animateCamera(): void {
		App.Notify('animateCamera', 'Todo: animations!')
	};
	
	private static createScreenshot(): HTMLImageElement {
		App.canvas.toBlob((blob) => {
			const _time = new Date(),
			url = URL.createObjectURL(blob),
			a = document.createElement('a');
			a.download = `Charc3D-capture-${_time.toISOString()}.webp`;
			a.href = url;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			//a.remove()
		}, 'image/webp'); //'image/webp','image/png'
	};
	

    private static async runPauseGame(): Promise<void> {
		if(App.isRunning){
			Chars3D.drawEnableOrDisable({enable:true, id:'gamepause'});
			await App._removeAction(100);
			stopEngine(App.engine)
			App.isRunning = false;
		} else {
			await App.runGame();
			Chars3D.drawEnableOrDisable({enable:false, id:'gamepause'})
		}
    };

    private static async runGame(): Promise<void> {
        App.isRunning = true;
        await startEngine(App.engine)
		App.RenderAnimations()
    };
	
	 private static RenderAnimations():void{

		const step = [1, 3, 0.050], /* timer steps, seconds/ms between updates (1 is every second) */
		elapsed = [0, 0, 0]; /* accumulated time */
		
		let index  = 0, /* current position in array */
		frames = 0,
		elapsedLen = elapsed.length,
		lenValue = GRADIENT.gradients.length, /* animation color */
		prevTime: number = performance.now();
		//sphereAxis = new Vector3(Math.sin(23 * Math.PI/180), Math.cos(23 * Math.PI/180), 0); /* animation rotate */

		onBeforeRender(App.scene, (deltaMs) => {
			/* set time tick once, can be used across APP */
			App.tick = deltaMs / 1000;
			
			/* pass time to elapsed */
			for (let i = 0; i < elapsedLen; ++i) {
				elapsed[i] += App.tick
			};
			
			//sphere.rotate(sphereAxis, 0.005, 0);
			
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
			
			if (elapsed[1] >= step[1]) {
				elapsed[1] = 0;
				Chars3D.update({id: 'PARAGRAPH', frontcolor: GRADIENT.gradients[index]});
				index = (index + 1) % lenValue
			};
			

			if(Chars3D.ch['FPS']){
				frames++;
				const time = performance.now();
				if (time >= prevTime + 1000) {
					const fps = Math.round((frames * 1000) / (time - prevTime));
					Chars3D.update({
						id: 'FPS', 
						txt: 'FPS: '+fps.toFixed()
					})
					frames = 0;
					prevTime = time
				}
			};
			
			/** IEffect
			 * plasmaUpdate
			 * @param id: string
			 * @param tick: number
			 * @param speed?: number
			 * @param intensity?: number
			 * @param effect: number // choose effect Type, there two effects 0 >'uEffect1', 1 > uEffect2 
			**/
			
			/*
			Need fix: you don't need to pass animations here manual!! 
			create registration and onBeforeRender on Char3DMaterial, add new holders into, 
			interface IDrawOptions > tick|speed|intensity|effect, execute then directly from paragraph 
			*/
			Chars3D.ch['CHARS3D'].material.plasmaUpdate({
				id: 'CHARS3D',
				tick: App.tick,
				speed: 1.2,
				intensity: 0.6,
				effect: 0 //'uEffect1'
			});
			
			Chars3D.ch['BABYLON3D'].material.plasmaUpdate({
				id: 'BABYLON3D',
				tick: App.tick,
				speed: 1.5,
				intensity: 0.4,
				effect: 1 //'uEffect2'
			})
		})
	 }
}