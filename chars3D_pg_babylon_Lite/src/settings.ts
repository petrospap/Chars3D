import type {IColor, IAssetFile, IPerformance, ILogType} from './interfaces.ts';

// fix it, or remove!
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

export const hexToColor4 = (hex: string): number[] => {
	if (!hex || hex === 0) return [0,0,0,1];//null;
	hex = hex.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16) / 255,
	g = parseInt(hex.substring(2, 4), 16) / 255,
	b = parseInt(hex.substring(4, 6), 16) / 255,
	a = parseInt(hex.substring(6, 8), 16) / 255 || 1;
	
	return [r,g,b,a]
};

export const hexToColor3 = (hex: string): number[] => {
	if (!hex || hex === 0) return [0,0,0];//null;
	hex = hex.replace('#', '');
	const r = parseInt(hex.substring(0, 2), 16) / 255,
	g = parseInt(hex.substring(2, 4), 16) / 255,
	b = parseInt(hex.substring(4, 6), 16) / 255;
	
	return [r,g,b]
};


export class Performance{
static _start: number;
	constructor(){
		Performance._start = performance.now()
	};
	
	static end(txt:string, e:string|number): number{
		const timeEnd = performance.now() - Performance._start;
		log(txt,e,timeEnd);
		return timeEnd
	}
};


export class _SETTINGS {
static debugTime: boolean = true;
static debugUpdateTime: boolean = false; // WARNING .. too many logs if enabled!
static readonly DEFAULT_FONT: string = 'oxanium';
static readonly LINESPACE: number = 32; 
static readonly LINEBREAK: number = 94; // charCode of  '^', you can change this to any keyboard SYMBOL, used as linebreak i.e text > "line^break"
static readonly LETTERLINEBREAK: string = '^';
static readonly LETTERLINESPACE: string = ' ';

static readonly LINE_HEIGHT: number = 0.9; // lineHeight of paragraph
static readonly FRONT_COLOR: string = '#ffffff';
static readonly LIGHTCOLOR: string ='#b62d2d';
static readonly EMISSIVE_COLOR: string = '#000000'; // ori '#2a2a21'; 145e22
static readonly AMBIENT_COLOR: string = '#ffffe0'; // ori '#ffffe0';
static readonly DIFFUSE_COLOR: string = '#ffffff';
static readonly SPECULAR_COLOR: string = '#ffffff';
static readonly BORDERCOLOR: string = '#84e673';
static readonly PADDING: number[] = [0.5, 0.5]; 
static readonly ADJUST_Y_PADDING: number = 0.07; // THIS IS A BUG?, needed to adjust Y padding 
static readonly zdepth: number = 0.05;

// the following are MANDATORY, DO NOT CHANGE!
static readonly MASTERSIZE: number = 0.001;
static readonly FONT_SIZE: number = 1; // leave it as is, you can set font size on draw i.e. draw({size:1.2}}
static readonly regex = /[`~!@#$%&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi;
};

export const _FILES: IAssetFile[] = [
	{// images
		id: 'empty',
		filename: 'black.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'surface',
		filename: 'crack.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'goldencrack',
		filename: 'golden-crack.webp',
		type: 'image',
		path: '/textures/'
	},
	{
		id: 'abstract',
		filename: 'fractal_lines.webp',
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
	{ 
		id: 'oxanium', 
		filename: 'oxaniumextralight.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'bebasbin',
		filename: 'bebaschars3d.json',
		type: 'jsonfont', //'binfont', 
		path: '/fonts/' //'/fonts/bin/'
	},
	
	{
		id: 'designiconsbtn',
		filename: 'materialsymbolssharp5.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'b3d_',
		filename: 'b3d.json', // neontaralite.json 2D only
		type: 'jsonfont', 
		path: '/fonts/'
	},
	{
		id: 'kenneypixel',
		filename: 'kenneypixel.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'timedigital7',
		filename: 'digital7time.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'ramborsborder',
		filename: 'ramborsborder.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'oxbscore',
		filename: 'oxbscore.json',
		type: 'jsonfont',
		path: '/fonts/'
	},
	{
		id: 'blit',
		filename: 'blit.c3da', // our blit!!
		type: 'c3dafont',
		path: '/fonts/c3da/'
	}
];
