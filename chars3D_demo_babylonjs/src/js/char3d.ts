import { StandardMaterial, Mesh, Texture, Color3, Color4, TransformNode, ActionManager, ExecuteCodeAction} from '@babylonjs/core';
import {_SETTINGS, log, _color, Performance} from './settings.ts';
import {Char3DMaterial} from './Char3DMaterial.ts';
import {AtlasAssemble} from './AtlasAssemble.ts';
import {Atlas} from './AtlasFactory.ts';
import type {IAddAction, IPos, Ixy, IChars, IMaterial, IDrawOptions, IParagraphState, IUpdateData, IUpdateButton, IEnableOrDisable, ILogTotal, IBoundingBox, IG3D, IBlitBuffers, IStats} from './interfaces.ts';

/**
* From Version 0.1 Alpha > https://playground.babylonjs.com/#X3SVLW#1
* to this!
* Chars3D ts:v 7.8 with Atlas, bevel, shader, buttons, hover
* Video demo: https://youtu.be/HOq4Ne5q9xc
* Jul 8, 2026 12:00
*/

/* helper */
const _SIZE: number = _SETTINGS.MASTERSIZE,
_LINEBREAK: number = _SETTINGS.LINEBREAK,
getMeshInfo = (B: any): IBoundingBox => {
	return {
		x: B.maximum.x - B.minimum.x,
		y: B.maximum.y - B.minimum.y,
		z: B.maximum.z - B.minimum.z,
		m: B._worldMatrix
	}
};


export class Chars3D{

static _scene;
static _cam;
static ch: Record<string, IParagraphState> = {}; /* ch: holds all our chars that we draw in screen */
static texture: Record<string, Texture> = {}; /* holds textures that we have loaded */
static exclude: string[] = ['gamepause', 'debuginfo'];
static defaultDiffuseColor: Color3 = Color3.FromHexString(_SETTINGS.DIFFUSE_COLOR);
static defaultEmissiveColor: Color3 = Color3.FromHexString(_SETTINGS.EMISSIVE_COLOR);
static defaultAmbientColor: Color3 = Color3.FromHexString(_SETTINGS.AMBIENT_COLOR);
static defaultSpecularColor: Color3 = Color3.FromHexString(_SETTINGS.SPECULAR_COLOR);
static defaultLightColor: Color3 = Color3.FromHexString(_SETTINGS.LIGHTCOLOR);

/* optional stats logger */
static logPerformance: Record<string, any> = {};
static total: ILogTotal = { totalfonts: 0, letters2D: 0, letters3D: 0, letters: 0, performance: 0, totalbytes2d: 0, totalbytes3d: 0};

	constructor(scene:Scene, _fonts: IG3D, _blit: IBlitBuffers, _textures: Texture, _hasblit: boolean, _hasfont: boolean){

		if(_SETTINGS.debugTime){
			new Performance();
			Chars3D.logPerformance['started'] = new Date()
		};

		Chars3D._scene = scene;
		Chars3D._cam = scene.activeCamera;
		Chars3D.texture = _textures;
		/**
		 // clear stored effects
		 Chars3D._scene.getEngine().releaseEffects();
		*/

		/* Start Atlas and build Fonts */
		new Atlas(_fonts , _blit, _hasblit, _hasfont);
		//_blit = null;
		//_fonts = null;
		//_textures = null;

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
			
			//Chars3D.savePerformance('totalbytes',0);
			//Chars3D.savePerformance('prebuild',_t)
		}
/*		
v 7.7 Last test:		
Chars3D Build: > It took 8 ms
Draw gamepause > It took 3 ms
Draw BABYLON3D > It took 3 ms
Draw CHARS3D > It took 2 ms
Draw BLIT > It took 1 ms
Draw PARAGRAPH > It took 1 ms
Draw BORDER > It took 1 ms
Draw FPS > It took 1 ms
Draw INFO > It took 0 ms
Draw TIME > It took 1 ms
Draw AROUNDGLOBE > It took 0 ms
Draw Buttons > It took 1 ms
Draw SCORE > It took 1 ms
Draw debuginfo > It took 5 ms
*/
	};
