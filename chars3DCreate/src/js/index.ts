import { Engine, Scene, Camera, ArcRotateCamera, HemisphericLight, StandardMaterial, Vector3, Color3, Color4, Layer, GlowLayer, Texture, DynamicTexture, KeyboardEventTypes, AssetsManager} from '@babylonjs/core';
import {UI, logger, GRADIENT} from './UI';
import {Assets} from './loadAssets';
import {Chars3D} from './chars3d';
import {Atlas} from './AtlasFactoryCreate';
import {BinaryEncode} from './binaryEncode';
import opentype from 'opentype.js';


export class App{

static engine: Engine;
static scene: Scene;
static Cam: ArcRotateCamera;
static canvas: HTMLCanvasElement;
static _sidebar: HTMLElement;
static _act: HTMLElement;
static _range: HTMLElement;
static _actions: HTMLElement;
static tempGlyph: Record<string, any> = {};
static _Date: Date = new Date();

	constructor(){
		logger.log('%cChars3D: is started, on [%s]',logger.color.success,App._Date);

		App.canvas = document.querySelector('#renderCanvas');

		App.engine = new Engine(App.canvas, true);

		App.scene = new Scene(App.engine);
		App.scene.ambientColor = new Color3(1.0, 1.0, 1.0);
		App.scene.clearColor = new Color3(0, 0, 0);

		App._width = App.engine.getRenderWidth();
		App._height = App.engine.getRenderHeight();

		App.Cam = new ArcRotateCamera('arc-camera', Math.PI / 2, Math.PI / 2, 30, new Vector3(0, 0, 0), App.scene);

		App.Cam.wheelPrecision = 50;
        App.Cam.attachControl(App.canvas, true);

		const light = new HemisphericLight('light', new Vector3(0, 0, 0), App.scene),
		glow = new GlowLayer('glow', App.scene);
		light.intensity = 0.6; //1.2;
		//light.diffuse = new Color3(0, 0, 0);
		//light.specular = new Color3(1, 1, 1);
		glow.intensity = 0.9;

		// start Assets
		new Assets(App.scene);
		Assets.getFontNames();

		//Assets._manager.onFinish = async () => {
		Assets._manager.onFinish = () => {
			new Chars3D(Assets._textures, App.scene);
			UI.BuildUI(Assets._fontnames);
			App.init();
			App.runGame();
			App.canvas.focus();
			App.listenOnevents();
			Assets._manager.reset();
		}
	};

	static listenOnevents(): void {
		App._sidebar = document.getElementById('mainSidebar');
		App._act = App._sidebar.querySelectorAll('.act');
		App._range = App._sidebar.querySelectorAll('.range');
		App._actions = App._sidebar.querySelector('#act');

		// change file name
		const _exportName = App._sidebar.querySelector('#EXPORTNAME');
		App._sidebar.querySelector('#FILENAME').addEventListener('change', (e) => {
			//Chars3D.disposeAll(['INFO_TXT']);
			if(e.target.value !== '' && e.target.value.includes('.')){
				const val = e.target.value.split('.');
				_exportName.value = val[0].replace(UI.textpun, '').toLowerCase()
			};
			Chars3D.update({id:'INFO_TXT', txt:`Font to build.. [${e.target.value}]`, frontcolor:'#ffffff'});
			Chars3D.drawEnableOrDisable({enable:true, id:'INFO_TXT'})
		});

		// switch checkbox's when symbols checked
		const _switch = App._sidebar.querySelectorAll('.switch');
		App._sidebar.querySelector('#SYMBOLS').addEventListener('change', (e) => {
			_switch.forEach(S => {
				S.checked = e.target.checked ?  false :true
			})
		});

		// set text on range change
		App._range.forEach(R => {
			const _i = R.querySelector(`#${R.dataset.id}_INFO`);
			R.querySelector(`#${R.dataset.id}`).addEventListener('input', (e) => { _i.textContent = e.target.value })
		});

		// listen on submit
		App._actions.addEventListener('click', (e) => { App.listenOnSubmit(e) });

		// close side bar
		App._sidebar.querySelector('#close').addEventListener('click', (e) => { App._sidebar.classList.remove('on') });

		// basic engine resize
		window.addEventListener('resize', () => { App.engine.resize() })
	};

