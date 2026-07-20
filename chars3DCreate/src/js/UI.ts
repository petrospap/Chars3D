import type {ILetters,ILogger,ILogType} from './interfaces.ts';

/** UI SETTINGS: TS v0.3 */

/*
basic LETTERS that build this App

REMOVED CHARS: '\'',
USE TAB "/t" for line break??? Nah!!

USED CHARS:
a b c d e f g h i j k l m n o p q r s t u v w x y z
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
0 1 2 3 4 5 6 7 8 9
~ ` ! @ # $ % & * ( ) _ + - = [ ] { } ; : , . < > / ? | " ’


Example SYMBOLS for MaterialSymbolsOutlined.ttf
designicons SYMBOLS you can view FROM: https://fonts.google.com/icons?icon.category=action&icon.size=24&icon.color=%231f1f1f&icon.platform=web&icon.set=Material+Icons&icon.style=Outlined
codepoints && fonts FROM: https://github.com/google/material-design-icons/tree/master/variablefont
SYMBOLS:['language','stadia_controller','vpn_key','sports_score','check_box_outline_blank','apps']

-------------------------
Successful tests/failures, fonts used from:
https://fonts.google.com/
https://github.com/sevmeyer/oxanium
https://kenney.nl/assets/kenney-fonts
https://www.fontspace.com/


N:	id:				  		file:
1)	oxaniumextralight 		Oxanium-ExtraLight.ttf - 2D and 3D
2)  oxaniumregular			Oxanium-Regular.ttf >>
3) 	phenomenathin 			Phenomena-Thin.otf - 2D  3D/has some issues
4) 	ruel 					Ruel.ttf - 2D and 3D
5) 	queer 					Queer.ttf - 2D and 3D
6) 	maison	 				Maisondeartisan.otf < lower & upper only, No numbers, punctuantion - Failure for 3D
7) 	omegle	 				Omegle.otf - 2D - Failure for 3D
8) 	choco 					ChocoChici.ttf - 2D and 3D
9) 	moogalator	 			Moogalator.ttf - lower only < (complex font with lot of holes) Failure for 3D
10) moonhouse 				Moonhouse.ttf - lower only < polygon issues with letters 0,6,9 - 2D - 3D success
11) digital7 				Digital7.ttf - upper only - 2D and 3D
12) spicyrice 				SpicyRice-Regular.ttf - 2D and 3D < creates big file!
13) bebas 					BEBAS.ttf - upper only 2D and 3D
14) combinemscript	 		CombineMantiraScript.otf - 2D - 3D has issues
15) combinemsans 			CombineMantiraSans.otf - upper only - 2D - 3D has issues
16) download				CombineMantiraSans.otf - upper only - SPECIFIC LETTERS TO DOWNLOAD
17) auseklisymbols	 		Auseklis-symbols.ttf  - symbols only ? i am sure that i have created with older version| failed with new!!
18) ressica 				Ressica.ttf - upper/lower only, failed in some PUNCTUATION
19) ubuntu 					Ubuntu-Th.ttf -  2D - 3D
20) designicons 			MaterialSymbolsOutlined.ttf - symbols only 1
21) nerdsymbols 			SymbolsNerdFont-Regular.ttf - symbols only
22) devicons 				devicons.ttf -  symbols only
23) fontawesomesolid 		FontAwesome7Solid-900.otf - symbols only
24) fontawesomeregular	 	FontAwesome7Regular-400.otf - symbols only
25) dmmaykr, 				DmMaykr-8MR90.ttf - LOWERCHARS AND NUMBERS only, is symbol
26) droidsans,				droidsans.ttf - 2D and 3D
27) stylishcalligraphy		StylishCalligraphy.ttf - 2D and 3D
28) disco					SummerFavourite.ttf -  LOWERCHARS - 2D -3D Failure in letters o, q, Q, O
29) discob					Rambors.ttf - 2D - 3D has issues
30) kenneypixel				KenneyPixel.ttf - 2D and 3D
31) symbolsoutlined 		MaterialSymbolsOutlined.ttf - 2D and 3D - has issues on some symbols - symbols only
32) symbolssharp 			MaterialSymbolsSharp.ttf - 2D and 3D - has issues on some symbols - symbols only
*/

