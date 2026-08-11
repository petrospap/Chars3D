import { 
addToScene, 
setParent, 
createTransformNode, 
createStandardMaterial, 
createMeshFromData, 
resizeMeshGeometry,
createGpuPicker, 
disposePicker, 
removeFromScene, 
setMeshVisible,
Texture2D
} from '@babylonjs/lite';

import type{ EngineContext, SceneContext, Mesh } from '@babylonjs/lite';

import {_SETTINGS, log, _color, Performance, hexToColor3, hexToColor4} from './settings.ts';
import {Char3DMaterial} from './Char3DMaterial.ts';
import {AtlasAssemble} from './AtlasAssemble.ts';
import {Atlas} from './AtlasFactory.ts';
import type {IPos, Ixy, IChars, IDrawOptions, IParagraphState, IUpdateData, IEnableOrDisable, ILogTotal, IBoundingBox, IFontData, IG3D, IBlitBuffers, IStats} from './interfaces.ts';


/**
* From Version Alpha > https://playground.babylonjs.com/#X3SVLW#1
* to this!
* Chars3D ts for Babylon Lite: v beta-0.1 BETA with Atlas, bevel, shader, buttons
* Aug 5, 2026 12:00
* LAST building: Babylon Lite v1.18.0
*/

/* helper */
let uids = 1;
//export const uniqueId = (k) => {return k+uids++}; // not used in this version, last used v:0.3
const frameId = () => {return uids++};
const _SIZE: number = _SETTINGS.MASTERSIZE,
_LINEBREAK: number = _SETTINGS.LINEBREAK,
getMeshInfo = (M: Mesh): IBoundingBox|false => {
const min = M.boundMin;
const max = M.boundMax;
	if (!min || !max) {
		return false;
	};
	return {
		min: min,
		max: max,
		x: (max[0] - min[0]) * 0.5,
		y: (max[1] - min[1]) * 0.5,
		z: (max[2] - min[2]) * 0.5,
		extendSize: [
			(min[0] + max[0]) * 0.5,
			(min[1] + max[1]) * 0.5,
			(min[2] + max[2]) * 0.5
		]
	}
};

export class Chars3D{

static _scene: SceneContext;
static _uiscene: SceneContext;
static _engine: EngineContext;
static ch: Record<string, IParagraphState> = {}; /* ch: holds all our chars that we draw in screen */
static texture: Record<string, Texture> = {}; /* holds textures that we have loaded */
static exclude: string[] = ['gamepause', 'debuginfo'];
static excludeStats: string[] = ['runFullScreen','set3Drotation','animateCamera'];
static defaultDiffuseColor: number[] = hexToColor3(_SETTINGS.DIFFUSE_COLOR);
static defaultEmissiveColor: number[] = hexToColor3(_SETTINGS.EMISSIVE_COLOR);
static defaultAmbientColor: number[] = hexToColor3(_SETTINGS.AMBIENT_COLOR);
static defaultSpecularColor: number[] = hexToColor3(_SETTINGS.SPECULAR_COLOR);
static defaultLightColor: number[] = hexToColor3(_SETTINGS.LIGHTCOLOR);

/* optional stats logger */
static logPerformance: Record<string, any> = {};
static total: ILogTotal = { totalfonts: 0, letters2D: 0, letters3D: 0, letters: 0, performance: 0, totalbytes2d: 0, totalbytes3d: 0};

	constructor(scene: SceneContext, uiscene: SceneContext, engine: EngineContext, _fonts: Record<string, IFontData>, _blit: IBlitBuffers, _textures: any, _hasblit: boolean, _hasfont: boolean){

		if(_SETTINGS.debugTime){
			new Performance();
			Chars3D.logPerformance['started'] = new Date()
		};

		Chars3D._scene = scene;
		Chars3D._uiscene = uiscene;
		Chars3D._engine = engine;
		Chars3D.texture = _textures;

		/* Start Atlas and build Fonts */
		new Atlas(_fonts , _blit, _hasblit, _hasfont);

		if(_SETTINGS.debugTime){
			const _t = Performance.end('Chars3D %s: > It took %s ms','Build');
			Chars3D.logPerformance['totalbytes'] = {};
			Chars3D.logPerformance['prebuild'] = {time:_t};
			Chars3D.total.performance += _t;
			Chars3D.total.totalfonts = Atlas.totalFonts;
			Chars3D.total.letters2D = Atlas.letters2D;
			Chars3D.total.letters3D = Atlas.letters3D;
			Chars3D.total.totalbytes2d = Atlas.totalbytes2d;
			Chars3D.total.totalbytes3d = Atlas.totalbytes3d;
		}
	};


