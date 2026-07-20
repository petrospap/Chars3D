import {StandardMaterial, Mesh, Vector3, Color3, TransformNode, VertexData} from '@babylonjs/core';
import {UI, _INTERNAL, logger, Performance} from './UI';
import {Polygon} from './polygon';
import earcut from 'earcut';
import {oxanium} from './oxaniumextralight.js';
import type {IPos, IDrawOptions, IParagraphState, IUpdateData, IEnableOrDisable, IG3D, IGlyphXBounds, IGlyphBuffers, IGlyphVertexData2D, IGlyphVertexData3D} from './interfaces.ts';
//IG2D, 

/**
* interfaces v:0.1
* Chars3D Version: 0.9.6
*/

// helpers
let uids:number = 0;
const uniqueId = (k:string|number):string => {uids++;return k+uids},
isNumber = (v: string|number) => {
  return !isNaN(Number(v))
},
MASTERDEPTH = _INTERNAL.GLYPH_COORDS_SCALE,
MASTERSIZE = _INTERNAL.GLYPH_COORDS_SCALE,
//MASTERDEPTH = 1,
//MASTERSIZE = 1 * _INTERNAL.GLYPH_COORDS_SCALE,
hexToRGBA = (hex: string): number[] => {
	if (!hex || hex === 0) return null;
	hex = hex.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16) / 255,
	g = parseInt(hex.substring(2, 4), 16) / 255,
	b = parseInt(hex.substring(4, 6), 16) / 255,
	a = parseInt(hex.substring(6, 8), 16) / 255 || 1;
	return [r,g,b,a]
},
roundNumber = (num: number, usefixed: boolean): number => {
	if(usefixed){
		return parseFloat(num.toFixed(4))
	}
	return num
};

/*
README *BoundingBox

setting bounds are MANDATORY in this engine!
but is kind tricky,
we save bounds from opentype as minimum array in "glyph._k:[]"
[glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax]
then we build the necessary bounds every time we load a file from setGBounds() using "_k" array.
NOTE: opentype may return NULL values, in this case we fail to build correct bounds!

The reason for this is to keep file size small,
and, to be better reading when we execute things!
plus, we can always change the output of setGBounds into what we need!
*/


export const setGBounds = (bounds: number[]): IGlyphXBounds => {
    const [xMin, yMin, xMax, yMax] = bounds;

    // Keep raw, high-precision un-snapped coordinate metrics
	// GLYPH_COORDS_SCALE is actual our MASTERSIZE
    const minX = xMin * MASTERSIZE;
    const minY = yMin * MASTERSIZE;
    const maxX = xMax * MASTERSIZE;
    const maxY = yMax * MASTERSIZE;

    const rangeX = (maxX - minX) || 0.01;
    const rangeY = (maxY - minY) || 0.01;

    // Pre-compute local bounding centers
    const centerX = minX + (rangeX * 0.5);
    const centerY = minY + (rangeY * 0.5);

    // Return a structured object instead of an indexed array to prevent layout typos!
    return {minX, minY, maxX, maxY, rangeX, rangeY, centerX, centerY}
};


/* Chars3D */
export class Chars3D {

static _scene;
static _cam;
static mesh: Mesh;
static plane: TransformNode;
static axis: TransformNode | null;
static material: StandardMaterial;

private static _totalchars: number = 0;
    static get totalchars() { return Chars3D._totalchars };
    static set totalchars(e: number) {
		 const val = typeof e === 'number' ? e : 0;
		 Chars3D._totalchars = val
	};

// ch: holds all our chars that we draw in screen
static #ch: Record<string, IParagraphState> = {};

// pre: pre build chars to use
static #pre: Record<string, IG3D> = {};

//fonts: hold fonts that we have loaded
static fonts: Record<string, any> = {};

// _font: basic font info for what we build, user can download (optional)
static _font: Record<string, any> = {};

// glyphs: store all glyphs that we have created, this is the main object that user can download.
static glyphs: Record<string, any> = {};

// tempkern: hold kerns to check them
static #tempkern: Record<string, any> = {};

// _textures: holds textures to use
static _textures: Record<string, any> = {};

// CHARNAME: holds char names of the font, user can download
static CHARNAMES: Record<string, any> = {};

// default colors
static defaultOutLineColor: Color3 = Color3.FromHexString(UI.OUTLINECOLOR);
static defaultEmissiveColor: Color3 = Color3.FromHexString(UI.Color1);
static defaultAmbientColor: Color3 = Color3.FromHexString(UI.Color2);
static defaultSpecularColor: Color3 = Color3.FromHexString(UI.Color3);
static defaultFrontColor: string = hexToRGBA(UI.FrontColor);
static exclude: string[] = [];
static excludeDisable: string[] = ['INFO_TXT', 'WELCOME'];


	constructor(texture, scene){
		new Performance();
		Chars3D.fonts[UI.DEFAULT_FONT] = {...oxanium};
		Chars3D._textures = texture;
		Chars3D._scene = scene;
		Chars3D._cam = scene.activeCamera;
		Chars3D.mesh = new Mesh('mesh', scene);
		Chars3D.plane = new TransformNode('plane', scene);
		// for visible tests to see where letters drawed, (add MeshBuilder)
		//Chars3D.plane = MeshBuilder.CreateSphere('sphere1', {diameter:0.5, segments: 16}, scene);
		Chars3D.plane.setEnabled(false);
		Chars3D.material = new StandardMaterial('material', scene);
		Chars3D.#preBuildVertexData(Chars3D.fonts[UI.DEFAULT_FONT], UI.DEFAULT_FONT);
		Performance.end('Charc3D %s: > It took %s ms','prebuild')
	};

