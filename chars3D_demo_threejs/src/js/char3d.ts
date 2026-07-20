import { PerspectiveCamera, Scene, BufferGeometry, BufferAttribute, Object3D, BoxGeometry, Mesh, MeshBasicMaterial, Color, Vector3, Box3, Raycaster, Texture} from 'three';
import {_SETTINGS, Color3, Color4, log, Performance} from './settings';
import {Char3DMaterial} from './Char3DMaterial';
import {AtlasAssemble} from './AtlasAssemble';
import {Atlas} from './AtlasFactory';
import type {IPos, Ixy, IChars, IMaterial, IDrawOptions, IParagraphState, IUpdateData, IUpdateButton, IEnableOrDisable, ILogTotal, IBoundingBox, IBoundingInfo} from './interfaces';

/**
 * Chars3D ts:v 1.0.0 Three.js
 * Video demo: https://youtu.be/HOq4Ne5q9xc
 * Jun 14, 2026 12:00
 * "three": "^0.184.0"
 */


/**
 * helper utility bounding wrapper
 */
const _SIZE: number = _SETTINGS.MASTERSIZE,
_LINEBREAK: number = _SETTINGS.LINEBREAK,
getBoundingInfo = (mesh: Mesh): IBoundingInfo => {
    // evaluate current buffer geometry boundaries
    mesh.geometry.computeBoundingBox();
    
    const box3 = new Box3();
    
    if (mesh.geometry.boundingBox) {
        // copy the raw local boundaries into our worker box
        box3.copy(mesh.geometry.boundingBox);
        // apply the mesh's position, rotation, and scale matrices to get world bounds
        box3.applyMatrix4(mesh.matrixWorld);
    }

    // allocate output vectors
    const minimum = box3.min.clone();
    const maximum = box3.max.clone();
    
    const center = new Vector3();
    box3.getCenter(center); // populates the center point vector in-place

    const size = new Vector3();
    box3.getSize(size);     // populates the total dimensions [width, height, depth]

    // extendSize represents half-extents (distance from center to edge)
    const extendSize = size.clone().multiplyScalar(0.5);

    return {
        boundingBox: {
            minimum,      // Vector3
            maximum,      // Vector3
            center,       // Vector3
            extendSize,   // Vector3 (Half-extents)
            size          // Vector3 (Full width/height/depth)
        }
    }
},
//getMeshInfo = (B: any): IBoundingBox => {
getMeshInfo = (B: IBoundingInfo): IBoundingBox => {
	return {
		x: B.maximum.x - B.minimum.x,
		y: B.maximum.y - B.minimum.y,
		z: B.maximum.z - B.minimum.z,
		m: 0//B._worldMatrix
	}
};


export class Chars3D{

private static _scene: Scene;
private static _cam: PerspectiveCamera;
//private static _render: WebGLRenderer;
static ch: Record<string, IParagraphState> = {}; /* ch: holds all our chars that we draw in screen */
static texture: Record<string, Texture> = {}; /* holds textures that we have loaded */
static exclude: string[] = ['gamepause', 'debuginfo']; /* holds text id's to exclude from dispose, instand disable it */
static defaultDiffuseColor: Color = Color3(_SETTINGS.DIFFUSE_COLOR);
static defaultEmissiveColor: Color = Color3(_SETTINGS.EMISSIVE_COLOR);
static defaultAmbientColor: Color = Color3(_SETTINGS.AMBIENT_COLOR);
static defaultSpecularColor: Color = Color3(_SETTINGS.SPECULAR_COLOR);
static defaultLightColor: Color = Color3(_SETTINGS.LIGHTCOLOR);

/* optional stats logger */
static logPerformance = {};
static total: ILogTotal = { totalfonts: 0, letters2D: 0, letters3D: 0, letters: 0, performance: 0, totalbytes2d: 0, totalbytes3d: 0};

