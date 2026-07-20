import { WebGLRenderer, PerspectiveCamera, Scene, BoxGeometry, SphereGeometry, Mesh, MeshBasicMaterial, Object3D, Color, Vector3, Raycaster, Vector2, Timer} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {_SETTINGS, Color3, Color4} from './settings.ts';
import {Assets} from './loadAssets.ts';
import {Chars3D} from './char3d.ts';


// V:0.0.1 for Three
export class App{

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
static _score: number = 0;
static mesh: Mesh;
//static animationsEnabled: boolean = true;
static isPaused: boolean = false;
static clock = new Timer();

//static readonly step = [1, 3, 0.050, 0.001]; /* timer steps, seconds/ms between updates (1 is every second) */
static elapsed = [0, 0, 0, 0]; /* accumulated time */



// click 
static pointer = new Vector2();
static raycaster = new Raycaster();

	constructor(){
		App.clock.connect(document);
		App.canvas = document.querySelector('#renderCanvas');
		App._width = parseInt(window.getComputedStyle(App.canvas).width);
		App._height = parseInt(window.getComputedStyle(App.canvas).height);
		
		App.camera = new PerspectiveCamera( 120, App._width / App._height, 0.1, 10000 );

		App.camera.position.z = 3;
		App.scene = new Scene();

		App.scene.background = new Color(0xf53d72);
		App.renderer = new WebGLRenderer( { antialias: true, canvas: App.canvas, setFaceCulling: false} );
		App.renderer.setSize(App._width, App._height);

		
		App.renderer.setPixelRatio(window.devicePixelRatio);
		App.controls = new OrbitControls(App.camera, App.canvas);
		
		App.controls.enableDamping = true;
		App.controls.dampingFactor = 0.05; // Lower values = smoother, slide-like feel (0.01 to 0.1)

		App.controls.rotateSpeed = 2.0;
		App.controls.zoomSpeed = 2.2;
		App.controls.panSpeed = 0.5;


		App.controls.screenSpacePanning = true;

		App.controls.target.set( 0, 0, 1 );
		//App.controls.update();
		
		/* Start and load assets */
		new Assets(App.scene);
			
		/* Wait for all files to finish loading/decoding */
		Assets.onFinish = async () => {
			// start Chars3D
			new Chars3D(App.scene, App.camera, Assets._font, Assets._blit, Assets._textures, Assets.hasblit, Assets.hasfont);
			App.init();
			App.renderer.setAnimationLoop(App.animate);
		}
	};
	
	static init(){
		
		// Basic paragraph's
		Chars3D.draw({
			id: 'PARAGRAPH', 
			txt: 'Welcome to Chars3D',
			planepos: {x:-10, y:0, z:-2},
			frontcolor: '#22B14C', //'#f53d72'
			font3d: 0.3, // depth
			background: true,
			bgradius: 0.3,
			padding: [3, 3],
			bgimage: 'fractal',
			bgcolor: '#cccccc',
			//lineheight: 1.2,
		});
		
	
		// test update
/*	
		setTimeout(()=> {
			console.log('update!')
			Chars3D.update({id:'PARAGRAPH', frontcolor: '#ffffff'});
			//Chars3D.update({id:'PARAGRAPH', txt: 'What App we are going to build?'});
			//Chars3D.dispose('PARAGRAPH');
		}, 5000)
		
*/

		// simply score on click
		Chars3D.draw({
			id: 'SCORE', 
			planepos: {x:0, y:-2, z:-4},
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
	
	/* text click */
	static newScore(): void {
		App._score++;
		Chars3D.update( {
			id: 'SCORE', 
			txt: `SCORE: [${App._score}]`
		})
	};
	
/*
	static runPauseGame(): void {
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
*/

	private static animate(time:number): void {
		// Keep the loop running, but bypass data updates if paused
		App.clock.update(time);
		App.tick = App.clock.getDelta();

		if (!App.isPaused) {
			/* pass time to elapsed */
			//for (let i = 0; i < App.elapsed.length; ++i) {
			//	App.elapsed[i] += App.tick
			//};
			App.render()
		}
	};


    private static render():void {
		
		//Chars3D.plasmaUpdate('CHARS3D', App.tick, 1.8);

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