	/**
		Builder
		build font glyphs from what you have select/submit, loaded from AssetsManager > addBinaryFileTask
		OR update existing Font
		@param Font|null
	*/
	static async Build(Font: any = null){
		logger.log('%cBuild: %s',logger.color.success,UI.EXPORTNAME);
		//logger.log('Build: %s',uniqueId('id'));
		
		UI.BUILDED = false;
		Chars3D.glyphs = {};

		if(Font !== null){
			Chars3D.fonts['opentypeFont'] = Font;
			Font = null;
			//reset to default
			UI._KERN = 0;
			UI.SPACING = 0;
			UI._LINE_HEIGHT = 1.0;
		};

		Chars3D.totalchars = UI.CHARS.length;
		if(!UI.SYMBOLS && Chars3D.totalchars <= 3){
			UI.LOADFILE = 'none';
			throw 'ERROR: No Chars exist!'
		};

		if(UI.SPECIFIC_LETTERS){
			logger.log('_SPECIFIC_LETTERS',UI._SPECIFIC_LETTERS.length)
		};

		const _time = Date.now(),
		_customLength = !UI.SPECIFIC_LETTERS ? Chars3D.totalchars : (UI._SPECIFIC_LETTERS.length + 2),
		//_customLength = !UI.SPECIFIC_LETTERS ? 0 : (UI._SPECIFIC_LETTERS.length + 2), /* +2 is '^' AND ' ', auto combined in download */
		_ascender = (UI.FONT_SIZE * Chars3D.fonts.opentypeFont.ascender) / Chars3D.fonts.opentypeFont.unitsPerEm,
		_descender = (UI.FONT_SIZE * Chars3D.fonts.opentypeFont.descender) / Chars3D.fonts.opentypeFont.unitsPerEm,
		_lineGap = roundNumber((_ascender + _descender + UI.LINE_HEIGHT), true), // you must add new roundGap() if you change roundNumber()
		_info = {}; /* optional info! */

		for(const [k,o] of Object.entries(Chars3D.fonts.opentypeFont.names.windows)){
			_info[k] = o.en
		};
		/* add all font info that we can take from opentype.js */
		Chars3D._font = {
			version:UI.version,
			created: _time,
			ascender: Chars3D.fonts.opentypeFont.ascender,
			descender: Chars3D.fonts.opentypeFont.descender,
			unitsPerEm: Chars3D.fonts.opentypeFont.unitsPerEm,
			kern: UI.KERN,
			defaultKern: UI.USE_DEFAULT_KERN,
			lineGap: _lineGap,
			totalchars: Chars3D.totalchars,
			is3d: UI.IS3D,
			custom: UI.SPECIFIC_LETTERS,
			charsCustomLength: _customLength,
			_info
		};
		/* optional info END */

		/* Essential _info holds basic settings for font, like kern, lineGap, spacing etc */
		Chars3D.glyphs['_info'] = {
			created: _time,
			version:UI.version,
			font:_info.postScriptName,
			ascender: Chars3D.fonts.opentypeFont.ascender,
			descender: Chars3D.fonts.opentypeFont.descender,
			unitsPerEm: Chars3D.fonts.opentypeFont.unitsPerEm,
			lineGap: _lineGap,
			kern: UI.KERN,
			defaultKern: UI.USE_DEFAULT_KERN,
			spacing: UI.DEFAULTSPACING,
			totalchars: _customLength,
			is3d: UI.IS3D,
			isCharCode: !UI.SYMBOLS ? true : false,
			charcode: !UI.SYMBOLS ? 'code' : 'char',
			isWord: false,
			chars: {
				LOWERCHARS: UI.LOWERCHARS,
				UPPERCHARS: UI.UPPERCHARS,
				NUMBERS: UI.NUMBERS,
				PUNCTUATIONS: UI.PUNCTUATION,
				SYMBOLS: UI.SYMBOLS
			},
			//special: _BUILD.special,
			custom: UI.SPECIFIC_LETTERS
		};

		if(UI.GET_CHAR_NAMES){
			//logger.log('GET_CHAR_NAMES is on');
			// tests, we don't draw anything, just to download!
			!UI.SYMBOLS ? Chars3D.#testLetters(Chars3D.fonts.opentypeFont) : Chars3D.#testSymbols(Chars3D.fonts.opentypeFont)
			UI.BUILDED = true;
		}else{
			!UI.SYMBOLS ? Chars3D.#buildLetters(Chars3D.fonts.opentypeFont) : Chars3D.#buildSymbols(Chars3D.fonts.opentypeFont)

			// if we have Glyphs over 3 then we can pre Build VertexData
			if(Object.keys(Chars3D.glyphs).length > 3){
				Chars3D.#preBuildVertexData(Chars3D.glyphs, 'opentypeFont');
				UI.BUILDED = true;
			}
		}
	};

	/*
	 Test if letters has glyphs/unicodes,
	 you can compare if the letters that you have added is supported
	*/
	static #testLetters(Font: any){