	constructor(scene:Scene, camera:PerspectiveCamera, _fonts: IG3D, _blit: IBlitBuffers, _textures: Texture, _hasblit: boolean, _hasfont: boolean){

		if(_SETTINGS.debugTime){
			new Performance();
			Chars3D.logPerformance['started'] = new Date()
		};

		Chars3D._scene = scene;
		Chars3D._cam = camera;
		Chars3D.texture = _textures;

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
	static setUpperLower(txt:string, c: IChars): string{
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
	* FIXME: is not set for Three
	* simply add an addEventListener pointer enter / leave to execute updateButton
	*/
/*
	static updateButton(X: IUpdateButton): void {
		if(X.hoverbg){
			const HM = Chars3D.ch[X.id].material.material[X.hoverbg];
			const _color = Color4(X.color);
			HM.setColor4("uBackgroundColor", _color.rgb);
			HM.setFloat("uBackgroundAlpha", _color.alpha);
			HM.setFloat("uEffectIntensity", 0.5)
		}
	};
*/

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
						//mat.setColor4(X.id, "uFrontFaceColor", Color4(value));
						//log('frontcolor value: %s Color4: ',value, Color4(value));
						ch.material.setColor4(X.id, "uFrontFaceColor", Color4(value));
					break;
					case 'sidewallcolor':
						ch.material.setColor4(X.id, "uSideWallColor", Color4(value));
					break;
					case 'backcolor':
						ch.material.setColor4(X.id, "uBackFaceColor", Color4(value));
					break;
					case 'bordercolor':
						ch.material.setColor4(X.id, "uCornerColor", Color4(value));
					break;
					case 'diffusecolor':
						ch.material.setColor3(X.id, "uDiffuseColor", Color3(value));
					break;
					case 'emissivecolor':
						ch.material.setColor3(X.id, "uEmissiveColor", Color3(value));
					break;
					case 'ambientcolor':
						ch.material.setColor3(X.id, "uAmbientColor", Color3(value));
					break;
					case 'bgcolor':
						ch.material.setColor4(X.id, "uBackgroundColor", Color4(value));
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
 * @param targetCamera: 	Vector3;
 * @param animationFrameId: number;
*/

	private static setData(X: IDrawOptions): IParagraphState {
		const info = Atlas.fonts[X.font]._info;
		let _parent,
		_size = X.size ?? _SETTINGS.FONT_SIZE,
		_lineheight = (_size * info.lineGap) * !X.lineheight ? _SETTINGS.LINE_HEIGHT : X.lineheight,
		_planepos = X.planepos ?? {x:0, y:0, z:0},
		_txtA = X.font !== _SETTINGS.DEFAULT_FONT ? Chars3D.setUpperLower(X.txt, info.chars) : X.txt,
		_txt = info.charcode === 'word' ? Chars3D.replaceButtonText(_txtA) : _txtA,
		_texture = !X.texture ? false : Chars3D.texture[X.texture],
		_diffusecolor = X.diffusecolor ? Color3(X.diffusecolor) : Chars3D.defaultDiffuseColor,
		_emissivecolor = X.emissivecolor ? Color3(X.emissivecolor) : Chars3D.defaultEmissiveColor,
		_ambientcolor = X.ambientcolor ? Color3(X.ambientcolor) : Chars3D.defaultAmbientColor,
		_specularcolor = X.specularcolor ? Color3(X.specularcolor) : Chars3D.defaultSpecularColor,
		_source = false,
		_billboard = X.billboard ?? 7, /* default billboard to 7 */
		_outline = false,
		_outlinedepth = null,
		_outlinecolor = null,
		_font3D = false,
		_bevel = 0,
		_frontcolor = Color4(X.frontcolor ?? _SETTINGS.FRONT_COLOR),
		_sidewallcolor = false,
		_backcolor = false,
		_background = X.background ?? false,
		_border = X.border ?? false;

		if(X.font3d && info.is3d){
			_font3D = X.font3d,
			_sidewallcolor = !X.sidewallcolor ? _frontcolor : Color4(X.sidewallcolor),
			_backcolor = !X.backcolor ? _frontcolor : Color4(X.backcolor);
			_bevel = X.bevel ?? 0
		};

		/** do not apply outline if is 3D text? */
		if(X.outline && !_font3D){
			_outline = X.outline,
			_outlinedepth = X.outlinedepth ?? _SETTINGS.OUTLINEDEPTH,
			_outlinecolor = Color3(X.outlinecolor ?? _SETTINGS.OUTLINECOLOR);
		};
		if(!X.parent){
			 _parent = new Object3D();
			 _parent.name = 'node-'+X.id;

			/* set position of plane and entire paragraph */
			_parent.position.set(_planepos.x, _planepos.y, _planepos.z);

			/* enable plane or not */
			_parent.visible = (X.notenable || Chars3D.exclude.includes(X.id)) ? false : true;

		}else{
			/**
			 * FIXME: seperate this _parent, reason, on dispose removes also parent mesh!!!
			 * we need to remove only txt!!
			 */
			_parent = X.parent;
			//_parent.position.set(_planepos.x, _planepos.y, _planepos.z);
			const BoundingInfo = getBoundingInfo(_parent);
			_source = getMeshInfo(BoundingInfo.boundingBox);
		};

		/**
			apply billboard: NOTE THOSE are only for Babylon
			0	BILLBOARDMODE_NONE
			1	BILLBOARDMODE_X
			2	BILLBOARDMODE_Y
			4	BILLBOARDMODE_Z
			7	BILLBOARDMODE_ALL
		*/

		/* set exclude */
		if(X.exclude){
			Chars3D.exclude.push(X.id)
		};

		return {
			id: X.id,
			txt: _txt,
			sticky: X.sticky ?? false,
			charcode: info.charcode, /* <- ONLY IN V2 */
			font3d: _font3D, /* depth of 3D */
			bevel: _bevel, /* depth of bevel */
			billboard: _billboard,
			letterpos: X.letterpos ?? {x: 0, y: 0, z: 0},
			planepos: _planepos,
			plane: _parent,
			font: X.font, /* font name only */
			meta: X.meta ?? false,
			size: _size,
			Len: _txt.length,
			lineHeightCalc: _lineheight,
			paragraphwidth: (X.paragraphwidth && X.paragraphwidth > 0) ? X.paragraphwidth : false,
			kern: (!X.kern && !info.kern) ? false : (!X.kern && info.kern) ? info.kern : (X.kern && !info.kern) ? X.kern : info.kern + X.kern,
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
			material: new Char3DMaterial(X.id, Chars3D._cam, { 
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
				bgcolor: Color4(X.bgcolor ?? _SETTINGS.FRONT_COLOR),
				bordercolor: Color4(X.bordercolor ?? _SETTINGS.FRONT_COLOR),
				disablelight: !X.disablelight ? 0.0 : 1.0
			}),
			defaultKern: !info.defaultKern ? false : _txt.length - 1,
			source: _source,    		/* parent bounds */
			jit: new AtlasAssemble(), 	/* create our font BLIT memory asseble */
			plasmatime: 0,
			finalWidth: 0,
			finalHeight: 0,
			centerXOffset: 0,
			centerYOffset: 0,
			lastTextLength: 0,
			sizeMightChange: true, /* MANDATORY true to build panel for first time */
			ascender: (_size * info.ascender) / info.unitsPerEm,
			descender: (_size * info.descender) / info.unitsPerEm,
			targetCamera: new Vector3(),
			animationFrameId: 1
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
		if(!X.font){
			X.font = _SETTINGS.DEFAULT_FONT
		};

		/* set and store data */
		Chars3D.ch[X.id] = Chars3D.setData(X);
		const ch = Chars3D.ch[X.id];
		
		Chars3D.setParameters(false, ch);

		/**
			MANDATORY AtlasAssemble build, to set TypedArrays totalP/totalI from the length of this text
			@param hasBackground: boolean,
			@param hasBorder: boolean
		*/
		ch.jit.build(ch.background, ch.border);

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
 * also caclulates final width/height for background/border 
 * @param update: 	boolean	// false = draw, true = update
 * @param P: 		input interface IParagraphState.
*/
	private static setParameters(update: boolean, P: IParagraphState): void {
		
		const pos: IPos = {...P.letterpos},
		S = P.size,
		Len = P.Len;
		
		let i = 0,
		letterspace = 0,
		minX: number = Infinity,
		maxX: number = -Infinity;

		for (; i < Len; i++) {
			
			const letter = P.charcode === 'code' ? P.txt.charCodeAt(i) : P.txt[i];
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

						if (P.background || P.border) {
							/* find minX and maxX */
							const LE = pos.x + (g.bounds.minX * S); // minX = Left Edge
							const RE = pos.x + (g.bounds.maxX * S); // maxX = Right Edge
							
							/* set max/min bounds */
							if (LE < minX) minX = LE;
							if (RE > maxX) maxX = RE
						}
					};

					letterspace = 0;
					
					/* add default kern */
					if (P.defaultKern && i < P.defaultKern) {
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
		}

		/*  caclulate background panel coordinates */
		if (P.background || P.border) {
			if (minX === Infinity) {
				minX = maxX = P.letterpos.x
			};
		
			const absoluteTop = P.letterpos.y + (P.ascender * S);	// Locked top of line, MaxY
			const absoluteBottom = pos.y + (P.descender * S);		// Locked bottom of line, MinY
			const paragraphHeight = absoluteTop - absoluteBottom;
			const paragraphWidth = maxX - minX;
			
			/** 
			NOTE: about adjustY / adjustX
			this is a BUG? as centerYOffset has a tiny declination!  
			too many different values to calculate correct bounds for each letter,
			some letters may not have even bounds!
			adjustY/X added to set a precision Y/X position of background/border
			*/
			P.centerXOffset = (minX + (paragraphWidth / 2)) + P.adjustX;
			P.centerYOffset = (absoluteBottom + (paragraphHeight / 2)) + P.adjustY;
			
			P.finalWidth = (paragraphWidth + P.padding[0]) / 2;
			P.finalHeight = (paragraphHeight + P.padding[1]) / 2;

		}

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

		const pos: IPos = {...O.letterpos};
		let letterspace: number = 0,
		i: number = 0;

		for (; i < O.Len; i++){
			const letter = O.txt[i],
			g = Atlas.fonts[O.font][letter];
			if (g) {
				/* LINE BREAK used to draw button vertical */
				if (_SETTINGS.LETTERLINEBREAK === letter) {
					pos.y -= O.lineHeightCalc;
					pos.x = O.letterpos.x;
				}else{

					if (g._v !== null) {
						
						const width = g.bounds.rangeX * O.size * _SIZE;
						const height = g.bounds.rangeY * O.size * _SIZE;
						const worldCX = (g.bounds.centerX * O.size) + pos.x + O.adjustX;
						const worldCY = (g.bounds.centerY * O.size) + pos.y + O.adjustY;

						const geo = O.jit.assembleButton(letter, pos.x, pos.y, pos.z, O.size, O.radius, O.thickness, O.padding, O.background, O.border, width, height, worldCX, worldCY);

						/* apply Shader material */
						O.material.applyMaterial(letter);
						
						const btn = new Mesh(geo, O.material.material[letter]);
						btn.name = letter;
						btn.scale.set(1, 1, -1);

						/* attach callback directly to mesh */
						if (O.meta && O.meta[letter]) {
							btn._callback = O.meta[letter]
						};
						
						/* set parent */
						O.plane.add(btn);

						/* store mesh */
						Chars3D.ch[O.id].meshes.push(btn);
					};

					letterspace = 0;

					// NO default Kern for SYMBOLS, as we build independent chars!!
					
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

		/** set sticky */
		if(O.sticky){
			Chars3D.setSticky(O.id, O.sticky, O.animationFrameId, O.plane)
		};
		
		/* add mesh into scenn */
		Chars3D._scene.add(O.plane)
	};

	/**
	 draw main Paragraph
	 creates one merged mesh from given text + background or border
	*/
	static drawParagraph(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos},
		Len = O.Len;
		
		let i = 0,
		letterspace = 0;
			
		for (; i < Len; i++) {
			const letter = O.txt.charCodeAt(i),
				  g = Atlas.fonts[O.font][letter];

			if (g) {
				if (_LINEBREAK === letter) {
					pos.y -= O.lineHeightCalc;
					pos.x = O.letterpos.x;
				} else {
					if (g._v !== null) {
						/* assemble letter */
						!O.font3d 
							? O.jit.assemble2D(letter, pos.x - O.centerXOffset, pos.y - O.centerYOffset, pos.z, O.size) 
							: O.jit.assemble3D(letter, pos.x - O.centerXOffset, pos.y - O.centerYOffset, pos.z, O.size, O.font3d, O.bevel)
					};

					letterspace = 0;
					
					/* apply position for default font Kern (if exist) */
					if (O.defaultKern && i < O.defaultKern) {
						const kern = Atlas.fonts[O.font][letter]._k[O.txt.charCodeAt(i + 1)];
						if (kern) letterspace += kern
					};

					/* apply position for custom Kern */
					if (O.kern) {
						letterspace += O.kern
					};

					/* set position for letter and spacing */
					letterspace += g._w + O.spacing;
					pos.x += O.size * letterspace * _SIZE;

					/* set maximum paragraph width, reset and apply x,y,line for the next letter */
					if (O.paragraphwidth && pos.x >= O.paragraphwidth) {
						pos.y -= O.lineHeightCalc;
						pos.x = O.letterpos.x
					}
				}
			}
		};

		/**
		 Assemble background panel
		 Since text vertices are centered around (0,0), our background can sit cleanly at (0,0) without moving!
		*/
		O.jit.assemblePanel(0, 0, O.letterpos.z+_SETTINGS.zdepth, O.finalWidth, O.finalHeight, O.radius, O.thickness, O.background, O.border);
		
		// create BufferGeometry for final mesh
		O.jit.createVDS();

		// Create and apply ShaderMaterial
		O.material.applyMaterial(O.id);

		// create our mesh
		const paragraphMesh = new Mesh(O.jit.vds, O.material.material[O.id]);
		paragraphMesh.name = O.id;

		/* 
		source = bounds for any parent mesh i.e "sphere" 
		if we have a "parent mesh" apply "z" from source else set letterpos.z position
		*/
		const _zita = !O.source ? O.letterpos.z : O.source.z;
		paragraphMesh.position.set(O.letterpos.x, O.letterpos.y, _zita);
		
		// For Three need to invert the Z-Scale
		paragraphMesh.scale.set(1, 1, -1);

		/* attach metadata callback directly to mesh */
		if (O.meta && O.meta[O.id]) {
			paragraphMesh._callback = O.meta[O.id];
		}

		/* store paragraph for frame updates */
		O.paragraph = paragraphMesh;

		/* place paragraph to plane */
		O.plane.add(paragraphMesh);
		
		/* experiment sticky */
		if (O.sticky) {
			Chars3D.setSticky(O.id, O.sticky, O.animationFrameId, O.plane)
		};
		
		/* place to scene */
		Chars3D._scene.add(O.plane)
	}


	/** main update Paragraph */
	private static updateParagraph(O: IParagraphState): void {

		const pos: IPos = {...O.letterpos},
		Len = O.Len;

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

		/** 
		source = bounds for any parent mesh i.e "sphere" 
		if we have a "parent mesh" apply "z" from source else set letterpos.z position
		*/
		const _zita = !O.source ? O.letterpos.z : O.source.z;
		O.paragraph.position.set(O.letterpos.x, O.letterpos.y, _zita);

		/* update BoxGeometry */
		O.jit.updateVDS();

	};


	/** simply animation */
	private static drawAnimation(O: IParagraphState): void {

		const Len = O.Len,
		radius: number = 5, /* orbit radius around parent mesh */
		center: number[] = O.plane.position, /* mesh center */
		angleStep: number = (2 * Math.PI) / O.Len /* evenly spaced */
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

		/* create BoxGeometry */
		O.jit.createVDS('M'+O.id);

		/* create ShaderMaterial */
		O.material.applyMaterial(O.id);
		
		/* Create Mesh */
		const anm = new Mesh(O.jit.vds, O.material.material[O.id]);
		anm.name = O.id;
		
		/* apply material to mesh */
		anm.material = O.material.material[O.id];

		/* set parent*/
		//anm.parent = O.plane;
		O.plane.add(anm);

		/* store mesh */
		Chars3D.ch[O.id].paragraph = anm;
		Chars3D._scene.add(O.plane)
	};
	
	/**
	* set Sticky to any text, most used for buttons/logo
	* FIXME: how to update letter position on resize??? serius issue!!
	*/
    static setSticky(id: string, distance: number, animationFrameId?: number, plane?: Mesh|Object3D): void {

        if (distance < 1 && animationFrameId) {
			cancelAnimationFrame(animationFrameId);
            return
        };

		if (!plane && distance < 1) {
            //console.warn(`Cannot enable sticky '${id}' without a plane and distance.`);
            return
        };

        const forward = new Vector3();

        // Set sticky
        const updatePlanePosition = (): void => {
            Chars3D._cam.getWorldDirection(forward);
            plane.position.copy(Chars3D._cam.position).addScaledVector(forward, distance);
            plane.lookAt(Chars3D._cam.position);

            // store the new frame ID
			animationFrameId = requestAnimationFrame(updatePlanePosition);

        };
        // start loop
        updatePlanePosition()
    };

	/**
	* plasmaUpdate, update color effect
	*/
	static plasmaUpdate(id:string, tick:number, speed: number): void {
		
		// reset plasmatime
		if(Chars3D.ch[id].plasmatime > 100){
			Chars3D.ch[id].plasmatime = 0
		};

		Chars3D.ch[id].plasmatime +=tick;
		//log('plasmaUpdate tick',Chars3D.ch[id].plasmatime);

		Chars3D.ch[id].material.setFloat(id, 'uTime', Chars3D.ch[id].plasmatime);

		Chars3D.ch[id].material.setFloat(id, 'uEffectSpeed', speed);	/* default: 2.0 */
		Chars3D.ch[id].material.setFloat(id, 'uEffectIntensity', 1.0); 	/* MANDATORY 1.0 to display! */
		
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
					Chars3D.ch[X.id].plane.visible = true;
				}
			}else if(!Chars3D.exclude.includes(id)){
				!X.enable ? Chars3D.enable(id) : Chars3D.disable(id)
			}
		}
	};


	static disable(id: string): void {
		if(!Chars3D.ch[id]) return;
		if(Chars3D.ch[id].sticky){
			Chars3D.setSticky(id, 0, Chars3D.ch[id].animationFrameId)
		};
		
		Chars3D.ch[id].plane.visible = false
	};

	static enable(id: string): void {
		if(!Chars3D.ch[id]) return;
		
		if(Chars3D.ch[id].sticky){
			Chars3D.setSticky(id, Chars3D.ch[id].sticky, Chars3D.ch[id].animationFrameId, Chars3D.ch[id].plane)
		};
		
		Chars3D.ch[id].plane.visible = true
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