// custom log
class Logger {
container: HTMLElement;

_log: HTMLElement;
_div: HTMLDivElement;
//_reset: HTMLButtonElement;
_useConsole: boolean;
_useHtml: boolean;

readonly color: ILogType = {
	error: 'background:red;',
	info: 'background:blue;',
	success: 'background:green'
};

    constructor(X:ILogger) {
		this._useConsole = X.useConsole;
		this._useHtml = X.useHtml;
		
		if(this._useHtml){
			this.container = document.getElementById(X.containerId);
			if (!this.container) throw new Error(`Logger: #${containerId} not exist`);

			this._log = this.container.querySelector<HTMLElement>('#log');
			if (!this._log) throw new Error(`Logger: div #log not exist`);
			
			const _reset:HTMLButtonElement = this.container.querySelector<HTMLButtonElement>('#reset');
			_reset.addEventListener('click', () => {
				this._log.innerHTML = ''
			});

			this._div = document.createElement('div');
		}
    };
	

    private _format(args: any[]): { text: string; css: string } {
        const cloneArgs = [...args];
        const str: string = cloneArgs.shift();
        const hasColor: boolean = str.includes('%c');
        const css: string = hasColor ? cloneArgs.shift() : '';
        const separators: number = (str.match(/%s/g) || []).length;

        if (cloneArgs.length === 1 && separators === 0 && !hasColor) {
            const val = cloneArgs[0];
            const display = typeof val === 'object' && val !== null
                ? JSON.stringify(val, null, 2)
                : String(val);
            return { text: `${str} ${display}`, css };
        };

        let argIndex = 0;
        const text = str
            .replace(/%c/g, '')
            .replace(/%s/g, () => {
                const val = cloneArgs[argIndex++];
                return typeof val === 'object' && val !== null
                    ? JSON.stringify(val)
                    : val !== undefined ? String(val) : '';
            }).trim();

        return { text, css };
    }

    public log(...args: any[]): void {
		if(this._useConsole){
			console.log(...args)
		};
		
		if(this._useHtml){
			const { text, css } = this._format(args);
			const d = this._div.cloneNode(); //as HTMLDivElement;
			if (css) d.style.cssText = css;
			d.innerText = text;
			this._log.appendChild(d)
		}
    }

    //clear(): void {
    //    this._log.innerHTML = ''
    //}
};

export const logger = new Logger({containerId:'logger', useHtml:true, useConsole:false});
/*
logger usage, divid, useHtml useConsole;
export const logger = new Logger('divID', true);

logger.log('simply log');
logger.log('display an object', { key: 'val' });
logger.log('WARNING error: [%s] type: %s', error, type);
logger.log('%cApp: [%s] on [%s]', logger.color.success, 'is started', App._Date);
*/


// Internal to create polygons, vertices, indices, probably you leave it as is
// NOTE: those values are CRITICAL for building polygons, can create wrong 2D/3D polygons if not tuned correctly!
export const _INTERNAL = {
MAX_BEZIER_STEPS: 20, // (DEFAULT:20): 10, 20, 40 <- lower value creates precise polygons + bigger file
BEZIER_STEP_SIZE: 40, // (DEFAULT:40.0): 20.0, 40.0, 80.0 <- lower value creates precise polygons + bigger file
GLYPH_COORDS_SCALE: 0.001, // DO NOT CHANGE!
STEPS: false // 12
};

// for background
export const GRADIENT = {
purple: ['#9D00FF','#3C0061'],
BlackGreen: ['#6c7971','#000000'],
BlackWhite1:  ['#bec1c0','#111111'],
Green1: ['#7ae48e','#145e22'],
Blue1: ['#aaf5ef','#216696'],
Yellow1: ['#f5eb9b','#e6b10e'],
Red1: ['#f53d72','#8a0a2e']
};



export class Performance{
static _start: number;
	constructor(){
		Performance._start = performance.now()
	};