		Chars3D.CHARNAMES = {};
		Chars3D.CHARNAMES['totalletters'] = Chars3D.totalchars;
		Chars3D.CHARNAMES['total'] = 0;
		for (let i = 0; i < Chars3D.totalchars; i++) {
			const letter = UI.CHARS[i],
			charCode = letter.charCodeAt(0),
			glyph = Font.charToGlyph(letter),
			_exist = (glyph.notdef || glyph.unicodes == '') ? false : true;
			if(_exist){
				Chars3D.CHARNAMES.total++
			};

			Chars3D.CHARNAMES[i] = {
				name: letter,
				charcode: charCode ?? null,
				glyph: _exist
			}
		};
	};

	static #testSymbols(Font: any){
		Chars3D.CHARNAMES = {};
		Chars3D.CHARNAMES['total'] = 0;
		Chars3D.CHARNAMES['totalFromats'] = 0;
		Chars3D.CHARNAMES['names'] = [];
		Chars3D.CHARNAMES['formats'] = [];
		Chars3D.CHARNAMES['buildnames'] = '';

		for(let [k,v] of Object.entries(Font.glyphs.glyphs)){
			const name = v.name ?? false;
			const unicode =  v.unicode ?? false;
			const format = (!unicode || unicode.toString().length < 4) ? false : v.unicode.toString(16);
			if(name && name !== '.notdef' && format){
				Chars3D.CHARNAMES.names.push(name)
			};

			if(format){
				Chars3D.CHARNAMES.formats.push(format)
			}
		};

		Chars3D.CHARNAMES.total = Chars3D.CHARNAMES.names.length;
		Chars3D.CHARNAMES.totalFromats = Chars3D.CHARNAMES.formats.length;

		if(Chars3D.CHARNAMES.total > 1){
			const allnames = Chars3D.CHARNAMES.names.join(UI.LETTERSPACE);
			Chars3D.CHARNAMES.buildnames = allnames;
			return
		}
		if(Chars3D.CHARNAMES.totalFromats > 1){
			const allformats = Chars3D.CHARNAMES.formats.join(UI.LETTERSPACE);
			Chars3D.CHARNAMES.buildnames = allformats
		}
	};

	// build Symbols! need more tests!!!
	static #buildSymbols(Font: any){
		logger.log('BUILDING SYMBOLS');

		let _isword: boolean = false,
		Sumbols: string[] = [];
		
		// apply kern if set
		//Chars3D.glyphs._info.kern = UI.KERN;

		if(UI._SYMBOLS){
			Sumbols = UI._SYMBOLS.split(' ');
			// check if is word, the second symbol only?
			if(Sumbols[2].length > 1){
				logger.log('Symbols is word');
				_isword = true;
			}
		};

		// loop entire font glyphs
		for(let [k,v] of Object.entries(Font.glyphs.glyphs)){

			const format = !v.unicode ? false : v.unicode.toString(16);
			// need more test!!
			const _exist = !_isword ? UI.CHARS.includes(v.name) : Sumbols.includes(v.name)||Sumbols.includes(format);

			// if we have this name OR unicode and format
			if(format && _exist){
				const key = !_isword ? v.name : v.name||format;
				const glyph = Font.glyphs.get(k);

				if (glyph.advanceWidth) {
					// Create our object and start to store glyphs
					Chars3D.glyphs[key] = {
						_w: glyph.advanceWidth, // MANDATORY
						_v: null, 				// MANDATORY,
						_x: [glyph.xMin??0, glyph.yMin??0, glyph.xMax??0, glyph.yMax??0] // README *BoundingBox
					};

					 // DO NOT APPLY Default kern for SYMBOLS
					if (glyph.path && glyph.path.commands && glyph.path.commands.length) {
						Chars3D.#applyVertex(key, glyph)
					}
				}
			}
		};

		/* update info if is word */
		if(_isword){
			Chars3D.glyphs._info.isWord = true;
			Chars3D.glyphs._info.charcode = 'word'
		};

		/*
			many fonts do not have ^ caret PUNCTUANTION, is important as we use it as LINEBREAK
			if we don't find, then we try to add a custom one
		*/
		const getLineBreak = Chars3D.#getGlyphs(UI.LETTERLINEBREAK);
		Chars3D.glyphs[UI.LETTERLINEBREAK] = !getLineBreak ? {_w: UI.DEFAULTSPACING, _v: null} : {_w: getLineBreak._w, _v: null};

		// if SYMBOLS they don't have space, add one
		const getSpace = Chars3D.#getGlyphs(UI.LETTERSPACE);
		if(!getSpace){
			logger.log('Char space " " added');
			const _spacing = !UI.SPACING ? UI.DEFAULTSPACING : UI.SPACING;
			Chars3D.glyphs[UI.LETTERSPACE] = {_w: _spacing, _v: null};
			Chars3D.glyphs._info.spacing = _spacing;
			//if(!UI.SPACING){
			//	UI.SPACING = UI.DEFAULTSPACING;
			//}

		}else{
			Chars3D.glyphs[UI.LETTERSPACE] = {_w: getSpace._w, _v: null}
		}
	};
	
	static updateInfoSpacing(v: number){
		//UPDATE_SPACE
		const _S:HTMLElement = document.getElementById('UPDATE_SPACE'),
		_i: HTMLElement = _S.querySelector('#SPACING_INFO'),
		_r: HTMLElement = _S.querySelector('#SPACING');
		
		_i.textContent = v;
		_r.value = v
	};

	// build letters
	static #buildLetters(Font: any){
		let notExist = 0,
		i = 0;

		for (; i < Chars3D.totalchars; i++) {

			const letter = UI.CHARS[i],
			glyph = Font.charToGlyph(letter),
			charCode = letter.charCodeAt(0),
			_exist = (glyph.notdef || glyph.unicodes == '') ? false : true;
			
			// FIXME* this is not correct, add to array and substract after the letter that not exist!
			if(!_exist){
				logger.log('WARNING :notdef: for letter: [%s] charCode: %s',letter, charCode);
				notExist++
			};

			if (glyph.advanceWidth && _exist) {
				
				// space a.k.a ' '
				if(charCode === 32){
					// first load? add Default space
					if(UI.SPACING === 0){
						Chars3D.updateInfoSpacing(glyph.advanceWidth);
						Chars3D.glyphs._info.spacing = glyph.advanceWidth;
					}else{
						glyph.advanceWidth = UI.SPACING; // apply custom space
						Chars3D.updateInfoSpacing(UI.SPACING); // update UI info
						Chars3D.glyphs._info.spacing = UI.SPACING; // update Main info
					}
				};

				// Create our object and start to store glyphs
				const _bounds: number[] = [glyph.xMin??0, glyph.yMin??0, glyph.xMax??0, glyph.yMax??0]
				Chars3D.glyphs[charCode] = {
					_w: glyph.advanceWidth, // MANDATORY
					_v: null, 				// MANDATORY
					_x: _bounds // README *BoundingBox
				};

				// Apply default Kern if you USE_DEFAULT_KERN and if exist!
				if(!UI.SYMBOLS && UI.USE_DEFAULT_KERN){
					Chars3D.#tempkern[charCode] = {
						id: glyph.index,
						_w: glyph.advanceWidth,
						_x: _bounds // README *BoundingBox
					};
					// create _k object to hold kerns
					Chars3D.glyphs[charCode]._k = {}
				};

				// build entire glyphs
				if (glyph.path && glyph.path.commands && glyph.path.commands.length) {
					Chars3D.#applyVertex(charCode, glyph)
				}
			}
		};

		// NOTE: NOT TESTED WITH replace!!
		// apply DEFAULT KERN
		let KERNS_EXIST = false;
		if(!UI.SYMBOLS && UI.USE_DEFAULT_KERN){
			logger.log('WE USE_DEFAULT_KERN');
			for (let i = 0; i < Chars3D.totalchars; i++) {

				const letteri = UI.CHARS[i];
				const CHARi = UI.CHARS[i].charCodeAt(0);

				if(Chars3D.#tempkern[CHARi]){

					for (let j = 0; j < Chars3D.totalchars; j++){
						const CHARj = UI.CHARS[j].charCodeAt(0);
						//logger.log('letter [%] check kern i: %s j: %s',letteri,CHARi,CHARj);

						if(Chars3D.#tempkern[CHARj]){

							const addkern = Font.getKerningValue(Chars3D.#tempkern[CHARi].id, Chars3D.#tempkern[CHARj].id);
							if (addkern){
								KERNS_EXIST = true;
								//logger.log('added kern',addkern);
								Chars3D.glyphs[CHARi]._k[CHARj] = addkern
								//logger.log('addkern!! CHARi:',Chars3D.glyphs[CHARi]._k[CHARj]);
							}
						}
					}
				}
			}
		};

		//logger.log('Chars3D.tempkern', Chars3D.tempkern);
		//logger.log('Created glyphs',Chars3D.glyphs);

		/*
			many fonts do not have ^ caret PUNCTUANTION, is important as we use it as LINEBREAK
			if we don't find, then we try to add a custom one
		*/
		const getLineBreak = Chars3D.#getGlyphs(UI.LINEBREAK);
		if(!getLineBreak){
			logger.log('LineBreak not exist, added custom');
			// add custom with
			Chars3D.glyphs[UI.LINEBREAK] = {_w: UI.DEFAULTSPACING, _v: null};

			//if we use kern add an empty object
			if(UI.USE_DEFAULT_KERN){
				Chars3D.glyphs[UI.LINEBREAK]._k = {}
			}
		}else{
			//logger.log('LineBreak exist, updated');
			// reset and add width
			Chars3D.glyphs[UI.LINEBREAK] = {_w: getLineBreak._w, _v: null};

			if(UI.USE_DEFAULT_KERN){
				Chars3D.glyphs[UI.LINEBREAK]._k = getLineBreak._k
			}
		};

		// if font or SYMBOLS don't have space, add one
		const getSpace = Chars3D.#getGlyphs(UI.LINESPACE);
		if(!getSpace){
			
			const _spacing = !UI.SPACING ? UI.DEFAULTSPACING : UI.SPACING;
			logger.log('Char space " " added %s',_spacing);
			Chars3D.glyphs[UI.LINESPACE] = {_w: _spacing, _v: null};
			if(UI.USE_DEFAULT_KERN){
				Chars3D.glyphs[UI.LINESPACE]._k = {}
			};
			Chars3D.glyphs._info.spacing = _spacing
		}else{

			Chars3D.glyphs[UI.LINESPACE] = {_w: getSpace._w, _v: null};
			if(UI.USE_DEFAULT_KERN){
				Chars3D.glyphs[UI.LINESPACE]._k = getSpace._k
			}
		};

		// if we try to USE_DEFAULT_KERN above, and if the default kern is not exist, we Remove keys [_k], and update INFOS!
		//if(!UI.SYMBOLS && UI.USE_DEFAULT_KERN && !KERNS_EXIST){
		if(UI.USE_DEFAULT_KERN && !KERNS_EXIST){
			logger.log('Default kern not exist: Removed keys [_k] and update INFOS');
			for (let i = 0; i < Chars3D.totalchars; i++) {
				const _id = UI.CHARS[i].charCodeAt(0);

				if(Chars3D.glyphs[_id]){
					delete Chars3D.glyphs[_id]._k
				}
			};
			Chars3D._font.defaultKern = false;
			Chars3D.glyphs._info.defaultKern = false
		};

		// if we found any letter that does not have unicode, update totalchars
		// FIXME*
		if(notExist > 0){
			logger.log('Char notExist >>>>>>>>>>>>')
			const totalGlyphs = Object.keys(Chars3D.glyphs).length - 1; // -1 is for the '_info'
			//logger.log('Total glyphs %s',totalGlyphs);
			const _customLength = !UI.SPECIFIC_LETTERS ? totalGlyphs : (UI._SPECIFIC_LETTERS.length + 2);
			//logger.log('customLength glyphs %s',_customLength);
			
			Chars3D.totalchars = totalGlyphs;
			Chars3D.glyphs._info.totalchars = _customLength
		};


		// for any tests, always try to find letters with holes > AaBbDdOoQqR4690

		//logger.log('Created glyphs',Chars3D.glyphs);
		//console.log(Chars3D.glyphs["o".charCodeAt(0)]);
		//console.log('char O:',Chars3D.glyphs[79]);
	};