	/**
	* replaceButtonText replace ' ' or '^' from text
	* @param {txt}
	*/
	static replaceButtonText(txt: string): string[] {
		const b: string[] = [],
		delimiter: string = txt.includes(_SETTINGS.LETTERLINEBREAK) ? _SETTINGS.LETTERLINEBREAK : _SETTINGS.LETTERLINESPACE;
		txt.split(delimiter).map((x,i) => Array.prototype.push.apply(b, (i+1)%1 ? [x] : [x, delimiter]));
		b.pop();
		return b
	};


/** MANDATORY check and replace when needed
 * @param txt: 			string
 * @param c: interface 	IChars
 * @param LOWERCHARS: 	boolean;
 * @param UPPERCHARS: 	boolean;
 * @param NUMBERS: 		boolean;
 * @param PUNCTUATIONS: boolean;
 * @param SYMBOLS: 		boolean;
*/
	static setUpperLower(txt:string, c: IChars): string {
		if(!c.SYMBOLS){
			if(c.LOWERCHARS && !c.UPPERCHARS){ txt = txt.toLowerCase() };
			if(!c.LOWERCHARS && c.UPPERCHARS){ txt = txt.toUpperCase() };
			if(!c.NUMBERS){ txt = txt.replace(/\d+|^\s+|\s+$/g,'') };
			if(!c.PUNCTUATIONS){ txt = txt.replace(_SETTINGS.regex, ' ') };
		};
		return txt
	};


/** main update
 * @param X: interface IUpdateData
 * @param id: 				string;
 * @param txt?: 			string;
 * @param size?: 			number; // not used
 * @param frontcolor?: 		string;
 * @param sidewallcolor?: 	string;
 * @param backcolor?: 		string;
 * @param diffusecolor?: 	string;
 * @param emissivecolor?: 	string;
 * @param bordercolor?: 	string;
*/
	static update(X: IUpdateData): void {

		const ch = Chars3D.ch[X.id] ?? false;
		/* if we have this object, run update */
		if(ch){
			if (ch.charcode === 'word'){
				console.log('Cannot update buttons!');
				return
			};

			if(_SETTINGS.debugUpdateTime){ new Performance() };

			/* flag */
			let updateText = false,
			hex: number[] = [];

			/* find what keys/values added to update */
			for(let k in X){
				let value = X[k];
				switch(k){
					case 'txt':
						if(ch.font !== _SETTINGS.DEFAULT_FONT){
							const {chars} = Atlas.fonts[ch.font]._info;
							value = Chars3D.setUpperLower(value, chars)
						}
						ch.Len = value.length;
						updateText = true;
					break;

					/*
					// FIXME: does not need to update text, just scale??
					case 'size':
						ch.size = value;
						updateText = true;
					break;

					//FIXME: only change the LAYOUT, not the vertex mapping
					// lineheight, spacing, kern, removed from this update, maybe in other version..
					*/
					case 'frontcolor':
						//const hex: number[] = hexToColor4(value);
						hex = hexToColor4(value);
						ch.material.update(X.id, "uFrontFaceColor", hex)
					break;
					case 'sidewallcolor':
						hex = hexToColor4(value);
						ch.material.update(X.id, "uSideWallColor", hex)
					break;
					case 'backcolor':
						hex = hexToColor4(value);
						ch.material.update(X.id, "uBackFaceColor", hex)
					break;
					case 'bordercolor':
						hex = hexToColor4(value);
						ch.material.update(X.id, "uCornerColor", hex)
					break;
					case 'diffusecolor':
						hex = hexToColor3(value);
						ch.material.update(X.id, "uDiffuseColor", hex)
					break;
					case 'emissivecolor':
						hex = hexToColor3(value);
						ch.material.update(X.id, "uEmissiveColor", hex)
					break;
					case 'ambientcolor':
						hex = hexToColor3(value);
						ch.material.update(X.id, "uAmbientColor", hex)
					break;
					case 'bgcolor':
						hex = hexToColor4(value);
						ch.material.update(X.id, "uBackgroundColor", hex)
					break;
				};
				/* apply value to key */
				ch[k] = value
			};

			/** if updateText need to redrawn all */
			if(updateText){
				/* re build parameters */
				Chars3D.setParameters(true, ch);

				/* Apply new values */
				ch.jit.reallocate(ch.background, ch.border, ch.sizeMightChange);

				/* update text */
				Chars3D.updateParagraph(ch);

				if(_SETTINGS.debugUpdateTime){
					Performance.end('Update %s > It took %s ms',X.id)
				}
			}
		}
	};


/**
 * setData, caclulate parameters from user inputs > interface: IDrawOptions.
 * return IParagraphState.
 * @param X: interface IParagraphState stored in Chars3D.ch, used in ALL draws
 * @param id: 				string;
 * @param txt:				string;
 * @param txtbtn:			string[]|false;
 * @param sticky: 			number|false;
 * @param charcode: 		string;
 * @param font3d: 			number|false;
 * @param bevel: 			number;
 * @param letterpos: 		IPos;
 * @param planepos: 		IPos;
 * @param plane: 			any[]; // TransformNode | Mesh
 * @param font: 			string;
 * @param meta: 			any[]|false;
 * @param size: 			number;
 * @param Len: 				number;
 * @param lineHeightCalc: 	number;
 * @param paragraphwidth: 	number;
 * @param kern: 			number|false;
 * @param spacing: 			number;
 * @param background: 		boolean;
 * @param border: 			boolean;
 * @param padding: 			number[];
 * @param adjustY: 			number;
 * @param adjustX: 			number;
 * @param radius: 			number;
 * @param thickness: 		number;
 * @param paragraph: 		any[];	// Single Mesh
 * @param meshes: 			any[]; 	// Multiple Meshes, i.e buttons
 * @param material: 		any[]; 	// Char3DMaterial
 * @param defaultKern: 		number|false;
 * @param source: 			IBoundingBox|false;
 * @param jit: 				any[]; 	// AtlasAssemble,
 * @param finalWidth: 		number;
 * @param finalHeight: 		number;
 * @param centerXOffset: 	number;
 * @param centerYOffset: 	number;
 * @param lastTextLength: 	number;
 * @param sizeMightChange: 	boolean;
 * @param ascender: 		number;
 * @param descender: 		number;
*/