/*
	static savePerformance(id: string, t: number, len?: number, m?:number, p?:number): void {
		Chars3D.logPerformance[id] = {
			time:t,
			len: len??0,
			memory: m??0,
			panelmemory: p??0
		}
		if(t > 0){
			Chars3D.total.performance += t
		}
	};
	*/
	/** add action Manager for click or hover 
	* @param type: string; 
	* @param id: string;
	* @param M: Mesh;
	*/
	private static addAction(X:IAddAction){

		X.M.actionManager = new ActionManager(Chars3D._scene);
		X.M.actionManager.isRecursive = true;
		X.M.actionManager.registerAction(new ExecuteCodeAction({trigger: ActionManager.OnPickTrigger}, () => {
			if (typeof X.M._callback === 'function') { 
				X.M._callback(); // Execute the callback 
			}
		}));
		
		if(X.type==='button'){
			/* hover effect, need fix to apply also color on click */
			X.M.actionManager.registerAction(new ExecuteCodeAction({trigger: ActionManager.OnPointerOverTrigger}, () => {
				Chars3D.updateButton({id:X.id, hoverbg: X.M.name, color:'#26B509'})
			}));
			
			X.M.actionManager.registerAction(new ExecuteCodeAction({trigger: ActionManager.OnPointerOutTrigger}, () => {
				Chars3D.updateButton({id: X.id, hoverbg: X.M.name, color:'#216696'})
			}))
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

/**
 * hoverbg is only for buttons!
 * Assuming that buttons does not need ever to update any text!
 * @param X: interface IUpdateButton 
 * @param id: string;
 * @param color?: string;
 * @param hoverbg?: string;
 * //@param clickbg?: string; // TODO
*/
	static updateButton(X: IUpdateButton): void {
		if(X.hoverbg){
			const HM = Chars3D.ch[X.id].material.material[X.hoverbg];
			HM.setColor4("uBackgroundColor", Color4.FromHexString(X.color));
			HM.setFloat("uEffectIntensity", 0.5)
		}
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
 * @param outlinecolor?: 	string;
 * @param bordercolor?: 	string;
*/
	static update(X: IUpdateData): void {

		const ch = Chars3D.ch[X.id] ?? false;

		/* if we have this object, run update */
		if(ch){

			if (ch.charcode === 'word'){
				log('Cannot update buttons!');
				return
			};

			if(_SETTINGS.debugUpdateTime){ new Performance() };

			/* flag */
			let updateText = false;

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
						ch.paragraph.material.setColor4("uFrontFaceColor", Color4.FromHexString(value));
					break;
					case 'sidewallcolor':
						ch.paragraph.material.setColor4("uSideWallColor", Color4.FromHexString(value));
					break;
					case 'backcolor':
						ch.paragraph.material.setColor4("uBackFaceColor", Color4.FromHexString(value));
					break;
					case 'bordercolor':
						ch.paragraph.material.setColor4("uCornerColor", Color4.FromHexString(value));
					break;
					case 'diffusecolor':
						ch.paragraph.material.setColor3("uDiffuseColor", Color3.FromHexString(value));
					break;
					case 'emissivecolor':
						ch.paragraph.material.setColor3("uEmissiveColor", Color3.FromHexString(value));
					break;
					case 'ambientcolor':
						ch.paragraph.material.setColor3("uAmbientColor", Color3.FromHexString(value));
					break;
					case 'bgcolor':
						ch.paragraph.material.setColor4("uBackgroundColor", Color4.FromHexString(value));
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
 * @param txt:				string; // fixed missed
 * @param txtbtn:			string[]|false; // new
 * @param sticky: 			number|false;
 * @param charcode: 		string;
 * @param font3d: 			number|false;
 * @param bevel: 			number;
 * @param billboard: 		number
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
 * @param outline: 			boolean;
 * @param outlinedepth: 	number;
 * @param outlinecolor: 	number[];
 * @param paragraph: 		any[];	// Single Mesh
 * @param meshes: 			any[]; 	// Multiple Meshes, i.e buttons
 * @param material: 		any[]; 	// Char3DMaterial
 * @param defaultKern: 		number|false;
 * @param source: 			IBoundingBox|false;
 * @param jit: 				any[]; 	// AtlasAssemble,
 * @param plasmatime:		number;
 * @param finalWidth: 		number;
 * @param finalHeight: 		number;
 * @param centerXOffset: 	number;
 * @param centerYOffset: 	number;
 * @param lastTextLength: 	number;
 * @param sizeMightChange: 	boolean;
 * @param ascender: 		number;
 * @param descender: 		number;
 * @param observer?: 		() => void; // holder function to Execute Sticky
*/

	private static setData(X: IDrawOptions): IParagraphState {
		
		/* if font is not called, set font to default */
		if(!X.font){
			X.font = _SETTINGS.DEFAULT_FONT
		};

		if(!Atlas.fonts[X.font]){
			log('%cError: font name [%s] not exist',_color.error,X.font);
			return false
		}
		
		const info = Atlas.fonts[X.font]._info;
		
		let _parent: any,
		_size = X.size ?? _SETTINGS.FONT_SIZE,
		//_lineheight = (_size * info.lineGap) * !X.lineheight ? _SETTINGS.LINE_HEIGHT : X.lineheight,
		_lineheight = (_size * info.lineGap) * (!X.lineheight ? _SETTINGS.LINE_HEIGHT : X.lineheight),
		_planepos = X.planepos ?? {x:0, y:0, z:0},
		_letterpos = X.letterpos ?? {x: 0, y: 0, z: 0},
		_txt = X.font !== _SETTINGS.DEFAULT_FONT ? Chars3D.setUpperLower(X.txt, info.chars) : X.txt,
		_txtbtn = info.charcode === 'word' ? Chars3D.replaceButtonText(_txt) : false,
		_len = !_txtbtn ? _txt.length : _txtbtn.length,
		
		//_txtA = X.font !== _SETTINGS.DEFAULT_FONT ? Chars3D.setUpperLower(X.txt, info.chars) : X.txt,
		//_txt = info.charcode === 'word' ? Chars3D.replaceButtonText(_txtA) : _txtA,
		_texture = !X.texture ? false : Chars3D.texture[X.texture],
		_diffusecolor = X.diffusecolor ? Color3.FromHexString(X.diffusecolor) : Chars3D.defaultDiffuseColor,
		_emissivecolor = X.emissivecolor ? Color3.FromHexString(X.emissivecolor) : Chars3D.defaultEmissiveColor,
		_ambientcolor = X.ambientcolor ? Color3.FromHexString(X.ambientcolor) : Chars3D.defaultAmbientColor,
		_specularcolor = X.specularcolor ? Color3.FromHexString(X.specularcolor) : Chars3D.defaultSpecularColor,
		_source:any = false,
		_billboard = X.billboard ?? 7, /* default billboard to 7 */
		_outline = false,
		_outlinedepth = null,
		_outlinecolor = null,
		_font3D:any = false,
		_bevel = 0,
		_frontcolor = Color4.FromHexString(X.frontcolor ?? _SETTINGS.FRONT_COLOR),
		_sidewallcolor = false,
		_backcolor = false,
		_background = X.background ?? false,
		_border = X.border ?? false;
		
		//log('_lineheight? %s',X.id, _lineheight);

		if(X.font3d && info.is3d){
			_font3D = X.font3d,
			_sidewallcolor = !X.sidewallcolor ? _frontcolor : Color4.FromHexString(X.sidewallcolor),
			_backcolor = !X.backcolor ? _frontcolor : Color4.FromHexString(X.backcolor);
			_bevel = X.bevel ?? 0
		};

		/** do not apply outline if is 3D text? */
		if(X.outline && !_font3D){
			_outline = X.outline,
			_outlinedepth = X.outlinedepth ?? _SETTINGS.OUTLINEDEPTH,
			_outlinecolor = Color3.FromHexString(X.outlinecolor ?? _SETTINGS.OUTLINECOLOR);
		};
		
		if(!X.parent){
			_parent = new TransformNode('node-'+X.id, Chars3D._scene);
			/** set position of plane and entire paragraph */
			_parent.position.set(_planepos.x, _planepos.y, _planepos.z);

			/** enable plane or not */
			_parent.setEnabled(X.notenable ? false : true);

		}else{
			/**
			 * FIXME: seperate this _parent, reason, on dispose removes also parent mesh!!!
			 * we need to remove only txt!!
			 */
			_parent = X.parent;
			//_parent.position.set(_planepos.x, _planepos.y, _planepos.z);
			_source = getMeshInfo(_parent.getBoundingInfo().boundingBox)
		};

		/**
			apply billboard:
			0	BILLBOARDMODE_NONE
			1	BILLBOARDMODE_X
			2	BILLBOARDMODE_Y
			4	BILLBOARDMODE_Z
			7	BILLBOARDMODE_ALL
		*/
		_parent.billboardMode = _billboard;

		/* set exclude */
		if(X.exclude){
			Chars3D.exclude.push(X.id)
		};

		return {
			id: X.id,
			txt: _txt,
			txtbtn: _txtbtn,
			sticky: X.sticky ?? false,
			charcode: info.charcode, /* ONLY IN V2 exist charcode */
			font3d: _font3D, /* depth of 3D */
			bevel: _bevel, /* depth of bevel */
			billboard: _billboard,
			letterpos: _letterpos,
			planepos: _planepos,
			plane: _parent,
			font: X.font, /* font name only */
			meta: X.meta ?? false, /* callback */
			size: _size,
			Len: _len, //_txt.length,
			lineHeightCalc: _lineheight,
			paragraphwidth: (X.paragraphwidth && X.paragraphwidth > 0) ? X.paragraphwidth : false,
			kern: (!X.kern && !info.kern) ? false : (X.kern ?? 0) + (info.kern ?? 0),
			spacing: X.spacing ?? 0,
			background: _background,
			border: _border,
			padding: X.padding ?? _SETTINGS.PADDING,
			adjustY: X.adjustY ?? _SETTINGS.ADJUST_Y_PADDING,
			adjustX: X.adjustX ?? 0,
			radius: X.bgradius ?? 0,
			thickness: X.bgthickness ?? 0.03,
			outline: _outline,
			outlinedepth: _outlinedepth,
			outlinecolor: _outlinecolor,
			paragraph: null,	 /* store merged letters for paragraph */
			meshes:[], 			 /* store meshes Letters/Buttons */
			/* start Shader */
			material: new Char3DMaterial(X.id, Chars3D._scene, {
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
				bgtexture: !X.bgimage ? false : Chars3D.texture[X.bgimage],
				bgcolor: Color4.FromHexString(X.bgcolor ?? _SETTINGS.FRONT_COLOR),
				bordercolor: Color4.FromHexString(X.bordercolor ?? _SETTINGS.FRONT_COLOR),
				disablelight: !X.disablelight ? 0.0 : 1.0
			}),
			defaultKern: !info.defaultKern ? false : _txt.length - 1,
			source: _source,  /* parent bounds */
			jit: new AtlasAssemble(), /* start our font BLIT memory asseble */
			plasmatime: 0,
			finalWidth: 0,
			finalHeight: 0,
			centerXOffset: 0,
			centerYOffset: 0,
			lastTextLength: 0,
			sizeMightChange: true, /* MANDATORY true to build panel for first time */
			//ascender: _size *  info.ascender,
			//descender: _size * info.descender,
			ascender: (_size * info.ascender) / info.unitsPerEm,
			descender: (_size * info.descender) / info.unitsPerEm
		}
	};

/**
 * Chars3D main function to draw text, 
 * X: user input options, interface: IDrawOptions
 * @param id: 					string;
 * @param txt: 					string|string[];
 * @param planePos: 			IPos;
 * @param parent?: 				Mesh;
 * @param meta?: 				any[]; // callback
 * @param buttons?: 			boolean; // used only to execute drawButtons()
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
 * @param outline?: 			boolean;
 * @param outlinedepth?: 		number;
 * @param outlinecolor?: 		string;
 * @param billboard?: 			number;
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

		/* if font is not called, set font to default */
		/*
		if(!X.font){
			X.font = _SETTINGS.DEFAULT_FONT
		};
		
		if(!Atlas.fonts[X.font]){
			log('%cError: font name [%s] not exist',_color.error,X.font);
			return
		}
		*/

		/* set and store data */
		Chars3D.ch[X.id] = Chars3D.setData(X);
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
			const _t = Performance.end('Draw %s > It took %s ms',X.id),
			S: IStats = ch.jit.getAssembledStats();
			
			Chars3D.logPerformance[X.id] = {
				time:_t,
				len: ch.Len,
				memory: S.memory,
				textv: S.textv,
				textp: S.textp,
				panelv: S.panelv,
				panelp: S.panelp
			};

			Chars3D.total.letters += ch.Len;
			if(_t > 0){
				Chars3D.total.performance += _t
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
			
			//const letter = P.charcode === 'code' ? P.txt.charCodeAt(i) : P.txt[i];
			const letter = P.txtbtn === false ? P.txt.charCodeAt(i) : P.txtbtn[i];
			const g = Atlas.fonts[P.font][letter];

			if (g) {

				if (_LINEBREAK === letter) {
					pos.y -= P.lineHeightCalc;
					pos.x = P.letterpos.x;
				} else {
					if (g._v !== null) {

						// add source reference to the glyph's binary chunks!
						//P.jit.addSource(letter, g);
						 P.jit.addSource(letter, {
							P: g.P,
							I: g.I,
							N: g.N,
							U: g.U,
							FID: g.FID,
							L: g.L, //g.P.length,
							IL: g.IL, //g.I.length,
						 });

						//if (P.background || P.border) {
							/* find minX and maxX */
							const LE = pos.x + (g.bounds.minX * S); // minX = Left Edge
							const RE = pos.x + (g.bounds.maxX * S); // maxX = Right Edge
							
							/* set max/min bounds */
							if (LE < minX) minX = LE;
							if (RE > maxX) maxX = RE
						//}
					};

					letterspace = 0;
					
					/* add default kern, new txtbtn */
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

		/*  caclulate background panel coordinates */
		// v2 new position coordinates
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
		
		/*
		// v1
		if (P.background || P.border) {
			if (minX === Infinity) {
				minX = maxX = P.letterpos.x
			};
			
			const absoluteTop = P.letterpos.y + (P.ascender * S);	// Locked top of line, MaxY
			const absoluteBottom = pos.y + (P.descender * S); 		// Locked bottom of line, MinY
			const paragraphHeight = absoluteTop - absoluteBottom;
			const paragraphWidth = maxX - minX;

			 
			//NOTE: about adjustY / adjustX
			//this is a BUG? as centerYOffset has a tiny declination!
			//too many different values to calculate correct bounds for each letter,
			//some letters may not have even bounds!
			//adjustY/X added to set a precision Y/X position of background/border
			
			
			P.centerXOffset = (minX + (paragraphWidth / 2)) + P.adjustX;
			P.centerYOffset = (absoluteBottom + (paragraphHeight / 2)) + P.adjustY;
			
			P.finalWidth = (paragraphWidth + P.padding[0]) / 2;
			P.finalHeight = (paragraphHeight + P.padding[1]) / 2
		};
		*/

		/* in update check the size */
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

		const pos: IPos = {...O.letterpos},
		lettersize = O.size,
		btns = !O.txtbtn ? false : [...O.txtbtn];
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

						//const _id = O.font+letter;
						/* calculate background / border bounds */
						const width = g.bounds.rangeX * lettersize * _SIZE;
						const height = g.bounds.rangeY * lettersize * _SIZE;
						// transform center to World space
						// scale the local center first, then we add the world position
						const worldCX = (g.bounds.centerX * lettersize) + pos.x;
						const worldCY = (g.bounds.centerY * lettersize) + pos.y;
						O.jit.assembleButton(letter, pos.x, pos.y, pos.z, lettersize, O.radius, O.thickness, O.padding, O.background, O.border, width, height, worldCX, worldCY);

						/* create button Mesh */
						const btn = new Mesh('M'+O.font+letter, Chars3D._scene);

						btn.name = letter;
						
						/* apply direct flat vertex array views */
						btn.setIndices(O.jit.I.slice(0, O.jit.iOffset));
						btn.setVerticesData('position', O.jit.P.slice(0, O.jit.pOffset), true);
						btn.setVerticesData('normal', O.jit.N.slice(0, O.jit.pOffset), true);
						btn.setVerticesData('uv', O.jit.U.slice(0, O.jit.vBase * 2), true);

						/* Set the FaceID buffer */
						btn.setVerticesData('aFaceId',  O.jit.FID.slice(0, O.jit.vBase), false, true);

						/* apply Shader */
						O.material.applyMaterial(letter);

						/* apply material */
						btn.material = O.material.material[letter];

						/* set parent */
						btn.parent = O.plane;

						// attach callback directly to mesh
						if (O.meta && O.meta[letter]) {
							btn._callback = O.meta[letter]
						};

						/* store charmesh to use later */
						Chars3D.ch[O.id].meshes.push(btn)
					};

					letterspace = 0;

					/* NO default Kern for SYMBOLS, as we build independent chars!! */
					/* apply position for custom Kern */
					if(O.kern){
						letterspace += O.kern
					};

					/* set position for letter and space */
					letterspace += g._w + O.spacing;
					pos.x += lettersize * letterspace * _SIZE
				}
			}
		};

		/* set sticky */
		if(O.sticky){
			O.observer = Chars3D.setSticky(O.plane, O.sticky)
		}
	};

	/**
	 draw main Paragraph
	 creates one merged mesh from given text + background or border
	*/
	static drawParagraph(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos},
		paragraphMesh: Mesh = new Mesh('M'+O.id, Chars3D._scene), /* create text mesh */
		Len = O.Len,
		lettersize = O.size;

		let i = 0,
		letterspace = 0;

		for (; i < Len; i++){
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
						!O.font3d ? O.jit.assemble2D(letter, pos.x - O.centerXOffset, pos.y - O.centerYOffset, pos.z, lettersize) : O.jit.assemble3D(letter, pos.x - O.centerXOffset, pos.y - O.centerYOffset, pos.z, lettersize, O.font3d, O.bevel)
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
					pos.x += lettersize * letterspace * _SIZE;

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

		paragraphMesh.setIndices(O.jit.I.subarray(0, O.jit.iOffset));
		paragraphMesh.setVerticesData('position', O.jit.P.subarray(0, O.jit.pOffset), true);
		paragraphMesh.setVerticesData('normal', O.jit.N.subarray(0, O.jit.pOffset), true);
		paragraphMesh.setVerticesData('uv',  O.jit.U.subarray(0, O.jit.vBase * 2), true);

		/* Set the FaceID buffer */
		paragraphMesh.setVerticesData('aFaceId',  O.jit.FID.subarray(0, O.jit.vBase), true, true);
		

		/*
		if (paragraphMesh.subMeshes && paragraphMesh.subMeshes[0]) {
			//log('indexCount: %s verticesCount: %s', paragraphMesh.subMeshes[0].indexCount, paragraphMesh.subMeshes[0].verticesCount);
			//log('iOffset: %s vBase: %s', O.jit.iOffset, O.jit.vBase);

			//paragraphMesh.subMeshes[0].indexCount = O.jit.iOffset;
			//paragraphMesh.subMeshes[0].verticesCount = O.jit.vBase;
		}
		*/

		/* create and apply ShaderMaterial */
		O.material.applyMaterial(O.id);
		
		/** 
		source = bounds for any parent mesh i.e "sphere" 
		if we have a "parent mesh" apply "z" from source, else set letterpos.z position
		*/
		const _zita = !O.source ? O.letterpos.z : O.source.z;
		paragraphMesh.position.set(O.letterpos.x, O.letterpos.y, _zita);
		

		/* apply material */
		paragraphMesh.material = O.material.material[O.id];
		//O.material.material.wireframe = true;

		if(O.outline){
			paragraphMesh.renderOutline = O.outline;
			paragraphMesh.outlinedepth = O.outlinedepth;
			paragraphMesh.outlineColor = O.outlinecolor
		};

		/* attach click or any event callback directly to mesh */
		if (O.meta && O.meta[O.id]) {
			paragraphMesh._callback = O.meta[O.id];
		};

		/* place paragraph to plane */
		paragraphMesh.parent = O.plane;

		/* store paragraph for later use */
		Chars3D.ch[O.id].paragraph = paragraphMesh;

		/* experiment sticky */
		if(O.sticky){
			O.observer = Chars3D.setSticky(O.plane, O.sticky)
		}
	};

	/** main Paragraph update */
	private static updateParagraph(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos},
		Len = O.Len,
		lettersize = O.size;

		let i = 0,
		letterspace = 0;

		for (; i < Len; i++){
			const letter = O.txt.charCodeAt(i),
			g = Atlas.fonts[O.font][letter];

			if (g) {
				/* if LINEBREAK reset values, set x,y,lines */
				if (_LINEBREAK === letter) {
					pos.y -= O.lineHeightCalc;
					pos.x = O.letterpos.x
				} else {
					if (g._v !== null) {
						!O.font3d ? O.jit.assemble2D(letter, pos.x-O.centerXOffset, pos.y-O.centerYOffset, pos.z, lettersize) : O.jit.assemble3D(letter, pos.x-O.centerXOffset, pos.y-O.centerYOffset, pos.z, lettersize, O.font3d, O.bevel)
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
					pos.x += lettersize * letterspace * _SIZE;

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

		/* apply position */
		const _zita = !O.source ? O.letterpos.z : O.source.z;
		O.paragraph.position.set(O.letterpos.x, O.letterpos.y, _zita);

		/* Finalize update using subarray(), returns a view over the same buffer — zero copy, zero allocation! */
		O.paragraph.setIndices(O.jit.I.subarray(0, O.jit.iOffset));
		O.paragraph.setVerticesData('position', O.jit.P.subarray(0, O.jit.pOffset), true);
		O.paragraph.setVerticesData('normal', O.jit.N.subarray(0, O.jit.pOffset), true);
		O.paragraph.setVerticesData('uv', O.jit.U.subarray(0, O.jit.vBase * 2), true);
		O.paragraph.setVerticesData('aFaceId', O.jit.FID.subarray(0, O.jit.vBase), true, true);

		/**
			MANDATORY update subMeshes[0] indexCount, verticesCount?
			only needed when we use freezeWorldMatrix? (a bug?) 
		*/
		//if (O.paragraph.subMeshes && O.paragraph.subMeshes[0]) {
			//log('indexCount: %s verticesCount: %s', O.paragraph.subMeshes[0].indexCount, O.paragraph.subMeshes[0].verticesCount);
			O.paragraph.subMeshes[0].indexCount = O.jit.iOffset;
			O.paragraph.subMeshes[0].verticesCount = O.jit.vBase;
		//}
	};


	/** simply animation */
	private static drawAnimation(O: IParagraphState): void {
		const Len = O.Len,
		radius = 5, /* orbit radius around parent mesh */
		center: number[] = O.plane.position, /* mesh center */
		angleStep: number = (2 * Math.PI) / O.Len; /* evenly spaced */
		
		let i = 0;
		for (; i < Len; i++) {
			const letter: number = O.txt.charCodeAt(i),
			g = Atlas.fonts[O.font][letter];
			if (g._v) {
				const angle = i * angleStep;
				/* build letter */
				O.jit.assemble2D(letter, radius * Math.cos(angle), center.y, radius * Math.sin(angle), O.size)
			}
		};

		/* Create Mesh */
		const anm = new Mesh('M'+O.id, Chars3D._scene);

		/* apply VertexData */
		anm.setIndices(O.jit.I.subarray(0, O.jit.iOffset));

		// Stream direct flat vertex array views
		anm.setVerticesData('position', O.jit.P.subarray(0, O.jit.pOffset), true);
		anm.setVerticesData('normal', O.jit.N.subarray(0, O.jit.pOffset), true);
		anm.setVerticesData('uv', O.jit.U.subarray(0, O.jit.vBase * 2), true);

		/* Update the FaceID buffer */
		anm.setVerticesData('aFaceId', O.jit.FID.subarray(0, O.jit.vBase), false, 1);

		/* create ShaderMaterial */
		O.material.applyMaterial(O.id);

		/* apply material to mesh */
		anm.material = O.material.material[O.id];

		/* set parent*/
		anm.parent = O.plane;

		/* store mesh */
		Chars3D.ch[O.id].paragraph = anm;
	};

	/** Classic StandardMaterial, not really needed! but still used in CreateBox, CreateSphere, so leave it for demo.. */
	static createMaterial(X:IMaterial): StandardMaterial{

		const mat = new StandardMaterial('material-'+X.id, Chars3D._scene);

		if(X.texture){
			mat.diffuseTexture = Chars3D.texture[X.texture];
			mat.emissiveTexture = Chars3D.texture[X.texture]
		};

		if(X.opacity || X.opacity === 0){
			mat.alpha = X.opacity
		};

		if(X.disablelight){
			mat.disableLighting = true
		};

		if(X.diffuse){
			mat.diffuseColor = Color3.FromHexString(X.diffuse) /* .toLinearSpace()? */
		};

		if(X.usecolors){

			if(X.emissive){
				mat.emissiveColor = Color3.FromHexString(X.emissive)
			};

			if(X.ambient){
				mat.ambientColor = Color3.FromHexString(X.ambient)
			}

		}else{
			mat.emissiveColor = !X.emissive ? Chars3D.defaultEmissiveColor : Color3.FromHexString(X.emissive);
			mat.ambientColor = !X.ambient ? Chars3D.defaultAmbientColor : Color3.FromHexString(X.ambient)
		};

		/* default specularColor */
		mat.specularColor = !X.specular ? Chars3D.defaultSpecularColor : Color3.FromHexString(X.specular);

		return mat
	};


	/**
	* set Sticky to any text, most used for buttons/logo
	* FIXME: how to update letter position on resize??? serius issue!!
	*/
	static setSticky(plane: TransformNode, distance: number): Observer<Scene> {

		return Chars3D._scene.onBeforeRenderObservable.add(() => {
			const forward = Chars3D._cam.getForwardRay().direction;
			plane.position = Chars3D._cam.position.add(forward.scale(distance))
		})
	};

	/**
	* plasmaUpdate, update color effect
	*/
	static plasmaUpdate(id:string, tick:number, speed: number): void{

		if(Chars3D.ch[id].plasmatime > 100){
			Chars3D.ch[id].plasmatime = 0
		};

		Chars3D.ch[id].plasmatime +=tick;
		Chars3D.ch[id].paragraph.material.setFloat('uTime', Chars3D.ch[id].plasmatime);

		Chars3D.ch[id].paragraph.material.setFloat('uEffectSpeed', speed); /* default: 2.0 */
		Chars3D.ch[id].paragraph.material.setFloat('uEffectIntensity', 1.0); /* MANDATORY 1.0 to display! */
		/*
		// TODO: add color to input
		plasmaEffect.setColor3('neon', new Color3(0.0,1.0,0.8));
		*/
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
				}else{
					if(id==='gamepause'){Chars3D.disable('debuginfo')};
					Chars3D.enable(X.id)
				}
			}else if(!Chars3D.exclude.includes(id)){
				!X.enable ? Chars3D.enable(id) : Chars3D.disable(id)
			}
		}
	};

	static disable(id: string): void {
		if(!Chars3D.ch[id]) return;
		
		if(Chars3D.ch[id].sticky){
			Chars3D._scene.onBeforeRenderObservable.remove(Chars3D.ch[id].observer);
		};
		
		Chars3D.ch[id].plane.setEnabled(false)
	};

	static enable(id: string): void {
		if(!Chars3D.ch[id]) return;
		
		if(Chars3D.ch[id].sticky){
			Chars3D.ch[id].observer = Chars3D.setSticky(Chars3D.ch[id].plane, Chars3D.ch[id].sticky)
		};
		
		Chars3D.ch[id].plane.setEnabled(true)
	};
	
/*
	// NOT USED in this version!
	static disposeAll(excludeID?: string[]): void {
		for(const id in Chars3D.ch){
			if(excludeID && excludeID.includes(id)){
			}else{
				!Chars3D.exclude.includes(id) ? Chars3D.dispose(id) : Chars3D.disable(id)
			}
		}
	};
*/

	static dispose(id: string): boolean {

		if (!Chars3D.ch[id]) return false;

		Chars3D.ch[id].material.clean(id);
		Chars3D.ch[id].material = null;

		if (Chars3D.ch[id].paragraph !== null) {
			Chars3D.ch[id].paragraph.dispose(); /* Single Mesh */
		}

		if (Chars3D.ch[id].meshes.length > 0) {
			Chars3D.ch[id].meshes.forEach(m => {m.dispose()})  /* independent Buttons/Letters */
		};

		Chars3D.ch[id].plane.dispose();

		// CRITICAL JIT CLEANUP
		Chars3D.ch[id].jit.clean();
		Chars3D.ch[id].jit = null;

		// Delete ch
		delete Chars3D.ch[id];
		return true
	}

}