	static end(txt:string, e:number, log3d: boolean = false): number{//string
		const timeEnd = performance.now() - Performance._start;
		logger.log(txt,e,timeEnd);
		if(log3d){
			logger.log3D(txt,timeEnd)
		}
		return timeEnd
	}
};

export class UI{

// REGEX Sanitization
static readonly textpun = /[`~!@#$%&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi; // replace punctuantion
static readonly textnum = /\d+|^\s+|\s+$/g; // replace numbers
static readonly onlyPun = /[\p{L}\p{N}]/gu; // replace all letters + numbers
static readonly onlyLetters = /[^\p{L}\s]/gu; // \p{L} matches any letter in any language (Greek, Chinese, etc.)
static readonly onlyNumbers = /[^\p{N}\s]/gu; // \p{N} matches any number

// ABJUST setings
private static _EXPORTNAME: string = 'default';
    static get EXPORTNAME() {  return UI._EXPORTNAME }
    static set EXPORTNAME(e: string) {
        // Remove everything except letters (Universal/International)
        UI._EXPORTNAME = e.replace(UI.textpun, '').trim() || 'default';
    }

private static _FILENAME: boolean | string = false;
    static get FILENAME() { return UI._FILENAME };
    static set FILENAME(e: string) {
        UI._FILENAME = e
    };

private static _IS3D: boolean = false;
    static get IS3D() {  return UI._IS3D };
    static set IS3D(e: boolean) {
		UI._IS3D = e
	};

private static _LOWERCHARSB: boolean = true;
    static get LOWERCHARS() { return UI._LOWERCHARSB };
    static set LOWERCHARS(e: boolean) {
		UI._LOWERCHARSB = e // !!e
	};

private static _UPPERCHARSB: boolean = true;
    static get UPPERCHARS() { return UI._UPPERCHARSB };
    static set UPPERCHARS(e: boolean) {
		UI._UPPERCHARSB = e
	};

private static _NUMBERSB: boolean = true;
    static get NUMBERS() { return UI._NUMBERSB };
    static set NUMBERS(e: boolean) {
		UI._NUMBERSB = e
	};

private static _PUNCTUATIONB: boolean = true;
    static get PUNCTUATION() { return UI._PUNCTUATIONB };
    static set PUNCTUATION(e: boolean) {
		UI._PUNCTUATIONB = e
	};

// SYMBOLS: false OR true
// NOTE about SYMBOLS: SYMBOLS we mean that font file has symbols ONLY
// the NAME of the symbol is a word, example > 'star' from FontAwesome
// OR the font have symbols and the NAMES correspond to letters,
// when you set SYMBOLS to true, keys stored as "letter" OR "word" and not as "charCode"
// NOTE: if is ONLY WORD you must set LOWERCHARS, UPPERCHARS, NUMBERS, PUNCTUATION to FALSE
private static _SYMBOLSB: boolean = false;
    static get SYMBOLS() {return UI._SYMBOLSB };
    static set SYMBOLS(e: boolean) {
        UI._SYMBOLSB = e
    };
//private static _LOWERCHARS_: string = 'a b c d e f g h i j k l m n o p q r s t u v w x y z';
private static _LOWERCHARS_: string[] = 'abcdefghijklmnopqrstuvwxyz';
    static get _LOWERCHARS() { return UI._LOWERCHARS_ };
    static set _LOWERCHARS(e: string) {
		UI._LOWERCHARS_ = e.replace(UI.onlyLetters, '').toLocaleLowerCase().trim();
    };
//private static _UPPERCHARS_: string = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z';
private static _UPPERCHARS_: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    static get _UPPERCHARS() {  return UI._UPPERCHARS_ };

    static set _UPPERCHARS(e: string) {
		UI._UPPERCHARS_ = e.replace(UI.onlyLetters, '').toLocaleUpperCase().trim()
    };

private static _NUMBERS_: string[] = '0123456789';
    static get _NUMBERS() { return UI._NUMBERS_ };

    static set _NUMBERS(e: string) {
		const val = e.replace(UI.onlyNumbers,'');
		UI._NUMBERS_ = val;
    };

private static _PUNCTUATION_: string[] = '~`!@#$%&*()_+-=[]{};:,.<>/?|"’';
    static get _PUNCTUATION() {  return UI._PUNCTUATION_ };
	static set _PUNCTUATION(e: string) {
		// Keep only symbols/punctuation, remove letters and numbers
		UI._PUNCTUATION_ = e.replace(UI.onlyPun, '')
	}

private static _SYMBOLS_: string = '';
    static get _SYMBOLS() { return UI._SYMBOLS_ };
    static set _SYMBOLS(e: string[]) {
        UI._SYMBOLS_ = e
    };

private static SPECIFIC_LETTERSB: boolean = false;
    static get SPECIFIC_LETTERS() { return UI.SPECIFIC_LETTERSB };
    static set SPECIFIC_LETTERS(e: boolean) {
        UI.SPECIFIC_LETTERSB = e
    };

private  static _SPECIFIC_LETTERS_: string = '';
    static get _SPECIFIC_LETTERS() { return UI._SPECIFIC_LETTERS_ };
    static set _SPECIFIC_LETTERS(e: string) {
        UI._SPECIFIC_LETTERS_ = e
    };

// GET_CHAR_NAMES: if is set to true then you can download ALL the symbol/charcodes names for this font,
// nothing builds, is only to get info, and see what you need to build, very helpful if you build SYMBOLS from above.
private static _GET_CHAR_NAMESB: boolean = false;
    static get GET_CHAR_NAMES() { return UI._GET_CHAR_NAMESB };
    static set GET_CHAR_NAMES(e:boolean) {
        UI._GET_CHAR_NAMESB = e // !!e
    };

// USE_DEFAULT_KERN : false OR true, load default kern of font!
// DO NOT USE WITH SYMBOLS:true
// NOTE: the file size and code execution can increase significantly,
// without significant benefits since we don't use pixels
private static _USE_DEFAULT_KERNB: boolean = false;
    static get USE_DEFAULT_KERN() { return UI._USE_DEFAULT_KERNB };
    static set USE_DEFAULT_KERN(e: boolean) {
        UI._USE_DEFAULT_KERNB = e
    };

// NUMBERS (Float/Minus/Zero)
private static _KERN: number = 0;
    static get KERN() { return UI._KERN };
    static set KERN(e: any) {
        const val = typeof e === 'number' ? e : parseFloat(e);
        UI._KERN = isNaN(val) ? 0 : val;
    };

// SPACING: number i.e 200 OR false OR -200, This value is a custom width of the space a.k.a (space width+SPACING)!
private static _SPACING: number = 0;
    static get SPACING() { return UI._SPACING };
    static set SPACING(e: any) {
		//parseFloat(e);
        const val = typeof e === 'number' ? e : parseFloat(e);
        UI._SPACING = isNaN(val) ? 0 : val
    };

private static _LINE_HEIGHT: number = 1.0;
    static get LINE_HEIGHT() { return UI._LINE_HEIGHT }
    static set LINE_HEIGHT(e: any) {
        const val = typeof e === 'number' ? e : parseFloat(e);
        // Clamp between 0.1 and 5.0 to prevent 3D mesh explosion
        UI._LINE_HEIGHT = isNaN(val) ? 1.0 : val //Math.max(0.1, Math.min(val, 5.0));
    };

private static _USE_MINIFY: boolean = true;
    static get USE_MINIFY() { return UI._USE_MINIFY };
    static set USE_MINIFY(e: boolean) {
        UI._USE_MINIFY = e
    };
// END ABJUST


private static _LoadFile: string = 'none';
	static get LOADFILE() {
        return UI._LoadFile
    };
    static set LOADFILE(e: string) {
        UI._LoadFile = e
    };

private static _BUILDED: boolean = false;
    static get BUILDED() {
        return UI._BUILDED
    };

    static set BUILDED(e: boolean) {
        UI._BUILDED = e
    };

static CHARS: Record<string, any> = {};
static LETTERS: Record<string, ILetters> = {};

static BCHARS: Record<string, any> = {};
static BLETTERS: Record<string, any> = {};
//static _SPECIFIC_LETTERS_TO_DOWNLOAD: any;
static STEPS: number = 0;

// for 2D only, outline width
static OUTLINEWIDTH: number = 0.01;

// default colors, they can changed to any, those used when you draw text
static OUTLINECOLOR: string = '#222222';
static Color1: string = '#2a2a21';
static Color2: string = '#ffffe0';
static Color3: string = '#ffffff';
static FrontColor: string = '#ffffff';

//static readonly FILEPATH: string = '/fonts/';
static readonly DEFAULT_FONT: string = 'oxanium'; 		// DO NOT CHANGE except if you change DEFAULT FONT
static readonly BUILD_FONT: string = 'opentypeFont'; 	// DO NOT CHANGE
static readonly LINESPACE: number = 32; 				// charCode of space ' '
static readonly LINEBREAK: number = 94; 				// charCode of '^', you can change this to any keyboard SYMBOL, used as linebreak i.e text > "line^break"
static readonly LETTERLINEBREAK: string = '^';			// DO NOT CHANGE, except if you change the above LINEBREAK
static readonly LETTERSPACE: string = ' ';
static DEFAULTSPACING: number = 600;					// Default custom space width
static readonly version: string = '0.0.3';
static readonly FONT_SIZE: number = 1; 					// leave it as is, you can change this after when you write text to any size


	static initialize(){
		// set string letters to array str.replaceAll(' ', '')
		UI.LETTERS = {
			LOWERCHARS: !UI._LOWERCHARS ? '' : UI._LOWERCHARS.replaceAll(' ', ''),
			UPPERCHARS: !UI._UPPERCHARS ? '' : UI._UPPERCHARS.replaceAll(' ', ''),
			NUMBERS: !UI._NUMBERS ? '' : UI._NUMBERS.replaceAll(' ', ''),
			PUNCTUATION: !UI._PUNCTUATION ? '' : UI._PUNCTUATION.replaceAll(' ', ''),
			SYMBOLS: !UI._SYMBOLS ? '' : UI._SYMBOLS.split(' '),
			SPECIFIC_LETTERS: !UI._SPECIFIC_LETTERS ? '' : UI._SPECIFIC_LETTERS.replaceAll(' ', '')
		};

		// chars to build
		UI.#BuildChars(UI.LETTERS)
	};

	/*
		Build an array of Chars, from what you have set in html panel
	*/
	static #BuildChars(OBJ: string[]) {
		const _chars = [],
		_BUILD = {
			LOWERCHARS: UI.LOWERCHARS,
			UPPERCHARS: UI.UPPERCHARS,
			NUMBERS: UI.NUMBERS,
			PUNCTUATION: UI.PUNCTUATION,
			SYMBOLS: UI.SYMBOLS,
			//SPECIFIC_LETTERS: UI.SPECIFIC_LETTERS
		};

		_chars.push([UI.LETTERLINEBREAK]);
		for (const e in _BUILD) {
			_BUILD[e] && _chars.push(...OBJ[e])
		};

		_chars.push([UI.LETTERSPACE]);
		UI.CHARS = _chars.flat();
	};

