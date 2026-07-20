import { Color } from 'three';
import type {IAssetFile,IPerformance,IColor4} from './interfaces.ts';

const Log = {
    create(prefix): void {
        return (...args) => {console.log(...args)}
    }
};

export const log = Log.create('CharsLog');

// colors for custom log
// exammple: log('Error: %cThere no [%s] on id [%s]',_color.error,'this',10);
export const _color: ILogType = {
	error:'color:white;background:red;padding:2px',
	info:'color:white;background:blue;padding:2px',
	success:'color:white;background:green;padding:2px'
};


export class Performance{
static _start: number;
	constructor(){
		Performance._start = performance.now()
	};
	
	static end(txt:string, e:string|number): number{
		const timeEnd = performance.now() - Performance._start;
		log(txt,e,timeEnd);
		return timeEnd;
	}

};
/*
export const hexToRGBA = (hex: string): number[] => {
	if (!hex || hex === 0) return [0,0,0,1];//null;
	hex = hex.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16) / 255,
	g = parseInt(hex.substring(2, 4), 16) / 255,
	b = parseInt(hex.substring(4, 6), 16) / 255,
	a = parseInt(hex.substring(6, 8), 16) / 255 || 1;
	return [r,g,b,a]
};
*/

/**
 * Fast data-oriented helper to parse Hex strings (including Alpha channels)
 * into separate Three.js compatible RGB values and 0.0-1.0 float ranges.
 */
 
export const Color3 = (hexStr: string): Color => {
    if (!hexStr || hexStr.length < 6) return new Color(0xffffff);
    const hex = hexStr.replace('#', '');
    const rgb = parseInt(hex.substring(0, 6), 16);
    return new Color(rgb);
};

export const Color4 = (hexStr: string): IColor4 => {
    if (!hexStr || hexStr.length < 6) {
        return { rgb: new Color(0xffffff), alpha: 1.0 };
    }
    
    const hex = hexStr.replace('#', '');
    const rgb = parseInt(hex.substring(0, 6), 16);
    
    let alpha = 1.0;
    if (hex.length === 8) {
        const rawAlphaInt = parseInt(hex.substring(6, 8), 16);
        alpha = rawAlphaInt / 255;
    }
    
    return { rgb: new Color(rgb), alpha: alpha };
};
 

 
 
export const hexToRGBA = (hexStr: string): { rgb: number, alpha: number } => {
	
    const hex = hexStr.replace('#', '');
    
    // Fallback if string is invalid or empty
    if (hex.length < 6) return { rgb: 0xffffff, alpha: 1.0 };

    // Extract the primary RGB number (First 6 characters)
    const rgb = parseInt(hex.substring(0, 6), 16);

    // Extract Alpha if it exists (Last 2 characters), otherwise default to solid 1.0
    let alpha = 1.0;
    if (hex.length === 8) {
        const rawAlphaInt = parseInt(hex.substring(6, 8), 16);
        alpha = rawAlphaInt / 255; // Convert 0-255 scale cleanly to 0.0-1.0 float
    };
	
	return { rgb, alpha };
}

export class _SETTINGS {
static debugTime: boolean = true;
static debugUpdateTime: boolean = false; // WARNING .. too many logs if you enabled!
static readonly DEFAULT_FONT: string = 'oxanium';
static readonly LINESPACE: number = 32; 
static readonly LINEBREAK: number = 94; // charCode of  '^', you can change this to any keyboard SYMBOL, used as linebreak i.e text > "line^break"
static readonly LETTERLINEBREAK: string = '^';
static readonly LETTERLINESPACE: string = ' ';
static readonly LINE_HEIGHT: number = 0.9; // lineHeight of paragraph
static readonly OUTLINECOLOR: string = '#f5eb9b';
static readonly FRONT_COLOR: string = '#ffffff';
static readonly LIGHTCOLOR: string ='#24B626'; //b62d2d';
static readonly EMISSIVE_COLOR: string = '#000000'; // ori '#2a2a21'; 145e22
static readonly AMBIENT_COLOR: string = '#ffffe0'; // ori '#ffffe0';
static readonly DIFFUSE_COLOR: string = '#ffffff';
static readonly SPECULAR_COLOR: string = '#ffffff';
static readonly BORDERCOLOR: string = '#84e673';
static readonly PADDING: number[] = [1, 1];
static readonly ADJUST_Y_PADDING: number = 0.07; // THIS IS A BUG?, needed to adjust Y padding 
static readonly zdepth: number = 0.05;

// the following are MANDATORY, DO NOT CHANGE!
static readonly MASTERSIZE: number = 0.001;
static readonly FONT_SIZE: number = 1; // leave it as is, you can set font size on draw i.e. draw({size:1.2}}
static readonly regex = /[`~!@#$%&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi;
};

export const _FILES: IAssetFile[] = [
	{ // images
		id: 'globe',
		filename: 'fractal_2b.webp',
		type: 'image',
		path: '/textures/'
	},
	{ 
		id: 'btngreen',
		filename: 'btn_green.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'goldencrack',
		filename: 'golden-crack.jpg',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'abstract',
		filename: 'fractal_lines.jpg',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'milad',
		filename: 'milad-sm.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'rothenberg',
		filename: 'rothenberg-sm.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'grunge',
		filename: 'grunge.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'grunge_small',
		filename: 'grunge_small.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'wave',
		filename: 'wave.webp',
		type: 'image',
		path: '/textures/'
	},

	// fonts
	{ 
		id: 'oxanium', 
		filename: 'oxaniumextralight.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'designiconsbtn',
		filename: 'materialsymbolssharp5.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	},
	{
		id: 'kenneypixel',
		filename: 'kenneypixelt.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	},
	{
		id: 'blit',
		filename: 'blit.c3da',//'blit.json',
		type: 'c3dafont',
		path: '/fonts/c3da/'
	},
	{
		id: 'b3d_',
		filename: 'chocochicithree3d.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	},
	{
		id: 'bebasbin',
		filename: 'bebaschars3d.bin',
		type: 'binfont', 
		path: '/fonts/bin/'
	},
	{
		id: 'timedigital7',
		filename: 'digital7time.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	},
	{
		id: 'ramborsborder',
		filename: 'ramborsborder.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	},
	{
		id: 'oxbscore',
		filename: 'oxbscore.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	}
]