/**
	applyVertex** creates the following object..
	glyphs: JSON output (compact), structure looks like:

	Meaning			key
	width			_w
	boundaries		_x
	vertices		_v
	indices			_i
	normals			_n
	main contour	m
	holes			h
	ranges			r
	start			s
	count			c
	isHole			o
	frontCount		_f

    "charCode OR letter OR word": { // depended of what we build, created from buildLetters() || buildSymbols()
        "_w": 665,			// number: width
        "_v": [ ... ],		// array: vertices
		"_x": [ ... ],		// array: boundaries > glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax
        "_i": [ ... ],		// array: indices
        "_n": [ ... ],		// array: normals
		"_k": [ ... ],		// array: kerns < optional

		// the following object exist only when is IS3D
		"_o": [{					// array->object: contours
		  "m": [ ... ],				// array:  main contour
		  "h": [ [...], [...] ],	// arrays: holes
		  "r": [					// array->objects: ranges
			{ "s":0, "c":12, "o":0 },
			{ "s":12, "c":8, "o":1 }
		  ]
		}],
		"_f": 20			 // number: front/back vertex count
    }
*/

	static #applyVertex(key:string, glyph:any){

		const polys = [];
		// Build polygons
		glyph.path.commands.forEach(({type, x, y, x1, y1, x2, y2}) => {

			let lastPoly = polys[polys.length - 1];
			switch (type) {
				case 'M':
					polys.push(new Polygon());
					polys.at(-1).moveTo({ x, y });
					break;
				case 'L':
					polys.at(-1).lineTo({ x, y });
					break;
				case 'Q': {
					if(!_INTERNAL.STEPS){ //_SETTINGS.STEPS Change to 12 for ultra-smoothness < STEPS NOT NEED ANY MORE! REMOVE?
						polys.at(-1).conicTo({ x, y }, { x: x1, y: y1 });
					}else{
						const start = lastPoly.points[lastPoly.points.length - 1];
						for (let t = 1; t <= _INTERNAL.STEPS; t++) {
							const pct = t / _INTERNAL.STEPS;
							const tx = (1 - pct) * (1 - pct) * start.x + 2 * (1 - pct) * pct * x1 + pct * pct * x;
							const ty = (1 - pct) * (1 - pct) * start.y + 2 * (1 - pct) * pct * y1 + pct * pct * y;
							lastPoly.lineTo({ x: tx, y: ty });
						}
					}
					break;
				};
				case 'C': {
					if(!_INTERNAL.STEPS){
					polys.at(-1).cubicTo({ x, y }, { x: x1, y: y1 }, { x: x2, y: y2 });
					}else{
						const start = lastPoly.points[lastPoly.points.length - 1];
						for (let t = 1; t <= _INTERNAL.STEPS; t++) {
							const pct = t / _INTERNAL.STEPS;
							const tx = Math.pow(1 - pct, 3) * start.x + 3 * Math.pow(1 - pct, 2) * pct * x1 + 3 * (1 - pct) * Math.pow(pct, 2) * x2 + Math.pow(pct, 3) * x;
							const ty = Math.pow(1 - pct, 3) * start.y + 3 * Math.pow(1 - pct, 2) * pct * y1 + 3 * (1 - pct) * Math.pow(pct, 2) * y2 + Math.pow(pct, 3) * y;
							lastPoly.lineTo({ x: tx, y: ty });
						}
					}
					break;
				};
				case 'Z':
					lastPoly.close();
					break;
			}
		});

		// Sort contours + classify holes by descending area
		polys.sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
		// classify contours to find holes and their 'parents'
		const root = [];
		for (let i = 0; i < polys.length; ++i) {
			let P = null;
			for (let j = i - 1; j >= 0; --j) {
				// a contour is a hole if it is inside its parent and has different winding
				if (polys[j].inside(polys[i].points[0]) && polys[i].area * polys[j].area < 0) {
					P = polys[j];
					break;
				}
			};
			!P ? root.push(polys[i]) : P.children.push(polys[i])
		};

		let vertexCount = 0;
		const indices = [],
		totalPoints = polys.reduce((sum, p) => sum + p.points.length, 0),
		vertexData = new Float32Array(totalPoints * 2),
		process = (poly) => {
			// construct input for earcut
			const coords = [], holes = [];
			poly.points.forEach(({x, y}) => coords.push(x, y));
			poly.children.forEach(child => {
				// children's children are new, separate shapes
				child.children.forEach(process),
				holes.push(coords.length / 2),
				child.points.forEach(({x, y}) => coords.push(x, y));
			});

			// add vertex data
			vertexData.set(coords, vertexCount * 2),
			// add index data
			earcut(coords, holes).forEach(i => indices.push(i + vertexCount)),
			vertexCount += coords.length / 2;
		};

		root.forEach(process);
		let vertices = [],
		normals = [];

		for (let vi = 0; vi < vertexCount; vi++) {
			vertices.push(roundNumber((vertexData[vi * 2] * MASTERSIZE), UI.USE_MINIFY));
			vertices.push(roundNumber((vertexData[vi * 2 + 1] * MASTERSIZE), UI.USE_MINIFY));
			vertices.push(0);
		};
		
		VertexData.ComputeNormals(vertices, indices, normals);
		Chars3D.glyphs[key]._v = vertices;
		Chars3D.glyphs[key]._i = indices;
		Chars3D.glyphs[key]._n = normals;
		/**
		* version 2: removed object _b
		* results minify 3D file by 30~40%
		* cost, when we load file, we have extra time to build
		*/
		if(UI.IS3D){
			// Convert to compact contour structure for 3D
			const flat = pts => pts.flatMap(p => [p.x, p.y]);
			const cons = root.map(r => ({
				m: flat(r.points),
				h: r.children.map(c => flat(c.points)),
				r: [] // ranges
			}));

			// Build vertices + indices with ranges
			let off = 0;
			for (const c of cons) {
				// outer
				const mc = c.m.length / 2,
				ms = off;
				c.r.push({ s: ms, c: mc, o: 0 });
				off += mc;
				// holes
				for (const h of c.h) {
					const hc = h.length / 2,
					hs = off;
					c.r.push({ s: hs, c: hc, o: 1 });
					off += hc;
				};
			};

			// Save compact glyph data
			Chars3D.glyphs[key]._o = cons;
			// v2
			Chars3D.glyphs[key]._f = off;

		}

		/*
		// version 1: 
		if(UI.IS3D){
			// Convert to compact contour structure for 3D
			const flat = pts => pts.flatMap(p => [p.x, p.y]);
			const cons = root.map(r => ({
				m: flat(r.points),
				h: r.children.map(c => flat(c.points)),
				r: [] // ranges
			}));

			// Build vertices + indices with ranges
			const v = [];
			let off = 0;

			for (const c of cons) {
				const coords = [],
				holes = [],
				// outer
				mc = c.m.length / 2,
				ms = off;
				coords.push(...c.m);
				c.r.push({ s: ms, c: mc, o: 0 });
				off += mc;
				// holes
				for (const h of c.h) {
					const hc = h.length / 2;
					const hs = off;
					holes.push(coords.length / 2);
					coords.push(...h);
					c.r.push({ s: hs, c: hc, o: 1 });
					off += hc;
				};
				// push coords to global vertices
				v.push(...coords);
			};

			// Save compact glyph data
			Chars3D.glyphs[key]._o = cons;
			
			//V1
			Chars3D.glyphs[key]._b = {
				f: off,  // front vertex count
				v: v     // vertices2D
			}
		}
		*/
		
	};
	/* END Builder */

	/**
		Chars3D is started Here,
		once you build any font you can use it separated, without opentype, earcut, Polygon, and the above code
	*/

	/* Main 2D/3D: pre build letters to draw later */
	static #preBuildVertexData(Font: any, name: string){
		Chars3D.#pre[name] = {};
		if(UI.IS3D){
			Chars3D.#pre[name+'3D'] = {};
		}
		for(const [letter,D] of Object.entries(Font)){
			if(D._v && D._v !== null){
				Chars3D.#pre[name][letter] = Chars3D.#masterGlyph2D(D);
				if(UI.IS3D){
					Chars3D.#pre[name+'3D'][letter] = Chars3D.#masterGlyph3D(letter, D)
				}
			}
		}
	};

	/**
	 * pre create 2D vertex
	 * @param _w: number;		// width
	 * @param _x?: number[];	// bounds
	 * @param _v: number[];		// vertices
	 * @param _i: number[];     // indices
	 * @param _n: number[];		// normals
	 * @return Float32Array's IGlyphBuffers
	 IG2D REMOVED
	*/
	static #masterGlyph2D(g: IG3D): IGlyphBuffers {

		const vertCount = g._v.length / 3;
		// Pre-allocate arrays if you know the size (much faster than .push)
		const P = new Float32Array(vertCount * 3);
		const I = new Uint32Array(g._i); // g._i;
		const U = new Float32Array(vertCount * 2);
		const C = new Float32Array(vertCount * 4); // RGBA (vertCount * 4)
		const N = new Float32Array(vertCount * 3);
		const {minX, minY, rangeX, rangeY} = setGBounds(g._x);

		for (let i = 0; i < vertCount; i++) {
			const i2 = i * 2;
			const i3 = i * 3;
			const i4 = i * 4;

			const rx = g._v[i3];
			const ry = g._v[i3 + 1];
			// position
			P[i3] = rx;
			P[i3 + 1] = ry;
			P[i3 + 2] = 0;

			// Manual normals for 2D are faster than ComputeNormals
			N[i3] = 0;     // nx
			N[i3 + 1] = 0; // ny
			N[i3 + 2] = 1; // nz (or -1 depending on your coordinate system)

			// UV's
			U[i2] = (rx - minX) / rangeX;
			U[i2 + 1] = (ry - minY) / rangeY;
			// color not needed here, added when we draw
		};

		return {P, I, N, U, C, L:P.length}
	};



	/**
	 * pre create 3D vertex
	 * @param g: see > applyVertex**
	 * @return Float32Array's IGlyphBuffers
	*/
	// Main 3D: pre build letters to draw later
	static #masterGlyph3D(letter: string, g: IG3D): IGlyphBuffers {

		const P: number[] = [],
		I: number[] = [],
		U: number[] = [],
		C: number[] = [],
		N: number[] = [],
		v2: number[] = [],
		i2: number[] = g._i,
		_FC:number = g._f,
		{minX, minY, rangeX, rangeY} = setGBounds(g._x);
		
		
		// in version 2, we have this loop to merge 
		for (const c of g._o) {
			v2.push(...c.m);
			// holes
			for (const h of c.h) {
				v2.push(...h)
			};
		};

		// FRONT FACE
		for (let i = 0; i < _FC; i++) {
			P.push(v2[i * 2] * MASTERSIZE, v2[i * 2 + 1] * MASTERSIZE, 0);
			U.push((v2[i * 2] - minX) / rangeX, (v2[i * 2 + 1] - minY) / rangeY)
		};

		// BACK FACE
		const backStart = P.length / 3;
		for (let i = 0; i < _FC; i++) {
			P.push(v2[i * 2] * MASTERSIZE, v2[i * 2 + 1] * MASTERSIZE, MASTERDEPTH);
			//P.push(v2[i * 2], v2[i * 2 + 1], MASTERDEPTH);
			const u = (v2[i * 2] - minX) / rangeX;
			const v = (v2[i * 2 + 1] - minY) / rangeY;
			//U.push(u, v)
			U.push(1 - u, v)
		};

		// CAP INDICES
		for (let k = 0; k < i2.length; k += 3) {
			I.push(i2[k], i2[k+1], i2[k+2]);
			I.push(backStart + i2[k], backStart + i2[k+2], backStart + i2[k+1])
		};

		// SIDE WALLS
		// NO BEVEL IN THIS VERSION
		for (const poly of g._o) {
			// Each poly has ranges (r) which are the actual outlines
			for (const range of poly.r) {
				const { s, c } = range;
				const pts = poly.m; // The main outline points [x0, y0, x1, y1...]
				const count = pts.length / 2;

				// Calculate Perimeter for THIS range
				let totalPerimeter = 0;
				for (let i = 0; i < c; i++) {

					const next = (i + 1) % count;
					const dx = pts[next * 2] - pts[i * 2];
					const dy = pts[next * 2 + 1] - pts[i * 2 + 1];

					// Pythagorean theorem: distance = sqrt(a² + b²)
					totalPerimeter += Math.sqrt(dx * dx + dy * dy);
				}

				// build UVs
				let currentLength = 0;
				for (let i = 0; i < c; i++) {
					const iNext = (i === c - 1 ? 0 : i + 1);
					const svs = P.length / 3;

					const x0 = v2[(s + i) * 2] * MASTERSIZE,
					y0 = v2[(s + i) * 2 + 1] * MASTERSIZE;
					const x1 = v2[(s + iNext) * 2]* MASTERSIZE,
					y1 = v2[(s + iNext) * 2 + 1] * MASTERSIZE;

					const dist = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
					const uStart = currentLength / totalPerimeter;
					const uEnd = (currentLength + dist) / totalPerimeter;

					P.push(x0, y0, 1, x1, y1, 1, x1, y1, 2, x0, y0, 2);
					I.push(svs, svs + 1, svs + 2, svs, svs + 2, svs + 3);

					// Correct wrapping UVs:
					// U = Distance around the letter
					// V = Depth (0 is top of wall, 1 is back of wall)
					U.push(uStart, 0, uEnd, 0, uEnd, 1, uStart, 1);
					// 2
					//U.push(0, uStart, 0, uEnd, 1, uEnd, 1, uStart);

					currentLength += dist;
				}
			}
		};

		const finalP = new Float32Array(P);
		const finalI = new Uint32Array(I);
		const finalN = new Float32Array(P.length);
		VertexData.ComputeNormals(finalP, finalI, finalN);
		return {
			P: finalP,
			I: finalI,
			N: finalN,
			U: new Float32Array(U),
			C: new Float32Array(P.length / 3 * 4),
			L: finalP.length
		}
	};


	/* MANDATORY check and replace */
	static setUpperLower(txt:string): string{
		if(UI.SYMBOLS === false){
			if(Chars3D.glyphs._info.chars.LOWERCHARS && !Chars3D.glyphs._info.chars.UPPERCHARS){ txt = txt.toLowerCase() };
			if(!Chars3D.glyphs._info.chars.LOWERCHARS && Chars3D.glyphs._info.chars.UPPERCHARS){ txt = txt.toUpperCase() };
			if(!Chars3D.glyphs._info.chars.NUMBERS){ txt = txt.replace(UI.textnum,'') };
			if(!Chars3D.glyphs._info.chars.PUNCTUATIONS){ txt = txt.replace(UI.textpun, '') }
		};
		return txt
	};