	private static setData(X: IDrawOptions): IParagraphState|false {
		/* if font is not called, set font to default */
		if(!X.font){
			X.font = _SETTINGS.DEFAULT_FONT
		};

		if(!Atlas.fonts[X.font]){
			log('%cError: font name [%s] not exist',_color.error,X.font);
			return false
		}

		const info = Atlas.fonts[X.font]._info;
		/* set exclude */
		if(X.exclude){
			Chars3D.exclude.push(X.id)
		};

		let _parent: any,
		_size = X.size ?? _SETTINGS.FONT_SIZE,
		_lineheight = (_size * info.lineGap) * (!X.lineheight ? _SETTINGS.LINE_HEIGHT : X.lineheight),
		_planepos = X.planepos ?? {x:0, y:0, z:0},
		_letterpos = X.letterpos ?? {x: 0, y: 0, z: 0},
		_txt = X.font !== _SETTINGS.DEFAULT_FONT ? Chars3D.setUpperLower(X.txt, info.chars) : X.txt,
		_txtbtn = info.charcode === 'word' ? Chars3D.replaceButtonText(_txt) : false,
		_len = !_txtbtn ? _txt.length : _txtbtn.length,
		_diffusecolor = X.diffusecolor ? hexToColor3(X.diffusecolor) : Chars3D.defaultDiffuseColor,
		_emissivecolor = X.emissivecolor ? hexToColor3(X.emissivecolor) : Chars3D.defaultEmissiveColor,
		_ambientcolor = X.ambientcolor ? hexToColor3(X.ambientcolor) : Chars3D.defaultAmbientColor,
		_specularcolor = X.specularcolor ? hexToColor3(X.specularcolor) : Chars3D.defaultSpecularColor,
		_source:any = false,
		_font3D:any = false,
		_sticky = X.sticky ?? false,
		_bevel = 0,
		_frontcolor = hexToColor4(X.frontcolor ?? _SETTINGS.FRONT_COLOR),
		_sidewallcolor = !X.sidewallcolor ? _frontcolor : hexToColor4(X.sidewallcolor),
		_backcolor = !X.backcolor ? _frontcolor : hexToColor4(X.backcolor),
		_background = X.background ?? false,
		_border = X.border ?? false,
		_notenable = (X.notenable || Chars3D.exclude.includes(X.id)) ? false : true,
		_hastexture: boolean,
		_hasbgtexture: boolean,
		_texture: Texture2D,
		_bgtexture: Texture2D;
		
		if(X.texture){
			_hastexture = true;
			_texture = Chars3D.texture[X.texture];
		}else{
			_hastexture = false;
			_texture = Chars3D.texture['empty'];
		};
		
		if(X.bgimage){
			_hasbgtexture = true;
			_bgtexture = Chars3D.texture[X.bgimage];
		}else{
			_hasbgtexture = false;
			_bgtexture = Chars3D.texture['empty'];
		};
		

		if(X.font3d && info.is3d){
			_font3D = X.font3d,
			_bevel = X.bevel ?? 0
		};

		if(!X.parent){
			_parent = createTransformNode(X.id, _planepos.x, _planepos.y, _planepos.z);
			// set position of plane and entire paragraph
			_parent.position.set(_planepos.x, _planepos.y, _planepos.z);
			if(_sticky){
				addToScene(Chars3D._uiscene, _parent)
			}else{
				addToScene(Chars3D._scene, _parent)
			}
		}else{
			_parent = X.parent;
			// set new planepos to parent //
			if(X.planepos){
				_parent.position.set(_planepos.x, _planepos.y, _planepos.z)
			};
			_source = getMeshInfo(_parent)
		};

		setMeshVisible(_parent, _notenable);

		// for lite, need this extra calculation
		const _zita = _parent.position.z * 0.5;
		const _x = (_parent.position.x * 0.5) + _letterpos.x;
		const _y = (_parent.position.y * 0.5) + _letterpos.y;
		const _z = !X.parent ? (_zita + _letterpos.z) : _zita;
		
		return {
			id: X.id,
			txt: _txt,
			txtbtn: _txtbtn,
			sticky: X.sticky ?? false,
			charcode: info.charcode,
			font3d: _font3D, /* depth of 3D */
			bevel: _bevel, /* depth of bevel */
			letterpos: _letterpos,
			planepos: _planepos,
			plane: _parent,
			font: X.font, /* font name only */
			meta: X.meta ?? false, /* callback */
			size: _size,
			Len:  _len, //_txt.length,
			lineHeightCalc: _lineheight,
			paragraphwidth: (X.paragraphwidth && X.paragraphwidth > 0) ? X.paragraphwidth + _letterpos.x : false,
			kern: (!X.kern && !info.kern) ? false : (X.kern ?? 0) + (info.kern ?? 0),
			spacing: X.spacing ?? 0,
			background: _background,
			border: _border,
			padding: X.padding ?? _SETTINGS.PADDING,
			adjustY: X.adjustY ?? _SETTINGS.ADJUST_Y_PADDING,
			adjustX: X.adjustX ?? 0,
			radius: X.bgradius ?? 0,
			thickness: X.bgthickness ?? 0.03,
			paragraph: null,	 /* store merged letters for paragraph */
			meshes:[], 			 /* store meshes Letters/Buttons */
			/* start Shader */
			material: new Char3DMaterial(X.id, {
				hastexture: _hastexture,
				texture: _texture,
				frontcolor: _frontcolor,
				sidewallcolor: _sidewallcolor,
				backcolor: _backcolor,
				ambient: _ambientcolor,
				emissive: _emissivecolor,
				diffuse: _diffusecolor,
				specular: _specularcolor,
				alpha: X.alpha ?? 1.0,
				background: _background,
				hasbgtexture: _hasbgtexture,
				bgtexture: _bgtexture,
				bgcolor: hexToColor4(X.bgcolor ?? _SETTINGS.FRONT_COLOR),
				bordercolor: hexToColor4(X.bordercolor ?? _SETTINGS.FRONT_COLOR),
				disablelight: !X.disablelight ? 0.0 : 1.0,
				empty: Chars3D.texture['empty'] /* MANDATORY to have an empty texture */
			}),
			defaultKern: !info.defaultKern ? false : _txt.length - 1,
			source: _source,  /* parent bounds */
			jit: new AtlasAssemble(), /* start our font BLIT memory asseble */
			finalWidth: 0,
			finalHeight: 0,
			centerXOffset: 0,
			centerYOffset: 0,
			lastTextLength: 0,
			sizeMightChange: true, /* MANDATORY true to build panel for first time */
			ascender: (_size * info.ascender) / info.unitsPerEm,
			descender: (_size * info.descender) / info.unitsPerEm,
			notenable: _notenable,
			//targetCamera:{x:0,y:0,z:0},
			//animationFrameId: 0
			Pos: {x: _x, y: _y, z: _z} /* for Lite only */
		}
	};

/**
 * Chars3D main function to draw text,
 * X: user input options, interface: IDrawOptions
 * @param id: 					string;
 * @param txt: 					string;
 * @param planePos: 			IPos;
 * @param parent?: 				Mesh;
 * @param meta?: 				any[]; // callback
 * @param buttons?: 			boolean; // used only to execute drawButtons() NOTE/FIXME: this is not necessary as we added "txtbtn", remove it!!
 * @param around?: 				boolean; // used only to execute drawAnimation()
 * @param font?: 				string;
 * @param size?: 				number;
 * @param letterpos?: 			IPos;
 * @param kern?: 				number;
 * @param spacing?: 			number;
 * @param lineheight?: 			number;
 * @param paragraphwidth?: 		number;
 * @param font3d?: 				number;
 * @param bevel?: 				number;
 * @param frontcolor?: 			string;
 * @param sidewallcolor?: 		string;
 * @param backcolor?: 			string;
 * @param texture?: 			string;
 * @param emissivecolor?: 		string;
 * @param ambientcolor?: 		string;
 * @param diffusecolor?: 		string;
 * @param specularcolor?:		string;
 * @param alpha?: 				number;
 * @param background?: 			boolean;
 * @param border?: 				boolean;
 * @param bgradius?: 			number;
 * @param padding?: 			number[];
 * @param adjustY?: 			number;
 * @param adjustX?: 			number;
 * @param bgimage?: 			string;
 * @param bgcolor?: 			string;
 * @param bordercolor?: 		string;
 * @param bgthickness?: 		number;
 * @param notenable?: 			boolean;
 * @param sticky?: 				number;
 * @param disablelight?: 		boolean;
 * @param exclude?: 			boolean;
*/
	static draw(X: IDrawOptions): void {
		
		if(_SETTINGS.debugTime){
			new Performance()
		};

		/* dispose if exist this id */
		Chars3D.dispose(X.id);

		/* set and store data */
		const _data = Chars3D.setData(X);
		if(!_data){
			return
		};
		Chars3D.ch[X.id] = _data;
		//Chars3D.ch[X.id] = Chars3D.setData(X);
		const ch = Chars3D.ch[X.id];

		Chars3D.setParameters(false, ch);

		/**
			MANDATORY AtlasAssemble build, set TypedArrays totalP/totalI from the length of this text
			@param hasBackground: boolean,
			@param hasBorder: boolean
		*/
		Chars3D.ch[X.id].jit.build(ch.background, ch.border);
		if(X.buttons){
			Chars3D.drawButtons(ch)
		}else if(X.around){
			Chars3D.drawAnimation(ch)
		}else{
			Chars3D.drawParagraph(ch)
		};

		if(_SETTINGS.debugTime){
			const _t = Performance.end('Draw %s > It took %s ms',X.id);
			if(!Chars3D.excludeStats.includes(X.id)){
				const S: IStats = ch.jit.getAssembledStats();

				Chars3D.logPerformance[X.id] = {
					time:_t,
					len: ch.Len,
					memory: S.memory,
					textv: S.textv,
					textp: S.textp,
					panelv: S.panelv,
					panelp: S.panelp,
					extraMemory: S.extraMemory
				};

				Chars3D.total.letters += ch.Len;
				if(_t > 0){
					Chars3D.total.performance += _t
				}
			}
		}
	};

/**
 * setParameters, pre build TypedArrays for each letter,
 * also caclulate final width/height for background/border
 * @param update: 	boolean	// false = draw, true = update
 * @param P: 		input interface IParagraphState.
*/
	private static setParameters(update: boolean, P: IParagraphState): void {

		const pos: IPos = { ...P.letterpos },
		S = P.size,
		Len = P.Len;

		let i = 0,
		letterspace = 0,
		minX: number = Infinity,
		maxX: number = -Infinity;

		for (; i < Len; i++) {
			const letter = P.txtbtn === false ? P.txt.charCodeAt(i) : P.txtbtn[i];
			const g = Atlas.fonts[P.font][letter];

			if (g) {

				if (_LINEBREAK === letter) {
					pos.y -= P.lineHeightCalc;
					pos.x = P.letterpos.x;
				} else {
					if (g._v !== null) {

						// add source reference to the glyph's binary chunks!
						 P.jit.addSource(letter, {
							P: g.P,
							I: g.I,
							N: g.N,
							U: g.U,
							FID: g.FID,
							L: g.L, //g.P.length,
							IL: g.IL, //g.I.length,
						 });

						/* find minX and maxX */
						const LE = pos.x + (g.bounds.minX * S); // minX = Left Edge
						const RE = pos.x + (g.bounds.maxX * S); // maxX = Right Edge

						// set max/min bounds /
						if (LE < minX) minX = LE;
						if (RE > maxX) maxX = RE
					};

					letterspace = 0;

					/* add default kern */
					if (P.txtbtn === false && P.defaultKern && i < P.defaultKern) {
						const kern = Atlas.fonts[P.font][letter]._k[P.txt.charCodeAt(i + 1)];
						if (kern) letterspace += kern;
					}

					/* add custom kern */
					if (P.kern) {
						letterspace += P.kern
					};

					/* set final letterspace width + custom spacing */
					letterspace += g._w + P.spacing;

					/* apply position.x */
					pos.x += S * letterspace * _SIZE;

					/* set maximum paragraph width */
					if (P.paragraphwidth && pos.x >= P.paragraphwidth) {
						pos.y -= P.lineHeightCalc;
						pos.x = P.letterpos.x
					}
				}
			}
		};

		/* caclulate background panel coordinates */
		if (minX === Infinity) {
			minX = maxX = P.letterpos.x
		};

		const absoluteTop = P.letterpos.y + (P.ascender * S);   // Locked top of line, MaxY
		const absoluteBottom = pos.y + (P.descender * S);       // Locked bottom of line, MinY
		const paragraphHeight = absoluteTop - absoluteBottom;
		const paragraphWidth = maxX - minX;

		P.centerXOffset = (minX + (paragraphWidth * 0.5)) + P.adjustX;
		P.centerYOffset = (absoluteBottom + (paragraphHeight * 0.5)) + P.adjustY;

		P.finalWidth = (paragraphWidth * 0.5) + P.padding[0];
		P.finalHeight = (paragraphHeight * 0.5) + P.padding[1];

		/* if we have an update, check length */
		if (update) {
			P.sizeMightChange = P.lastTextLength !== Len
		};

		/* save text Length for next interaction */
		P.lastTextLength = Len
	};

