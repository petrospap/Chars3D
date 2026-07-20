import { WebGLRenderer, PerspectiveCamera, Scene, BoxGeometry, SphereGeometry, Mesh, MeshBasicMaterial, Object3D, Color, Vector3, Raycaster, Vector2, Timer} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {_SETTINGS, Color3, Color4, log, _color, Performance} from './settings.ts';
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
pad = (n: string|number): number => {return n < 10 ? '0' + n : n},
memoryMB = (bytes: number): number =>{return (bytes / 1024 / 1024).toFixed(2)};

// V:0.0.1 for Three
export class App{
static width: number;
static height: number;
static _width: number;
static _height: number;
static canvas: HTMLCanvasElement;
static scene: Scene;
static renderer: WebGLRenderer;
static camera: PerspectiveCamera;
static material: MeshBasicMaterial;
static controls: OrbitControls;
static geometry: BoxGeometry;
static tick: number = 0;
//static Animate: () => void;
static _Date: Date = new Date();
static _score: number = 0;
static mesh: Mesh;
//static animationsEnabled: boolean = true;
static isPaused : boolean = false;
//static AnimationFrame: requestAnimationFrame;
static clock = new Timer();

/* 
* Animation timers setup, example for update
*/
static readonly step = [1, 3, 0.050, 0.001]; /* timer steps, seconds/ms between updates (1 is every second) */
static elapsed = [0, 0, 0, 0]; /* accumulated time */

static index = 0; /* current position in array */
//static lenValue = GRADIENT.gradients.length; /* animation color */
static sphereAxis = new Vector3(Math.sin(23 * Math.PI/180), Math.cos(23 * Math.PI/180), 0).normalize(); /* animation rotate */
static frames: number = 0;
static prevTime: number = performance.now();
static _sphere: Mesh;

// click 
static pointer = new Vector2();
static raycaster = new Raycaster();