/**
 * set data to draw
 * @param IDrawOptions, same params with draw()
 * @return IParagraphState
*/
	static #setData(X: IDrawOptions): IParagraphState {

		const _plane = !X.parent ? Chars3D.plane.clone('plane-' + X.id) : X.parent,
		_size = X.size ?? UI.FONT_SIZE,
		_fontInfo = X.font === UI.DEFAULT_FONT ? Chars3D.fonts[X.font]._info : Chars3D.glyphs._info,
		_txt = X.font === UI.DEFAULT_FONT ? X.txt : Chars3D.setUpperLower(X.txt),
		_len = _txt.length,
		_lineHeightCalc = X.font === UI.DEFAULT_FONT ? (_size * _fontInfo.lineGap *  1.4) : _size * _fontInfo.lineGap, //* UI.LINE_HEIGHT,
		_frontcolor = !X.frontcolor ? hexToRGBA(UI.FrontColor) : hexToRGBA(X.frontcolor);

		if(X.parent){
			_plane.parent = X.parent
		}else{
			_plane.position.set(X.planepos.x, X.planepos.y, X.planepos.z);
		};

		_plane.billboardMode = X.billboard ?? 7;
		_plane.setEnabled(!X.notenable);

		return {
			id: X.id,
			txt: _txt,
			plane: _plane,
			letterpos: X.letterpos ?? { x: 0, y: 0, z: 0 },
			sticky: X.sticky ?? false,
			size: _size,
			lineHeightCalc: _lineHeightCalc,
			kern: (X.kern ?? 0) + (_fontInfo.kern ?? 0),
			//spacing: !X.spacing ? _fontInfo.spacing : (_fontInfo.spacing + X.spacing),
			spacing: X.spacing ?? 0,
			frontcolor:_frontcolor,
			emissivecolor: !X.emissivecolor ? Chars3D.defaultEmissiveColor : Color3.FromHexString(X.emissivecolor),
			ambientcolor: !X.ambientcolor ? Chars3D.defaultAmbientColor : Color3.FromHexString(X.ambientcolor),
			// 3D
			depth: (X.font3d && _fontInfo.is3d) ? X.font3d : false,
			bevel: X.bevel ?? 0,
			sidewallcolor: !X.sidewallcolor ? _frontcolor : hexToRGBA(X.sidewallcolor),
			backcolor: !X.backcolor ? _frontcolor : hexToRGBA(X.backcolor),
			// Outline
			outline: !!X.outline && !X.font3d,
			outlinewidth: X.outlinewidth ?? UI.OUTLINEWIDTH,
			outlinecolor: X.outlinecolor ? Color3.FromHexString(X.outlinecolor) : Chars3D.defaultOutLineColor,
			font: X.font,
			Len: _len,
			defaultKern: !_fontInfo.defaultKern ? false : _len - 1,
			paragraph: null,
			vertexData: []
		}
	};

	/** update text, minimal version */
	static update(X: IUpdateData){
		if(X.id && X.txt.length > 0){
			if(X.txt === Chars3D.#ch[X.id].txt && Chars3D.#ch[X.id].paragraph !== null) return;

			Chars3D.#ch[X.id].Len = X.txt.length;
			Chars3D.#ch[X.id].txt = X.txt;
			if(X.frontcolor){
				Chars3D.#ch[X.id].frontcolor = hexToRGBA(X.frontcolor)
			};
			if(!Chars3D.disposeParagraph(X.id)){
				throw('Fatal error: cannot dispose paragraph with ID > '+X.id)
			};
			Chars3D.#drawParagraph(Chars3D.#ch[X.id])
		}
	};

/**
 * Chars3D main function to draw text from input.
 * @param id: 				string;
 * @param txt: 				string;
 * @param planepos: 		IPos;
 * @param parent?: 			Mesh;
 * @param callback?:		string;
 * @param font?: 			string;
 * @param size?: 			number;
 * @param letterpos?: 		IPos;
 * @param kern?: 			number;
 * @param spacing?: 		number;
 * @param lineheight?: 		number;
 * @param font3d?: 			number;
 * @param bevel?: 			number;
 * @param frontcolor?: 		string;
 * @param sidewallcolor?: 	string;
 * @param backcolor?: 		string;
 * @param emissivecolor?: 	string;
 * @param ambientcolor?: 	string;
 * @param billboard?: 		number;
 * @param notenable?: 		boolean;
 * @param outline?: 		boolean;
 * @param outlinewidth?: 	number;
 * @param outlinecolor?: 	string;
 * @param sticky?: 			number;
 *
 * actions: dispose, setData, drawParagraph
*/
	static draw(X: IDrawOptions): void {
		new Performance();
		// dispose if exist this id
		if(Chars3D.#ch[X.id]){
			Chars3D.dispose(X.id)
		};

		// set font to use
		if(!X.font){
			X.font = UI.BUILD_FONT
		};

		// set data for Letters
		Chars3D.#ch[X.id] = Chars3D.#setData(X);

		/**
			build @paragraph
		*/
		Chars3D.#drawParagraph(Chars3D.#ch[X.id]);
		Performance.end('Charc3D draw %s: > It took %s ms',X.id);
	};

	/**
	 * draw paragraph
	 * @param X from setData()
	 * creates mesh
	*/
	static #drawParagraph(X: IParagraphState): void {
		// build for "word"
		if(UI.DEFAULT_FONT !== X.font && Chars3D.glyphs._info.isWord){
			const b = [];
			X.txt.split(' ').map((x,i) => Array.prototype.push.apply(b, (i+1)%1 ? [x] : [x, ' ']));
			b.pop(); // remove last space
			X.txt = b;
			X.Len = b.length
		};

		let letterspace = 0,
		_paragraphWidth = 0;
		
		const pos = {...X.letterpos};

		for (let i = 0; i < X.Len; i++){
			let _char, g;
			if(UI.DEFAULT_FONT === X.font){
				_char = X.txt.charCodeAt(i);
				g = Chars3D.fonts[X.font][_char];
			}else{
				_char = !Chars3D.glyphs._info.isWord ? X.txt.charCodeAt(i) : X.txt[i],
				g = Chars3D.glyphs[_char];
			};

			// if we have data glyphs
			if (g) {
				//if ((_char === UI.LINEBREAK || _char === UI.LETTERLINEBREAK) && i !== 0) {
				if (_char === UI.LINEBREAK || _char === UI.LETTERLINEBREAK) {
					pos.y -=X.lineHeightCalc;
					pos.x = X.letterpos.x;
				}else{
					if (g._v !== null) {

						/* create our letter */
						const vertexLetter = UI.IS3D && X.depth ?
						Chars3D.#updateGlyphVertexData3D({
							g: Chars3D.#pre[X.font+'3D'][_char],
							pos: pos,
							size: X.size,
							depth: X.depth,
							//bevel: X.bevel,
							fc: X.frontcolor,
							sc: X.sidewallcolor,
							bc: X.backcolor
						})
						: Chars3D.#updateGlyphVertexData2D({
							g: Chars3D.#pre[X.font][_char],
							pos: pos,
							size: X.size,
							color: X.frontcolor
						});
						// store vertexLetter
						Chars3D.#ch[X.id].vertexData.push(vertexLetter);

					};
					
					letterspace = 0;

					// apply position for default font Kern (if exist)
					if(UI.DEFAULT_FONT !== X.font && !Chars3D.glyphs._info.isWord && X.defaultKern && i < X.defaultKern){
						const kern = Chars3D.fonts[X.font][letter]._k[X.txt.charCodeAt(i + 1)];
						if (kern) letterspace += kern
					};

					// apply position for custom Kern 
					if(X.kern){
						letterspace += X.kern
					};

					// set position for letter and spacing 
					letterspace += g._w + X.spacing;
					pos.x += X.size * letterspace * MASTERSIZE;

					// set maximum paragraph width, reset and apply x,y,line for the next letter 
					if(pos.x >= _paragraphWidth){
						_paragraphWidth = pos.x
					}

				}
			}
		};

		if (!Chars3D.#ch[X.id].vertexData.length) {
			throw 'Error? No mesh letters to merge! ID: '+X.id
		};

		// merge charMesh and create material
		const paragraphMesh = Chars3D.#mergeVertexData(X.id, Chars3D.#ch[X.id].vertexData),
		charMaterial = Chars3D.material.clone('material-'+X.id);
		//charMaterial.useVertexColors = true;

		// apply material
		paragraphMesh.material = charMaterial;

		// place paragraph to plane
		paragraphMesh.parent = X.plane;

		// set text position in center of parent
		const _posx = X.letterpos.x === 0 ? _paragraphWidth / 2 : (_paragraphWidth / 2) - X.letterpos.x,
		_posy = X.letterpos.y === 0 ? pos.y / 2 : (pos.y / 2) - X.letterpos.y;
		paragraphMesh.position.set(-_posx, -_posy, X.letterpos.z);

		// set outline
		if(X.outline){
			paragraphMesh.renderOutline = true;
			paragraphMesh.outlineWidth = X.outlinewidth;
			paragraphMesh.outlineColor = X.outlinecolor;
		};

		if(X.plane.billboardMode !== 7){
			charMaterial.backFaceCulling = false
		};

		// set colors
		charMaterial.emissiveColor = X.emissivecolor;
		charMaterial.ambientColor = X.ambientcolor;
		charMaterial.specularColor = Chars3D.defaultSpecularColor;


		// store paragraph to use later again
		Chars3D.#ch[X.id].paragraph = paragraphMesh;

		if(X.sticky){
			Chars3D.setSticky(X.plane, X.sticky)
		}
	};


	/* set Sticky to any text, most used for buttons/logo */
	static setSticky(plane: TransformNode, distance: number): void {
		Chars3D._scene.onBeforeRenderObservable.add(() => {
			const forward = Chars3D._cam.getForwardRay().direction;
			plane.position = Chars3D._cam.position.add(forward.scale(distance))
		})
	};

