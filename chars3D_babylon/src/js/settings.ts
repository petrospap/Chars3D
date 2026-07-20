import type {IAssetFile} from './interfaces.ts';


export class _SETTINGS {
static readonly DEFAULT_FONT: string = 'oxaniumregular';
static readonly LINESPACE: number = 32; 
static readonly LINEBREAK: number = 94; // charCode of  '^', you can change this to any keyboard SYMBOL, used as linebreak i.e text > "line^break"
static readonly LETTERLINEBREAK: string = '^';
static readonly LETTERLINESPACE: string = ' ';

static readonly LINE_HEIGHT: number = 0.9; // lineHeight of paragraph
static readonly OUTLINEDEPTH: number = 0.01;
static readonly OUTLINECOLOR: string = '#f5eb9b';
static readonly FRONT_COLOR: string = '#ffffff';
static readonly LIGHTCOLOR: string ='#b62d2d';
static readonly EMISSIVE_COLOR: string = '#000000';
static readonly AMBIENT_COLOR: string = '#ffffe0';
static readonly DIFFUSE_COLOR: string = '#ffffff';
static readonly SPECULAR_COLOR: string = '#ffffff';
static readonly BORDERCOLOR: string = '#84e673';
static readonly PADDING: number[] = [1,1]; 
static readonly ADJUST_Y_PADDING: number = 0.07;
static readonly zdepth: number = 0.05;

// the following are MANDATORY, DO NOT CHANGE!
static readonly MASTERSIZE: number = 0.001;
static readonly FONT_SIZE: number = 1; // leave it as is, you can set font size on draw i.e. draw({size:1.2}}
static readonly regex = /[`~!@#$%&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi;
};


// asset manager load files
export const _FILES: IAssetFile[] = [
	{ // images
		id: 'fractal',
		filename: 'fractal_1.webp',
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
		id: 'flowers',
		filename: 'flowers.jpg',
		type: 'image',
		path: '/textures/'
	},
	
	// fonts
	{ 
		id: 'oxaniumregular', 
		filename: 'oxaniumregular3d.json',
		type: 'jsonfont',
		path: '/fonts/'
	}
]