	/**
	 * draw Buttons
	 * creates independent mesh buttons
	*/
	static drawButtons(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos};
        const btns = !O.txtbtn ? false : [...O.txtbtn];
        if(!btns){
            console.log('Fatal for buttons')
            return
        };
		let i = 0,
		letterspace = 0;

		for (; i < O.Len; i++){
			//const letter = O.txt[i],
			const letter = btns[i],
			g = Atlas.fonts[O.font][letter];
			if (g) {

				/* LINE BREAK used to draw button vertical */
				if (_SETTINGS.LETTERLINEBREAK === letter) {
					pos.y -= O.lineHeightCalc;
					pos.x = O.letterpos.x;
				}else{

					if (g._v !== null) {

						/* calculate background / border bounds */
						const width = g.bounds.rangeX * O.size * _SIZE;
						const height = g.bounds.rangeY * O.size * _SIZE;
						// transform center to World space
						// scale the local center first, then we add the world position
						const worldCX = (g.bounds.centerX * O.size) + pos.x;
						const worldCY = (g.bounds.centerY * O.size) + pos.y;
						O.jit.assembleButton(letter, pos.x, pos.y, pos.z, O.size, O.radius, O.thickness, O.padding, O.background, O.border, width, height, worldCX, worldCY);

						/* create button Mesh */
						const btn = createMeshFromData(
							Chars3D._engine,
							O.id,
							O.jit.P.subarray(0, O.jit.pOffset),
							O.jit.N,
							O.jit.I.subarray(0, O.jit.iOffset),
							O.jit.U.subarray(0, O.jit.vBase * 2),
							undefined, // uvs2
							O.jit.T.subarray(0, O.jit.pOffset),       // Pure Miter steps
							O.jit.FIDCOLOR.subarray(0, O.jit.vBase * 4) // Packed [FID, 0, 0, 1]
						);

						btn.name = letter;

						/* apply Shader */
						O.material.applyMaterial(letter);

						/* apply material */
						btn.material = O.material.material[letter];

						/* set parent */
						setParent(btn, O.plane);
						//setMeshVisible(btn, O.notenable);
						addToScene(Chars3D._uiscene, btn);

						/* store charmesh to use later */
						Chars3D.ch[O.id].meshes.push(btn);
					};

					letterspace = 0;

					/* NO default Kern for SYMBOLS, as we build independent chars!! */
					/* apply position for custom Kern */
					if(O.kern){
						letterspace += O.kern
					};

					/* set position for letter and space */
					letterspace += g._w + O.spacing;
					pos.x += O.size * letterspace * _SIZE
				}
			}
		};