/**
 * update Glyph Vertex Data 3D
 * master g: IGlyphBuffers
 * @param P: Float32Array; 		Positions
 * @param I: Uint32Array;  		Indices number[];
 * @param N: Float32Array; 		Normals
 * @param U: Float32Array; 		UVs
 * @param C: Float32Array; 		Colors
 * @param L: number;			Positions length
 * END g:
 * @param pos:{x,y,x}			text position
 * @param size: number			font size
 * @param bevel: number;		bevel size // NOT EXIST IN THIS VERSION
 * @param fc: number[];			Front Color
 * @param sc: number[]; 		Side Color (used for bevel and sides)
 * @param bc: number[]; 		Back Color
 * @returns VertexData
*/

	static #updateGlyphVertexData3D(X: IGlyphVertexData3D): VertexData {
		const p = new Float32Array(X.g.L);
		const mp = X.g.P;
		const c = new Float32Array((X.g.L / 3) * 4);

		for (let i = 0; i < X.g.L; i += 3) {
			const i4 = (i / 3) * 4;
			const mz = mp[i + 2]; // Get Master Z to identify the "layer"

			// X and Y always scale by size
			p[i] = mp[i] * X.size + X.pos.x;
			p[i + 1] = mp[i + 1] * X.size + X.pos.y;

			if (mz === 0) { // Front Face / Inset
				p[i + 2] = X.pos.z;
				c.set(X.fc, i4);
			} else if (mz === 1) { // Shoulder (Bevel Edge)
				p[i + 2] = X.pos.z; //pos.z + X.bevel; NO BEVEL in this Version
				c.set(X.sc, i4);
			} else { // Back Face (Master Z was 2)
				p[i + 2] = X.pos.z + X.depth;
				c.set(X.bc, i4);
			}
		};

		const vd = new VertexData();
		vd.positions = p;
		vd.indices = X.g.I;
		vd.normals = X.g.N; // Note: For high-precision lighting, normals may need recalculation if depth changes drastically
		vd.uvs = X.g.U;
		vd.colors = c;
		return vd
	};