	static BuildUI(F: string[]){
		let _opt = `<option value="">--- Choose a font to build ---</option>`;

		for(const n in F){
			_opt += `<option value="${F[n]}">${F[n]}</option>`
		};

		const navpanel = document.getElementById('navpanel'),
		ul = document.createElement('ul');
		ul.id = 'nav';
		/*
		UI._RESET = {
			EXPORTNAME: UI.EXPORTNAME,
			IS3D: UI.IS3D,
			LOWERCHARS: UI.LOWERCHARS
		}
		*/

ul.innerHTML = `
<li class="header">
	<div class="space"><b>Build New Char3D v:${UI.version}</b><button id="close"></button></div>
</li>

<li class="input">
	<div class="space"><label for="FILENAME">Select a font:</label><span class="tip"><tool-tip data-tip="Fonts must be added in /public/fonts/ If you add new one you must reload NPM/vite"></tool-tip></span></div>
	<select name="FILENAME" id="FILENAME" class="act" reset="${UI.FILENAME}">${_opt}</select>
</li>

<li class="input">
	<div class="space"><label for="EXPORTNAME">EXPORT NAME: file name you download.</label><span class="tip"><tool-tip data-tip="ONLY LOWER CHARS, NO PUNCTUATION, ONE WORD"></tool-tip></span></div>
	<input type="text" id="EXPORTNAME" name="EXPORTNAME" class="act" reset="${UI.EXPORTNAME}" placeholder="Set a name" />
</li>

<li class="check">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="IS3D" class="act" name="IS3D" reset="${UI.IS3D}" />
			<label for="IS3D" >IS3D: Check to build 3D</label>
		</div>
		<span class="tip"><tool-tip data-tip="Build 2D or 3D font. Default is 2D, 3D contains also 2D data. TIP: if this font is BIG and used also for 2D, consider to create two different files, 2D and 3D"></tool-tip></span>
	</div>
</li>

<li class="text">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="LOWERCHARS" class="act switch" reset="${UI.LOWERCHARS}" name="LOWERCHARS" checked />
			<label for="LOWERCHARS">LOWERCHARS</label>
		</div>
	<span class="tip"><tool-tip data-tip="Lower chars only"></tool-tip></span>
	</div>

	<textarea id="_LOWERCHARS" class="act" name="_LOWERCHARS" reset="${UI._LOWERCHARS}">${UI._LOWERCHARS}</textarea>
</li>
<li class="text">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="UPPERCHARS" class="act switch" reset="${UI.UPPERCHARS}" name="UPPERCHARS" checked />
			<label for="UPPERCHARS">UPPERCHARS</label>
		</div>
		<span class="tip"><tool-tip data-tip="Upper chars only"></tool-tip></span>
	</div>
	<textarea id="_UPPERCHARS" class="act" reset="${UI._UPPERCHARS}" name="_UPPERCHARS">${UI._UPPERCHARS}</textarea>
</li>
<li class="text">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="NUMBERS" class="act switch" reset="${UI.NUMBERS}" name="NUMBERS" checked />
			<label for="NUMBERS">NUMBERS</label>
		</div>
		<span class="tip"><tool-tip data-tip="Numbers only"></tool-tip></span>
	</div>
	<textarea id="_NUMBERS" class="act" reset="${UI._NUMBERS}" name="_NUMBERS">${UI._NUMBERS}</textarea>
</li>
<li class="text">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="PUNCTUATION" class="act switch" reset="${UI.PUNCTUATION}" name="PUNCTUATION" checked />
			<label for="PUNCTUATION">PUNCTUATION</label>
		</div>
		<span class="tip"><tool-tip data-tip="PUNCTUATION only, you should check what PUNCTUATION have the font you build."></tool-tip></span>
	</div>
	<textarea id="_PUNCTUATION" class="act" reset="${UI._PUNCTUATION}" name="_PUNCTUATION">${UI._PUNCTUATION}</textarea>
</li>
<li class="text">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="SYMBOLS" class="act" reset="${UI.SYMBOLS}" name="SYMBOLS" />
			<label for="SYMBOLS">SYMBOLS: WORDS ONLY, SPACE SEPARATED</label>
		</div>
		<span class="tip"><tool-tip data-tip="About SYMBOLS: SYMBOLS we mean that font file has symbols ONLY? the NAME of the symbol is a word, example > 'star' from FontAwesome OR the font have symbols and the NAMES correspond to letters, when you check SYMBOLS, keys stored as 'word' and not as 'charCode' NOTE: you must ADD ONLY WORDS, SPACE SEPARATED, and uncheck LOWERCHARS, UPPERCHARS, NUMBERS, PUNCTUATION. IF you don't know what names to use, check [Get char names] bellow."></tool-tip></span>
	</div>
	<textarea id="_SYMBOLS" class="act" reset="${UI._SYMBOLS}" name="_SYMBOLS">${UI._SYMBOLS}</textarea>
</li>

<li class="text">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="SPECIFIC_LETTERS" class="act" reset="${UI.SPECIFIC_LETTERS}" name="SPECIFIC_LETTERS" />
			<label for="SPECIFIC_LETTERS">SPECIFIC LETTERS</label>
		</div>
		<span class="tip"><tool-tip data-tip="USE this to download specific char's, any char can be used, except SYMBOLS"></tool-tip></span>
	</div>
	<textarea id="_SPECIFIC_LETTERS" class="act" reset="${UI._SPECIFIC_LETTERS}" name="_SPECIFIC_LETTERS">${UI._SPECIFIC_LETTERS}</textarea>
</li>

<li class="check">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="USE_DEFAULT_KERN" class="act" reset="${UI.USE_DEFAULT_KERN}" name="USE_DEFAULT_KERN" />
			<label for="USE_DEFAULT_KERN">USE Default Kern</label>
		</div>
		<span class="tip"><tool-tip data-tip="USE DEFAULT KERN, load default kern of font! DO NOT USE WHEN SYMBOLS is true. NOTE: the file size and code execution can increase significantly, without significant benefits since we don't use pixels (although some fonts needed..)"></tool-tip></span>
	</div>
</li>

<li class="range" data-id="SPACING" id="UPDATE_SPACE">
	<div class="space"><label for="SPACING">SPACING: <span id="SPACING_INFO">${UI.SPACING}</span></label><span class="tip"><tool-tip data-tip="SPACING:200 OR 0 OR -200, apply a custom width of the SPACE"></tool-tip></span></div>
	<input type="range" id="SPACING" class="act" reset="${UI.SPACING}" name="SPACING" min="-1200" max="3000" value="${UI.SPACING}" step="1" />
</li>

<li class="range" data-id="KERN">
	<div class="space"><label for="KERN">KERN: <span id="KERN_INFO">0</span></label><span class="tip"><tool-tip data-tip="KERN: number i.e 300 OR 0 OR -300, apply a custom kern for every CHAR"></tool-tip></span></div>
	<input type="range" id="KERN" class="act" reset="${UI.KERN}" name="KERN" min="-200" max="300" value="0" step="10" />
</li>

<li class="range" data-id="LINE_HEIGHT">
	<div class="space"><label for="LINE_HEIGHT" class="gap">LINE HEIGHT: <span id="LINE_HEIGHT_INFO">${UI.LINE_HEIGHT}</span></label><span class="tip"><tool-tip data-tip="Set line height on break"></tool-tip></span></div>
	<input type="range" id="LINE_HEIGHT" class="act" reset="${UI.LINE_HEIGHT}" name="LINE_HEIGHT" min="-1" max="3" value="${UI.LINE_HEIGHT}" step="0.1" />
</li>


<li class="check">
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="USE_MINIFY" class="act switch" reset="${UI.USE_MINIFY}" name="USE_MINIFY" checked/>
			<label for="USE_MINIFY">USE MINIFY</label>
		</div>
		<span class="tip"><tool-tip data-tip="USE MINIFY, minify vertices and some other data. NOTE: if unchecked, file size will increase without significant results, use it ONLY for special circumstances that need precise float numbers."></tool-tip></span>
	</div>
</li>

<li class="check">
<fieldset>
  <legend>Select to download all char names:</legend>
	<div class="space">
		<div class="gap">
			<input type="checkbox" id="GET_CHAR_NAMES" class="act" reset="${UI.GET_CHAR_NAMES}" name="GET_CHAR_NAMES" />
			<label for="GET_CHAR_NAMES">Get char names</label>
		</div>
		<span class="tip"><tool-tip data-tip="GET CHAR NAMES if checked then you can download ALL the symbol/charcodes names for this font, NOTHING builds, is only to get info, and see what you need to build, very helpful if you build SYMBOLS. NOTE: if you have checked 'SYMBOLS' then you get all symbol names, else you get the 'letter' names!"></tool-tip></span>
	</div>
</fieldset>
</li>

<li id="act" class="actions">
<button type="submit" class="action">Build</button>
</li>`;
		navpanel.appendChild(ul)
	}
};