	constructor(){
		App.clock.connect(document);
		App.canvas = document.querySelector('#renderCanvas');
		//App._width = window.innerWidth, 
		//App._height = window.innerHeight;
		App._width = parseInt(window.getComputedStyle(App.canvas).width);
		App._height = parseInt(window.getComputedStyle(App.canvas).height);
		
		App.width = App._width / 2 / 100;
		App.height = App._height / 2 / 100;


		App.camera = new PerspectiveCamera( 120, App._width / App._height, 0.1, 10000 );

		App.camera.position.z = 3;
		App.scene = new Scene();

		App.scene.background = new Color(0x6c7971);
		App.renderer = new WebGLRenderer( { antialias: true, canvas: App.canvas, setFaceCulling: false} );
		App.renderer.setSize(App._width, App._height);
		// App.renderer.InfoMemory
		// App.renderer.InfoRender
		
		App.renderer.setPixelRatio(window.devicePixelRatio);

/*
    renderer.setSize(sceneSize.width, sceneSize.height);
    renderer.sortObjects = true
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.gammaFactor = 2.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
*/
		
		App.controls = new OrbitControls(App.camera, App.canvas);
		
		App.controls.enableDamping = true;
		App.controls.dampingFactor = 0.05; // Lower values = smoother, slide-like feel (0.01 to 0.1)

		App.controls.rotateSpeed = 2.0;
		App.controls.zoomSpeed = 2.2;
		App.controls.panSpeed = 0.5;


		App.controls.screenSpacePanning = true;

		App.controls.target.set( 0, 0, 1 ); // 0, 0, 0 
		//App.controls.update();
		
		new Assets(App.scene);
			
		/* Wait for all files to finish decoding */
		Assets.onFinish = async () => {
			// start Chars3D
			new Chars3D(App.scene, App.camera, Assets._font, Assets._blit, Assets._textures, Assets.hasblit, Assets.hasfont);

			App.init();
			window.addEventListener('resize', App.windowResize, false);
			App.renderer.setAnimationLoop(App.animate);
		
		}
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

	
	static init(){
		
		Chars3D.draw({
			id:'gamepause', // MANDATORY
			txt:'Game Paused', // MANDATORY
			letterpos: {x:0, y:1, z:0},
			notenable: true,
			sticky: 6,
			size:1.2, 
			frontcolor:'#EED509',
			border:true,
			bordercolor: '#22222260'
			//emissivecolor:'#EED509'
		});
		
		
		Chars3D.draw({
			id: 'THREE3D', // MANDATORY
			txt: `Threejs`, // MANDATORY
			planepos: {x:8, y:-4, z:8}, // MANDATORY
			font: 'b3d_',
			font3d: 0.9, // depth
			bevel:0.5,
			//kern:50,
			spacing: 50,
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
			txt:`CHARS3D`, //  MANDATORY
			planepos: {x:-4, y:4, z:-6}, // MANDATORY
			font: 'bebasbin',
			font3d: 0.8, // depth
			//bevel:0.8,
			//kern:300,
			frontcolor: '#0DDE07',
			sidewallcolor: '#ffffff',
			backcolor: '#25e516',
			texture: 'goldencrack',
			size: 1.8,
			//disablelight: true
		});
		
		// a pre build font, draws directly and not need to run Atlas functions to build font!!!
		Chars3D.draw({
			id: 'BLIT', 
			txt: `Blit Script`,
			planepos: {x:-16, y:8, z:-6},
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
			//size: 1.3,
			background: true,
			bgradius: 0.3,
			padding: [3, 3],

			bgimage: 'grunge',
			bgcolor: '#cccccc',//'#cccccc',
			lineheight: 1.1,
			frontcolor: '#f53d72', // f53d72 aaf5ef 145e22
			//outline: false, //  does not working if has a background, reason, text and background/border is one mesh
		});
		
		// test update
		/*
		setTimeout(()=> {
			Chars3D.update({id:'PARAGRAPH', txt: 'update? 12324'});
		}, 5000)
		*/

	
		// simply border /
		Chars3D.draw({
			id: 'BORDER', 
			txt: 'a simply border', 
			font: 'ramborsborder',
			planepos: {x:-4, y:-10, z:-12},
			frontcolor: '#E30235',
			emissivecolor: '#6d132d',
			border:true,
			padding:[1.5,1.5],
			bordercolor:'#6d132d',
			bgradius: 0.3,
			bgthickness: 0.05,
			outline: true,
			outlinedepth: 0.5,
			outlinecolor: '#6D253E'
		});
		

		/** 
		* simply sticky
		* to make sticky work, MUST be set ONLY letterpos, this is the ABSOLUTE position of text in 3D world
		* not perfect, need to catch and apply position on resize??
		*/
		Chars3D.draw({
			id: 'FPS', 
			txt: 'FPS: 00',
			letterpos: {x:5.3, y:4, z:-1},
			font: 'kenneypixel',
			kern: 100,
			size: 0.8,
			sticky: 6,
			frontcolor:'#e5165f',
			outline: true,
			outlinedepth: 0.2,
			outlinecolor: '#111111',
			//emissivecolor:'#ffffff'
		});
	
		Chars3D.draw({
			id: 'INFO', 
			txt: 'Hello Three js!',
			letterpos: {x:-7, y:4, z:-1},
			font: 'kenneypixel',
			//kern: 500,
			//spacing: 200,
			size: 0.9,
			sticky: 6,
			frontcolor:'#e5165f',
			outline: true,
			outlinedepth: 0.2,
			outlinecolor: '#111111'
		});
		
		
		// create a Box
		const boxgeometry = new BoxGeometry(2.0, 2.0, 0.1);
		const boxmaterial = new MeshBasicMaterial({map:Assets._textures.wave});
		const box = new Mesh(boxgeometry, boxmaterial);
		box.name = 'box';
		box.position.set(20, 10, -10);
		
		// draw text parent to Box
		Chars3D.draw({
			id: 'TIME', 
			font: 'timedigital7',
			txt: `TIME: ${pad(App._Date.getHours())}:${pad(App._Date.getMinutes())}:${pad(App._Date.getSeconds())}`,
			//planepos: {x:20, y:10, z:-10},
			letterpos: {x:0, y:2.5, z:0},
			parent: box,
			size:0.9,
			lineheight: 1.3,
			kern: 50,
			frontcolor: '#5CB7EAEB',
			border: true,
			padding:[1,1],
			adjustX:0.08,
			adjustY:0.10,
			bgthickness: 0.03,
			//bgradius:0.2,
			bordercolor:'#5CEAA136',
			outline: true,
			outlinedepth: 0.5,
			outlinecolor: '#216696'
		});
		
		/*
		setTimeout(()=> {
			Chars3D.update({id:'INFO', txt: 'info need an image^next to text?'});
		}, 5000)
		*/
		
		// Extra: text position and Animation
		const sphereGeometry = new SphereGeometry(1.5, 60, 24);
		const sphereMaterial = new MeshBasicMaterial({map:Assets._textures.abstract});
		App._sphere = new Mesh(sphereGeometry, sphereMaterial);
		App._sphere.name = 'sphere';
		App._sphere.position.set(-14, 0, 0);
		
		// a simply Animation around sphere /
		Chars3D.draw({
			id: 'AROUNDGLOBE', 
			txt: `A banner around globe..`, 
			//planepos: {x:-18, y:0, z:0},
			parent: App._sphere,
			around:true, // MANDATORY to execute drawAnimation
			frontcolor: '#418c35',
			billboard:0,
			//emissivecolor:'#418c35'
		});
		
		
		// BUTTONS
		Chars3D.draw({
			id: 'Buttons', 
			font: 'designiconsbtn',
			// vertical
			letterpos: {x: 15, y: 5, z:0},
			txt: !_SETTINGS.debugTime ? 'power_settings_new^electric_bolt^_3d_rotation^fullscreen' : 'power_settings_new^electric_bolt^_3d_rotation^fullscreen^stacks',

			// horizontal
			//letterpos: {x:-9, y:-App.height-3, z:0}, 
			//txt: !_SETTINGS.debugTime ? 'power_settings_new electric_bolt _3d_rotation fullscreen' : 'power_settings_new electric_bolt _3d_rotation fullscreen stacks',

			// examples from other fonts
			//txt: !_SETTINGS.debugTime ? 'house circle-play' : 'house circle-play circle-stop', // < Fontawesome
			//txt: !_SETTINGS.debugTime ? 'a b' : 'a b c', // < any font
			meta: { power_settings_new: App.runPauseGame, electric_bolt: App.animateCamera, _3d_rotation: App.set3Drotation, fullscreen: App.runFullScreen, stacks: App.viewDebugTime }, 
			buttons: true, // MANDATORY to execute drawButtons
			sticky: 8, // experiment, how far in front of camera
			exclude:true, // exclude to enable/disable, mesh is always is visible
			//billboard: 0,
			size:0.6,
			kern: 800,
			spacing: 1400,
			lineheight: 3.2,
			frontcolor: '#ffffff',
			background: true,
			border: false,
			//border:true,
			bordercolor: '#222222',
			bgcolor:'#216696', // set alpha in backgroundcolor to have opacity 216696
			bgimage: 'btngreen',
			//bgpadding:[2.2, 2.0],
			padding:[2.2, 2.0],
			adjustX: 0.080,
			adjustY: 0,
			//bgradius: 0.3, // not need as image is rounded
		});

		// simply score on click
		Chars3D.draw({
			id: 'SCORE', 
			planepos: {x:22, y:-7, z:-4},
			letterpos:{x:8, y:1, z:0},
			font:'oxbscore',
			txt: 'SCORE: [0]',
			kern: 100,
			spacing: 0,
			lineheight: 1.5,
			meta: { SCORE: App.newScore },
			//spacing: 0.5,
			size: 0.8,
			font3d: 0.1, // depth
			//bevel: 0.1,
			texture: 'rothenberg',
			frontcolor: '#999999',
			sidewallcolor: '#fafafa', 
			background: true,
			bgcolor:'#CC9D74',
			bgradius: 0.2,
			border: true,
			bgimage: 'milad',
			bgthickness: 0.02,
			bordercolor:'#ffffff'
		});
		

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
				size: 0.8, 
				frontcolor:'#ffffff',
				notenable: true
			})
			// setTimeout used just to catch the above timing!
			setTimeout(()=> {
				const finaldebugText = App.debugInfo();
				Chars3D.update({id:'debuginfo', txt: finaldebugText});
			}, 250)
		};


		document.body.addEventListener('keydown', (e) => {
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

		/**
		* NOT happy with this, sometimes click not responce!!
		*/
		window.addEventListener('pointerdown', (e) => {

			App.pointer.x = (e.clientX / App._width) * 2 - 1;
			App.pointer.y = -(e.clientY / App._height) * 2 + 1;
			
			// align tracking raycaster vector path with the active camera perspective
			App.raycaster.setFromCamera(App.pointer, App.camera);

			// scan the scene layout graph children for ray intersections
			// pass true to recursively scan down into Object3D/Group nested trees
			const intersects = App.raycaster.intersectObjects(App.scene.children, true);

			if (intersects.length > 0) {
				// grab the closest targeted mesh element hit by the picker beam
				//const hitMesh = intersects[0].object as any;
				const hitMesh = intersects[0].object;

				// direct execution of Mesh's custom callback metadata
				if (hitMesh && typeof hitMesh._callback === 'function') {
					console.log(`Clicked mesh ID: ${hitMesh.name}`);
					
					// execute the attached callback function passing the mesh reference back
					hitMesh._callback(hitMesh); 
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
	
	
	static windowResize(): void {
		App._width = parseInt(window.getComputedStyle(App.canvas).width);
		App._height = parseInt(window.getComputedStyle(App.canvas).height);

		App.camera.aspect = App._width / App._height;
		App.camera.updateProjectionMatrix();

		App.renderer.setSize( window.innerWidth, window.innerHeight )
	};
	
	/* text click */
	static newScore(): void {
		App._score++;
		Chars3D.update( {
			id: 'SCORE', 
			txt: `SCORE: [${App._score}]`
		})
	};
	
	static runFullScreen(){
		log('runFullScreen')
	}


	static createScreenshot(): HTMLImageElement {
		App.render();
		App.renderer.domElement.toBlob((blob) => {
			const _time = new Date(),
			url = URL.createObjectURL(blob),
			a = document.createElement('a');
			a.download = `Charc3D-capture-${_time.toISOString()}.png`;
			a.href = url;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			//a.remove()
		}, 'image/png'); //'image/webp'

	}
	
	
	static set3Drotation(): void{
		log('set 3Drotation called');
	}
	
	static animateCamera(): void {
		log('animate Camera called');
	}
	
	/* button click */
	private static viewDebugTime(): void {
		if(!App.isPaused){
			const _isEnabled = (Chars3D.ch['debuginfo'].plane.visible === true) ?  false : true;
			Chars3D.drawEnableOrDisable({enable:_isEnabled,id:'debuginfo'})
		}
	};

	static runPauseGame(): void {
		//App.isPaused = !App.isPaused ? true : false;
		if(!App.isPaused){
			Chars3D.drawEnableOrDisable({enable:true, id:'gamepause'});
			setTimeout(()=>{ 
			App.isPaused = true
			},50)
			
		}else{
			App.isPaused = false;
			Chars3D.drawEnableOrDisable({enable:false, id:'gamepause'})
			
		}
	};
	
	private static animate(time:number): void {
		// Keep the loop running, but bypass data updates if paused
		App.clock.update(time);
		App.tick = App.clock.getDelta();
		//App.tick = App.clock.getDelta() / 1000;

		if (!App.isPaused) {
			/* pass time to elapsed */
			for (let i = 0; i < App.elapsed.length; ++i) {
				App.elapsed[i] += App.tick
			};
			App.render()
		}
	};


    private static render():void {
		
		Chars3D.plasmaUpdate('CHARS3D', App.tick, 1.8);
		App._sphere.rotateOnAxis(App.sphereAxis, 0.005);
		
		/* step[0] has set to update time every 1 sec */
		if (App.elapsed[0] >= App.step[0]) {
			const _t = new Date(),
			s = _t.getSeconds(),
			h = _t.getHours(),
			m = _t.getMinutes();
			App.elapsed[0] = 0;
		
			Chars3D.update( {
				id: 'TIME', 
				txt: `TIME: ${pad(h)}:${pad(m)}:${pad(s)}`
			})
			
		};
		
		/* Color animation every 3 sec */
		if (App.elapsed[1] >= App.step[1]) {
			App.elapsed[1] = 0;
			Chars3D.update({id:'PARAGRAPH', frontcolor: GRADIENT.gradients[App.index]});
			App.index = (App.index + 1) % GRADIENT.gradients.length //lenValue;
		};
		
		/* FPS */
		if(Chars3D.ch['FPS']){
			App.frames++;
			const time = performance.now();
			if (time >= App.prevTime + 1000) {
				const fps = Math.round((App.frames * 1000) / (time - App.prevTime));
				Chars3D.update({
					id: 'FPS', 
					txt: 'FPS: '+fps.toFixed()
				})
				App.frames = 0;
				App.prevTime = time
			}
		};


		// SET BILLBOARD
		for (const [id, ch] of Object.entries(Chars3D.ch)) {
			const {billboard, plane, targetCamera} = ch;
			// BILLBOARD MODE = 7
			if (id && billboard === 7) {
				plane.quaternion.copy(App.camera.quaternion);
				//paragraph.quaternion.copy(App.camera.quaternion);
			};
			// BILLBOARD MODE = 2
			if (id && billboard === 2) {
				targetCamera.set(App.camera.position.x, plane.position.y, App.camera.position.z);
				paragraph.lookAt(targetCamera)
			}
		};

		App.renderer.render(App.scene, App.camera)

    }

}