	static openCloseSidebar(): void {
		App._sidebar.classList.contains('on') ? App._sidebar.classList.remove('on') : App._sidebar.classList.add('on');
	};
	
	static openCloselog(): void {
		if(logger._useHtml){
			logger.container.classList.contains('on') ? logger.container.classList.remove('on') : logger.container.classList.add('on');
		}
	};


	static init(): void{

		const _layer = new Layer('bglayer', '', App.scene, true);
		_layer.texture = App.createGradientTexture(GRADIENT.purple);

		Chars3D.draw({
			id: 'WELCOME', // MANDATORY
			txt: !Assets._fontnames.length ? 'Please add some Font files in public/fonts' : 'Welcome, to Chars 3D..^Press "o" to start build a new Char3D!^Press "s" to take screenshot^Press "l" to view logs', //  MANDATORY
			planepos: {x:0, y:0, z:4}, // MANDATORY
			font: UI.DEFAULT_FONT,
			//frontcolor: '#b62d2d', //'#B5E61DC7',
			outline: true,
			outlinewidth:0.03,
			outlineColor: '#111111',
			emissivecolor:'#f52b0a'
		});

		Chars3D.draw({
			id: 'INFO_TXT', // MANDATORY
			txt: 'a', //  MANDATORY
			planepos: {x:0, y:0, z:6}, // MANDATORY
			font: UI.DEFAULT_FONT,
			frontcolor: '#f52b0a',
			outline: true,
			outlinewidth:0.1,
			outlinecolor: '#666666',
			notenable: true
		});


		App.scene.onKeyboardObservable.add((e) => {
			switch (e.type) {
				case KeyboardEventTypes.KEYDOWN:
					switch (e.event.key) {
						//case 'p': App.runPauseGame(); break;
						case 'l': App.openCloselog(); break;
						case 'o': App.openCloseSidebar(); break;
						case '0': App.#downloadAtlas();break;
						case '1': App.#downloadBinary();break;
						case '2': App.#downloadJson();break;
						case '3': App.#downloadInfo();break;
						case '4': App.#downloadJavascript();break;
						case 's': App.#createScreenshot();
						//Tools.CreateScreenshot(App.engine, App.Cam, {precision: 1.0});
						break;
					}
				break
			}
		})
	};
	
	static #createScreenshot(): HTMLImageElement {
		
		App.scene.render();
		const exportname = UI._EXPORTNAME;
		