/**
	update Glyph Vertex Data 2D
    master: g:
	@param P: Float32Array; 	Positions
    @param I: Uint32Array;  	Indices number[];
    @param N: Float32Array; 	Normals
    @param U: Float32Array; 	UVs
    @param C: Float32Array; 	Colors
	@param L: number;			Positions length
	END g:
	@param pos: {x,y,x}			text position
	@param size: number; 		font size
	@param color: number[];		front color r.g.b.a
	@returns VertexData
*/
	static #updateGlyphVertexData2D(X: IGlyphVertexData2D): VertexData {

		const vertCount: number = X.g.L / 3;
		const p: number[] = new Float32Array(X.g.L);
		const c: number[] = new Float32Array(vertCount * 4); // Create new color buffer

		for (let i = 0; i < vertCount; i++) {
			const i3 = i * 3;
			const i4 = i * 4;

			// Update Positions
			p[i3] = X.g.P[i3] * X.size + X.pos.x;
			p[i3 + 1] = X.g.P[i3 + 1] * X.size + X.pos.y;
			p[i3 + 2] = X.g.P[i3 + 2] * X.size + X.pos.z;

			// Update Colors in the same pass
			c[i4]  = X.color[0];
			c[i4 + 1] = X.color[1];
			c[i4 + 2] = X.color[2];
			c[i4 + 3] = X.color[3];
		};

		const vd = new VertexData();
		// return master static structural data
		vd.indices = X.g.I;
		vd.normals = X.g.N;
		vd.uvs = X.g.U;
		vd.positions = p;
		vd.colors = c;
		return vd
	};

	// Main merge Vertex Data, and apply to Mesh
	// NOTE: this is the FIRST version of merger, an ungly and slow way to Merge,
	// i leaved like this only because is easy to understand, and might you want to build something for scratch
	static #mergeVertexData(id: string, vds: VertexData[]): Mesh {
		let totalVertices: number = 0,
		totalIndices: number = 0,
		vertexOffset: number = 0,
		indexOffset: number = 0,
		hasColors: boolean = false,
		hasUVs: boolean = false;

		// calculate totals and check for optional data
		for (const vd of vds) {
			totalVertices += vd.positions.length / 3;
			totalIndices += vd.indices.length;
			if (vd.colors && vd.colors.length > 0) {hasColors = true};
			if (vd.uvs && vd.uvs.length > 0) {hasUVs = true};
		};

		// allocate buffers TypedArrays
		const P = new Float32Array(totalVertices * 3), 	// Positions
		N = new Float32Array(totalVertices * 3), 		// Normals
		I = new Uint32Array(totalIndices),       		// Indices
		C = hasColors ? new Float32Array(totalVertices * 4) : null, // Color
		U = hasUVs ? new Float32Array(totalVertices * 2) : null; 	// UVs (2 floats per vertex)

		// merge loop
		for (const vd of vds) {
			const vertCount = vd.positions.length / 3;

			// positions and normals (3 floats per vertex)
			P.set(vd.positions, vertexOffset * 3);
			N.set(vd.normals, vertexOffset * 3);

			// colors (4 floats per vertex)
			if (C && vd.colors) {
				C.set(vd.colors, vertexOffset * 4)
			};

			// UVs (2 floats per vertex)
			if (U && vd.uvs) {
				U.set(vd.uvs, vertexOffset * 2)
			};

			// indices
			for (let i = 0; i < vd.indices.length; i++) {
				I[indexOffset + i] = vd.indices[i] + vertexOffset
			};

			vertexOffset += vertCount;
			indexOffset += vd.indices.length
		};

		// Create Mesh and Apply Data
		const mesh = Chars3D.mesh.clone('M-' + id),
		_M = new VertexData();

		_M.positions = P;
		_M.indices = I;
		_M.normals = N;
		if (C) {_M.colors = C};
		if (U) {_M.uvs = U};

		_M.applyToMesh(mesh);
		return mesh
	};

	static getCH(s: string) {
		const {[s]:v}=Chars3D.#ch;
		return !v?0:v
	};

	static #getGlyphs(s: string) {
		const {[s]:v}=Chars3D.glyphs;
		return !v?0:v
	};

	/**
	 * Enable Or Disable text
	 * @param enable: boolean;
	 * @param name: string;
	 * @param visibletime?: number;
	*/
	static drawEnableOrDisable(X: IEnableOrDisable): void {

		for(const id in Chars3D.#ch){
			if(X.id === id){
				!X.enable ? Chars3D.disable(X.id) : Chars3D.enable(X.id)
			}else if(!Chars3D.exclude.includes(id)){
				!X.enable ? Chars3D.enable(id) : Chars3D.disable(id)
			}
		};

		if(X.visibletime){
			setTimeout(()=>{
				Chars3D.drawEnableOrDisable({enable:true, id:'WELCOME'});
			},X.visibletime)
		}
	};

	static disable(id: string): void {
		if(!Chars3D.#ch[id]){return};
		Chars3D.#ch[id].plane.setEnabled(false)
	};

	static enable(id: string): void {
		if(!Chars3D.#ch[id]){return};
		Chars3D.#ch[id].plane.setEnabled(true)
	};

    static disposeParagraph(id: string): boolean{
		if(!Chars3D.#ch[id]){return false};
		Chars3D.#ch[id].paragraph.dispose();
		Chars3D.#ch[id].paragraph = null;
		Chars3D.#ch[id].vertexData=[];
		return true
    };

	static disposeAll(excludeID: string[] = []): void {

		for(const id in Chars3D.#ch){
			if(excludeID.includes(id)){
			}else{
				!Chars3D.excludeDisable.includes(id) ? Chars3D.dispose(id) : Chars3D.disable(id)
				/*
				if(Chars3D.exclude.includes(id)){
					Chars3D.disable(id)
				}else{
					Chars3D.dispose(id)
				}
				*/
			}
		}
	};

    static dispose(id:string): boolean {

		if(!Chars3D.#ch[id]){return false};

		if(Chars3D.#ch[id].paragraph !== null){
			Chars3D.#ch[id].paragraph.dispose(),
			Chars3D.#ch[id].vertexData=[];
		};

		Chars3D.#ch[id].plane.dispose();
		delete Chars3D.#ch[id];
		return true
    }

}