		//O.plane.position.set(O.Pos.x, O.Pos.y, O.Pos.z);
		setMeshVisible(O.plane, true)
	};

	/**
	 draw main Paragraph
	 creates one merged mesh from given text + background or border
	*/
	static drawParagraph(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos};
		let i = 0,
		letterspace = 0;

		for (; i < O.Len; i++){
			const letter = O.txt.charCodeAt(i),
			g = Atlas.fonts[O.font][letter];

			if (g) {
				/* if LINEBREAK reset values, set x,y,lines */
				if (_LINEBREAK === letter) {
					pos.y -= O.lineHeightCalc;
					pos.x = O.letterpos.x;
				} else {
					if (g._v !== null) {
						/* assemble letter */
						!O.font3d ? O.jit.assemble2D(letter, pos.x - O.centerXOffset, pos.y - O.centerYOffset, pos.z, O.size) : O.jit.assemble3D(letter, pos.x - O.centerXOffset, pos.y - O.centerYOffset, pos.z, O.size, O.font3d, O.bevel)
					};

					letterspace = 0;

					/* apply position for default font Kern (if exist) */
					if(O.defaultKern && i < O.defaultKern){
						const kern = Atlas.fonts[O.font][letter]._k[O.txt.charCodeAt(i + 1)];
						if (kern) letterspace += kern
					};

					/* apply position for custom Kern */
					if(O.kern){
						letterspace += O.kern
					};

					/* set position for letter and spacing */
					letterspace += g._w + O.spacing;
					pos.x += O.size * letterspace * _SIZE;

					/* set maximum paragraph width, reset and apply x,y,line for the next letter */
					if(O.paragraphwidth && pos.x >= O.paragraphwidth){
						pos.y -= O.lineHeightCalc;
						pos.x = O.letterpos.x
					}
				}
			}
		};

		/**
		 Since text vertices are centered around (0,0), our background can sit cleanly at (0,0) without moving!
		*/
		O.jit.assemblePanel(0, 0, O.letterpos.z+_SETTINGS.zdepth, O.finalWidth, O.finalHeight, O.radius, O.thickness, O.background, O.border);

		/**
		  finalize structural compilation to draw
		  apply direct flat vertex array views
		*/
		const paragraphMesh = createMeshFromData(
			Chars3D._engine,
			O.id,
			O.jit.P.subarray(0, O.jit.pOffset),
			O.jit.N,
			O.jit.I.subarray(0, O.jit.iOffset),
			O.jit.U.subarray(0, O.jit.vBase * 2),
			undefined, // uvs2
			O.jit.T.subarray(0, O.jit.pOffset),
			O.jit.FIDCOLOR.subarray(0, O.jit.vBase * 4) // Packed [FID, 0, 0, 1]
		);

		/* create ShaderMaterial */
		O.material.applyMaterial(O.id);

		/* apply material */
		paragraphMesh.material = O.material.material[O.id];

		// Lite position
		paragraphMesh.position.set(O.Pos.x, O.Pos.y, O.Pos.z);
		
		/* fixme: pass rotationQuaternion to IDrawOptions */
		if(O.id === 'CHARS3D'){
			paragraphMesh.rotationQuaternion.set(0.37, 0, 0, 1)
		};

		/* place paragraph to plane */
		setParent(paragraphMesh, O.plane);

		/* attach click or any event callback directly to mesh */
		//if (O.meta && O.meta[O.id]) {
		//	paragraphMesh._callback = O.meta[O.id]
		//};

		/* store paragraph for later use */
		Chars3D.ch[O.id].paragraph = paragraphMesh;

		setMeshVisible(paragraphMesh, O.notenable);

		/* experiment sticky */
		if(O.sticky){
			addToScene(Chars3D._uiscene, paragraphMesh)
		}else{
			addToScene(Chars3D._scene, paragraphMesh)
		}
	};


	/** main Paragraph update */
	private static updateParagraph(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos};
		let i = 0,
		letterspace = 0;

		for (; i < O.Len; i++){
			const letter = O.txt.charCodeAt(i),
			g = Atlas.fonts[O.font][letter];

			if (g) {
				/* if LINEBREAK reset values, set x,y,lines */
				if (_LINEBREAK === letter) {
					pos.y -= O.lineHeightCalc;
					pos.x = O.letterpos.x
				} else {
					if (g._v !== null) {
						!O.font3d ? O.jit.assemble2D(letter, pos.x-O.centerXOffset, pos.y-O.centerYOffset, pos.z, O.size) : O.jit.assemble3D(letter, pos.x-O.centerXOffset, pos.y-O.centerYOffset, pos.z, O.size, O.font3d, O.bevel)
					};

					letterspace = 0;
					/* apply position for default font Kern (if exist) */
					if(O.defaultKern && i < O.defaultKern){
						const kern = Atlas.fonts[O.font][letter]._k[O.txt.charCodeAt(i + 1)];
						if (kern) letterspace += kern
					};

					/* apply position for custom Kern */
					if(O.kern){
						letterspace +=  O.kern
					};

					/* set position for letter add spacing, if exist */
					letterspace += g._w + O.spacing;
					pos.x += O.size * letterspace * _SIZE;

					/* set maximum paragraph width, reset and apply x,y,line for the next letter */
					if(O.paragraphwidth && pos.x >= O.paragraphwidth){
						pos.y -= O.lineHeightCalc;
						pos.x = O.letterpos.x
					}
				}
			}
		};

		/* update our background */
		O.jit.assemblePanel(0, 0, O.letterpos.z+_SETTINGS.zdepth, O.finalWidth, O.finalHeight, O.radius, O.thickness, O.background, O.border);

		/* apply position? not in this version for lite, kind tricky */

		/* Finalize update using subarray(), returns a view over the same buffer */
		resizeMeshGeometry(
			Chars3D._engine,
			O.paragraph,
			O.jit.P.subarray(0, O.jit.pOffset),
			O.jit.N.subarray(0, O.jit.pOffset),
			O.jit.I.subarray(0, O.jit.iOffset),
			O.jit.U.subarray(0, O.jit.vBase * 2),
			null, // uvs2
			O.jit.T.subarray(0, O.jit.pOffset),
			O.jit.FIDCOLOR.subarray(0, O.jit.vBase * 4)
		)
	};


	/** simply animation */
	private static drawAnimation(O: IParagraphState): void {
		const Len = O.Len,
		radius = 6, /* orbit radius around parent mesh */

		angleStep: number = (2 * Math.PI) / O.Len; /* evenly spaced */
		let i = 0;
		for (; i < Len; i++) {
			const letter: number = O.txt.charCodeAt(i),
			g = Atlas.fonts[O.font][letter];
			if (g._v) {
				const angle = i * angleStep;
				/* build letter */
				O.jit.assemble2D(letter, radius * Math.cos(angle), O.plane.position.y, radius * Math.sin(angle), O.size)
			}
		};

		/* Create Mesh */
		const anm = createMeshFromData(
			Chars3D._engine,
			O.id,
			O.jit.P.subarray(0, O.jit.pOffset),
			O.jit.N,
			O.jit.I.subarray(0, O.jit.iOffset),
			O.jit.U.subarray(0, O.jit.vBase * 2),
			undefined, // uvs2
			O.jit.T.subarray(0, O.jit.pOffset),
			O.jit.FIDCOLOR.subarray(0, O.jit.vBase * 4)
		);

		anm.position.set(O.Pos.x, O.Pos.y, O.Pos.z);

		/* create ShaderMaterial */
		O.material.applyMaterial(O.id);

		/* apply material to mesh */
		anm.material = O.material.material[O.id];

		/* set parent*/
		//setMeshVisible(anm, O.notenable);
		setParent(anm, O.plane);

		addToScene(Chars3D._scene, anm)

		/* store mesh */
		Chars3D.ch[O.id].paragraph = anm;
	};


	/**
	 * Enable Or Disable text
	 * @param enable: boolean;
	 * @param name: string;
	*/
	static drawEnableOrDisable(X: IEnableOrDisable): void {

		for(const id in Chars3D.ch){
			if(X.id === id){
				if(!X.enable){
					Chars3D.disable(X.id)
					//setMeshVisible(X.id, false)
				}else{
					if(id==='gamepause'){
						Chars3D.disable('debuginfo')
					}
						Chars3D.enable(X.id)
						//setMeshVisible(X.id, true)
					//}
				}
			}else if(!Chars3D.exclude.includes(id)){
				if(Chars3D.excludeStats.includes(id)){
				// do nothing
				}else{
				//!X.enable ? setMeshVisible(id, true) : setMeshVisible(id, false)
				!X.enable ? Chars3D.enable(id) : Chars3D.disable(id)
				}
			}
		}
	};

	static disable(id: string): void {

		const _id = Chars3D.ch[id];
		if(!_id) return

		setMeshVisible(_id.plane, false);
		//paragraphMesh.visible = false;

		if (_id.meshes.length > 0) {
			_id.meshes.forEach(m => {
				//m.visible = false;
				setMeshVisible(m, false);
			})  /* independent Buttons/Letters */
		}else{
			setMeshVisible(_id.paragraph, false)
		}
	};

	static enable(id: string): void {

		const _id = Chars3D.ch[id];
		if(!_id) return;

		setMeshVisible(_id.plane, true)

		if (_id.meshes.length > 0) {
			_id.meshes.forEach(m => {
				setMeshVisible(m, true)
			})  /* independent Buttons/Letters */
		}else{
			setMeshVisible(_id.paragraph, true)
		}
	};


	static dispose(id: string): boolean {

		if (!Chars3D.ch[id]) return false;
		const _scene = !Chars3D.ch[id].sticky ? Chars3D._scene : Chars3D._uiscene;

		Chars3D.ch[id].material.clean(id);
		Chars3D.ch[id].material = null;

		if (Chars3D.ch[id].paragraph !== null) {
			removeFromScene(_scene, Chars3D.ch[id].paragraph); /* Single Mesh */
		}

		if (Chars3D.ch[id].meshes.length > 0) {
			Chars3D.ch[id].meshes.forEach(m => {
				removeFromScene(_scene, m);
			})  /* independent Buttons/Letters */
		};

		removeFromScene(_scene, Chars3D.ch[id].plane);

		// CRITICAL JIT CLEANUP
		Chars3D.ch[id].jit.clean();
		Chars3D.ch[id].jit = null;

		// Delete ch
		delete Chars3D.ch[id];
		return true
	}

}