		App.canvas.toBlob((blob) => {
			const _time = new Date(),
			url = URL.createObjectURL(blob),
			a = document.createElement('a');
			a.download = exportname === 'default' ? `Charc3D-capture-${_time.toISOString()}.png` : `${exportname}-${_time.toISOString()}.png`;
			a.href = url;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			//a.remove()
		}, 'image/png'); //'image/webp'
	}


	static listenOnSubmit(event): void {

		if(event.target.type === 'submit'){
			UI.BUILDED = false;

			App._act.forEach(el => {
				let v: any; //= boolean | number/float | string;
				if(el.type === 'checkbox'){
					v = el.checked;
				}else if(el.type === 'select-one'){
					v = !el.value.length ? false : el.value
				}else if(el.type === 'number' || el.type === 'range'){
					// valueAsNumber returns a real number or NaN, supporting floats/minus
					v = isNaN(el.valueAsNumber) ? 0 : el.valueAsNumber;
				}else{
					v = !el.value.length ? false : el.value.trim()
				};

				//logger.log('inputs id: %s type: %s v: %s',el.id, el.type, v);
				switch(el.id){
					// text
					case 'EXPORTNAME': if(v){UI.EXPORTNAME = v}; break;
					// select text
					case 'FILENAME': UI.FILENAME = v; break;
					// booleans
					case 'IS3D': UI.IS3D = v; break;
					case 'LOWERCHARS': UI.LOWERCHARS = v; break;
					case 'UPPERCHARS': UI.UPPERCHARS = v; break;
					case 'NUMBERS': UI.NUMBERS = v; break;
					case 'PUNCTUATION': UI.PUNCTUATION = v; break;
					case 'SYMBOLS': UI.SYMBOLS = v;break;
					case 'SPECIFIC_LETTERS': UI.SPECIFIC_LETTERS = v; break;
					case 'GET_CHAR_NAMES': UI.GET_CHAR_NAMES = v; break;
					case 'USE_DEFAULT_KERN': UI.USE_DEFAULT_KERN = v; break;
					case 'USE_MINIFY': UI.USE_MINIFY = v; break;
					// text
					case '_LOWERCHARS': UI._LOWERCHARS = v??''; break;
					case '_UPPERCHARS': UI._UPPERCHARS = v??''; break;
					case '_NUMBERS': UI._NUMBERS = v??''; break;
					case '_PUNCTUATION': UI._PUNCTUATION = v??''; break; // .replace(UI.textpun, '')
					case '_SYMBOLS': UI._SYMBOLS = v??''; break;
					case '_SPECIFIC_LETTERS': UI._SPECIFIC_LETTERS = v??''; break;
					// number/float
					case 'KERN': UI.KERN = v; break;
					case 'SPACING': UI.SPACING = v; break;
					case 'LINE_HEIGHT': UI.LINE_HEIGHT = v; break;
				}
			});

			if(!UI.FILENAME){

				Chars3D.update({id:'INFO_TXT', txt:'Error: Please select a font!', frontcolor: '#f52b0a'});
				Chars3D.drawEnableOrDisable({enable:true, id:'INFO_TXT', visibletime:5000});

			}else{

				// initialize and update data
				UI.initialize();

				// load fonts
				if( UI.LOADFILE != UI.FILENAME ){

					// sanitize UI.FILENAME here? reject if false
					UI.LOADFILE = UI.FILENAME;
					Assets.getFont(UI.EXPORTNAME, UI.FILENAME);

					//Assets._manager.onFinish = async () => {
					Assets._manager.onFinish = () => {
						Assets._manager.reset();
						const opentypeFont = opentype.parse(Assets._font);
						if(!opentypeFont.supported){
							Chars3D.update({id:'INFO_TXT', txt:`Error: Font [${UI.FILENAME}] not supported..`, frontcolor: '#f52b0a'});
							Chars3D.drawEnableOrDisable({enable:true, id:'INFO_TXT', visibletime:5000})
						};

						Chars3D.Build(opentypeFont),
						App.DrawNew();
					}
				}else{
					Chars3D.Build(),
					App.DrawNew();
				}
			}
		}
	};

	static DrawNew() {

		if(UI.BUILDED === false){
			Chars3D.update({id:'INFO_TXT', txt:`Error: cannot build font [${UI.FILENAME}]`, frontcolor: '#f52b0a'});
			// add debug log!!
			return
		};
		Chars3D.disposeAll();

		if(!UI.GET_CHAR_NAMES){

			UI.CHARS.pop(); // first LETTERLINEBREAK
			UI.CHARS.shift(); // last LETTERSPACE

			// add New Element if is more of 30 chars
			const _CHARS = (Chars3D.totalchars > 30) ? App.#addNewElement('^', 26, UI.CHARS) : UI.CHARS;
			const allchars =  App.#joinChars(_CHARS);
			//logger.log('_CHARS',_CHARS);
			//logger.log('allchars',allchars);

			Chars3D.draw({
				id: 'CHARS2D', // MANDATORY
				txt: allchars, //  MANDATORY
				planepos: {x:0, y:0, z:5}, // MANDATORY
				size: 0.5,
				emissivecolor:'#0aebee'
			});

			if(UI.IS3D){
				Chars3D.draw({
					id: 'CHARS3D', // MANDATORY
					//txt: ['language', 'stadia_controller', 'vpn_key', 'sports_score'],
					txt: allchars, //  MANDATORY
					planepos: {x:0, y:0, z:-5}, // MANDATORY
					font3d: 0.2, // depth of 3d,
					//bevel: 0.05, // bevel NOT EXIST in this version
					frontcolor: '#b62d2d',
					sidewallcolor: '#de6161',
					backcolor: '#000000',
					size:0.5
				})
			}

			if(UI.SPECIFIC_LETTERS){

				Chars3D.draw({
					id: 'SPECIFIC_A', // MANDATORY
					txt: 'SPECIFIC LETTERS TO DOWNLOAD', //  MANDATORY
					planepos: {x:12, y:-4, z:0}, // MANDATORY
					font: UI.DEFAULT_FONT,
					outline: true,
					size: 0.5,
					emissivecolor:'#f52b0a'
				});

				Chars3D.draw({
					id: 'SPECIFIC_B', // MANDATORY
					txt: UI._SPECIFIC_LETTERS, //  MANDATORY
					planepos: {x:12, y:-5.5, z:0}, // MANDATORY
					outline: true,
					size: 0.5,
					emissivecolor:'#f52b0a'
				})

				if(UI.IS3D){
					Chars3D.draw({
						id: 'SPECIFIC_C', // MANDATORY
						//txt: ['language', 'stadia_controller', 'vpn_key', 'sports_score'],
						txt: UI._SPECIFIC_LETTERS, //  MANDATORY
						planepos: {x:12, y:-7, z:0}, // MANDATORY
						font3d: 0.2, // depth of 3d,
						//bevel: 0.05, // bevel NOT EXIST in this version
						frontcolor: '#b62d2d',
						sidewallcolor: '#de6161',
						backcolor: '#000000',
						size:0.5
					})
				}
			};

			let _info = `Font Information${UI.LETTERLINEBREAK}Export name [${UI.EXPORTNAME}]${UI.LETTERLINEBREAK}`;
			for(let [k,v] of Object.entries(Chars3D.glyphs._info)){
				if(k !== 'chars'){
					if(k === 'created'){ v = new Date(v) };
					_info += `${k}: ${v}${UI.LETTERLINEBREAK}`
				}else{
					for(let [c,i] of Object.entries(v)){
						_info += `${c}: ${i}${UI.LETTERLINEBREAK}`
					}
				}
			};

			Chars3D.draw({
				id: 'INFO', // MANDATORY
				txt: _info, //  MANDATORY
				planepos: {x:10, y:3, z:5}, // MANDATORY
				font: UI.DEFAULT_FONT,
				outline: true,
				outlinewidth:0.02,
				outlineColor: '#111111',
				size: 0.3,
				emissivecolor:'#8a0a2e'
			});

			Chars3D.draw({
				id: 'ACTIONS', // MANDATORY
				txt: `Press Zero (0) to download font for Atlas, As Binary${UI.LETTERLINEBREAK}Press (1) to download plain Binary${UI.LETTERLINEBREAK}Press (2) to download font as json${UI.LETTERLINEBREAK}Press (3) to download json information${UI.LETTERLINEBREAK}Press (4) to download font as JavaScript import${UI.LETTERLINEBREAK}Press (s) to take Screenshot`, //  MANDATORY
				planepos: {x:-12, y:5, z:5}, // MANDATORY
				font: UI.DEFAULT_FONT,
				outline: true,
				outlinewidth:0.02,
				outlineColor: '#111111',
				size: 0.3,
				emissivecolor:'#6c7971'
			})

		}else{

			const chose = !UI.SYMBOLS ? `letter` : `symbol`;

			Chars3D.draw({
				id: 'CHARNAMES', // MANDATORY
				txt: `Press (3) to download ${chose} names for [${UI.EXPORTNAME}]`, //  MANDATORY
				planepos: {x:0, y:0, z:20}, // MANDATORY
				font: UI.DEFAULT_FONT,
				outline: true,
				outlinewidth:0.02, // max outlinewidth 0.1 Default 0.01
				outlinecolor: '#087F3A',
				size: 0.35,
				emissivecolor:'#367E7F'
			})
		};
		

		/*
		const getmesh = App.scene.meshes;
		const meshlen = getmesh.length;
		for (let i = 0; i < meshlen; i++) {
			logger.log('mesh id? %s',getmesh[i].id);
		}
		*/
	};
	

	static #joinChars(ch:string[]): string {
		let chars: string = ``,
		total = ch.length,
		last: number = total - 1;

		for (let i = 0; i < total; i++) {
			//chars += (i===last) ? ch[i] : ch[i]+UI.LETTERSPACE
			chars += (ch[i] === UI.LETTERLINEBREAK || i===last) ? ch[i] : ch[i]+UI.LETTERSPACE
		};
		return chars
	};

	static #getRandomElement(total: number, len: number): string[] {
		const NC: string[] = [];
		for (let i = 0; i < total; i++) {
			NC.push(UI.CHARS[~~(Math.random() * len)])
		};
		return NC
	};

	static #addNewElement(el: string, pos: number, arr: string[]): string[] {
		const NE: string[] = [];
		arr.map((x,i) => Array.prototype.push.apply(NE, (i+1)%pos ? [x] : [x, el]));
		return NE
	};


	static #buildCustomChars(asJson: boolean = true) {
		// Always reset
		App.tempGlyph = {};

		const info = Chars3D.glyphs._info;
		const isSymbols = info.chars.SYMBOLS;

		const _linebreak = !isSymbols ? UI.LINEBREAK : UI.LETTERLINEBREAK;
		const _linespace = !isSymbols ? UI.LINESPACE : UI.LETTERSPACE;

		// Add essential formatting chars
		if (Chars3D.glyphs[_linebreak]) {
			App.tempGlyph[_linebreak] = Chars3D.glyphs[_linebreak]
		};

		if (Chars3D.glyphs[_linespace]) {
			App.tempGlyph[_linespace] = Chars3D.glyphs[_linespace]
		};

		const buildlen = UI._SPECIFIC_LETTERS.length;
		let i = 0;
		for (; i < buildlen; i++) {
			const char = UI._SPECIFIC_LETTERS[i];
			const key = !isSymbols ? char.charCodeAt(0).toString() : char;

			// CRITICAL: Only add if the glyph actually exists in our source
			if (Chars3D.glyphs[key]) {
				//logger.log('buildCustomChars: letter: %s charCodeAt: %s',char,key);
				App.tempGlyph[key] = Chars3D.glyphs[key];
			} else {
				console.warn(`Glyph for ${char} (key: ${key}) not found in font.`);
			}
		};

		App.tempGlyph['_info'] = info;

		return asJson ? JSON.stringify(App.tempGlyph) : App.tempGlyph;
	};

	static async #downloadAtlas(){
		if (UI.GET_CHAR_NAMES || !UI.BUILDED) return;

		try {
			const rawData = !UI.SPECIFIC_LETTERS ? Chars3D.glyphs : App.#buildCustomChars(false);

			// THE DAMN COPY DATA
			// Deep clone  object using native structuredClone
			const data = structuredClone(rawData);

			// Start Atlas and build letters
			new Atlas(data);

			// Compile unified memory slabs
			const packageData = await Atlas.buildMegaAtlas();

			// Encode arrays and fire download link
			Atlas.encodeAndDownload(UI.EXPORTNAME, packageData);
			//data = null;

		} catch (e) {
			console.error('Atlas build failed:', e);
		}
	};

	static #downloadBinary() {

		// check if we have builded chars, add log if not!!?
		if (UI.GET_CHAR_NAMES || !UI.BUILDED) return;

		// prepare data
		const rawData = !UI.SPECIFIC_LETTERS ? Chars3D.glyphs : App.#buildCustomChars(false);

		try {
			const data = structuredClone(rawData);
			const buffer = BinaryEncode.encode(data);
			const blob = new Blob([buffer], { type: 'application/octet-stream' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');

			a.href = url;
			a.download = `${UI.EXPORTNAME}.bin`;
			document.body.appendChild(a);
			a.click();
			// a.remove()
			setTimeout(() => {
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			}, 1)
		} catch (e) {
			console.error('Binary encoding failed:', e);
		}
	};


	static #downloadJavascript() {
		if(UI.GET_CHAR_NAMES || !UI.BUILDED){ return };
		const rawData = !UI.SPECIFIC_LETTERS ? JSON.stringify(Chars3D.glyphs) : App.#buildCustomChars(),
		data = structuredClone(rawData),
		DJ = `export const ${UI.EXPORTNAME} = ${data}`,
		a = document.createElement('a'),
		FF = new Blob([DJ], { type: 'text/javascript' }),
		url = URL.createObjectURL(FF);

		a.href = url; //URL.createObjectURL(FF);
		a.download = UI.EXPORTNAME+'.js';
		document.body.appendChild(a);
		a.click();
		//a.remove()
		setTimeout(() => {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 1);


	};

	static #downloadJson() {
		if(UI.GET_CHAR_NAMES || !UI.BUILDED){ return };
		const rawData = !UI.SPECIFIC_LETTERS ? JSON.stringify(Chars3D.glyphs) : App.#buildCustomChars(),
		DF = structuredClone(rawData),
		a = document.createElement('a'),
		FF = new Blob([DF], { type: 'application/json' }),
		url = URL.createObjectURL(FF);
		a.href = url;
		a.download = UI.EXPORTNAME+'.json';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 1);

	};

	static #downloadInfo(){
		if(!UI.BUILDED){ return };
		const DI = !UI.GET_CHAR_NAMES ? JSON.stringify(Chars3D._font) : JSON.stringify(Chars3D.CHARNAMES),
		//DI = structuredClone(rawData),
		_filename = !UI.GET_CHAR_NAMES ? `_info` : !UI.SYMBOLS ? `_names` : `_symbols`,
		a = document.createElement('a'),
		FI = new Blob([DI], { type: 'application/json' }),
		url =  URL.createObjectURL(FI);

		a.href = url;
		a.download = UI.EXPORTNAME+_filename+'.json';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 1);
	};

	static runFullScreen(){
		if (document.fullscreenElement?.nodeName === "CANVAS") {
		  document.exitFullscreen()
		} else {
		  App.canvas.requestFullscreen()
		}
	};

	static createGradientTexture(color: string[]): DynamicTexture {
		const texture = new DynamicTexture('gradientTexture', 256, App.scene),
		context = texture.getContext(),
		gradient = context.createRadialGradient(128, 128, 0, 128, 128, 256);
		gradient.addColorStop(0, color[0]);
		gradient.addColorStop(1, color[1]);
		context.fillStyle = gradient;
		context.fillRect(0, 0, 256, 256);
		texture.update();
		return texture
	};


	static pauseGame(): void {
	  App.engine.stopRenderLoop();
	  App.scene.animationsEnabled = false
	};

	static runGame(): void  {
		App.engine.runRenderLoop(() =>{
			App.scene.render()
		});

		App.scene.animationsEnabled = true
	};

	static runPauseGame(): void {
		if(App.scene.animationsEnabled){
			setTimeout(()=>{App.pauseGame()},200)
		}else{
			App.runGame()
		}
	}

}