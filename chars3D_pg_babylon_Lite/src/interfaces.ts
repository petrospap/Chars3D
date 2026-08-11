// interfaces v:0.5

interface IPos {
x: number;
y: number;
z: number;
}

interface Ixy {
x: number;
y: number;
}

interface IColor {
r: number;
g: number;
b: number;
a?: number;
}

interface IBoundingBox{
min: number[],
max: number[]
x: number;
y: number;
z: number;
extendSize: number[];
}

interface IBackgroundGeometry {
innerX: Float32Array;
innerY: Float32Array;
outerX: Float32Array;
outerY: Float32Array;
}

// Main User Text Input, passed to draw()
interface IDrawOptions {
id: string;
txt: string;
planepos?: IPos;
letterpos?: IPos;
parent?: Mesh;
meta?: any;
buttons?: boolean;
around?: boolean;
font?: string;
size?: number;
kern?: number;
spacing?: number;
lineheight?: number;
paragraphwidth?: number;
font3d?: number|false;
bevel?: number;
frontcolor?: string;
sidewallcolor?: string;
backcolor?: string;
texture?: string;
emissivecolor?: string;
ambientcolor?: string;
diffusecolor?: string;
specularcolor?:string;
alpha?: number;
background?: boolean;
border?: boolean;
bgradius?: number;
padding?: number[];
adjustY?: number;
adjustX?: number;
bgimage?: string;
bgcolor?: string;
bordercolor?: string;
bgthickness?: number;
notenable?: boolean;
sticky?: number;
disablelight?: boolean;
exclude?: boolean;
}

/* Calculated State setData() */
interface IParagraphState {
[key: string]: any;
id: string;
txt: string;
txtbtn:	string[]|false;
sticky: number|false;
charcode: string;
font3d: number|false;
bevel: number;
letterpos: IPos;
planepos: IPos;
plane: any; /* TransformNode | Mesh */
font: string;
meta: any|false;
size: number;
Len: number;
lineHeightCalc: number;
paragraphwidth: number|false;
kern: number|false;
spacing: number;
background: boolean;
border: boolean;
padding: number[];
adjustY: number;
adjustX: number;
radius: number;
thickness: number;
paragraph: any;
meshes: any[];
material: any; /* Char3DMaterial */
defaultKern: number|false;
source: IBoundingBox|false;
jit: any; /* AtlasAssemble */
finalWidth: number;
finalHeight: number;
centerXOffset: number;
centerYOffset: number;
lastTextLength: number;
sizeMightChange: boolean;
ascender: number;
descender: number;
notenable: boolean;
Pos: IPos;
}

interface IUpdateData {
[key: string]: any; 
id: string;
txt?: string|string[];
size?: number;
frontcolor?: string;
sidewallcolor?: string;
backcolor?: string;
diffusecolor?: string;
emissivecolor?: string;
bordercolor?: string;
}

export interface IShaderMaterialColors {
hastexture: boolean;
hasbgtexture: boolean;
texture: Texture2D;
frontcolor: number[]; //Color4, 
sidewallcolor: number[]; //Color4, 
backcolor: number[]; //Color4,
ambient: number[]; //Color3,
emissive: number[]; //Color3,
diffuse: number[]; //Color3,
specular: number[]; //Color3,
alpha: number;
background: boolean;
bgcolor: number[]; //Color4,
bgtexture: Texture2D;
bordercolor: number[];
disablelight: number;
empty: Texture2D;
}

interface IEffect {
id: string;
tick: number;
effect: number;
speed?: number;
intensity?: number;
}

// helper Enable Or Disable text
interface IEnableOrDisable {
id: string;
enable: boolean;
visibletime?: number;
}

export interface IGlyphXBounds {
minX: number;
minY: number;
maxX: number;
maxY: number;
rangeX: number;
rangeY: number;
centerX: number;
centerY: number;
}

/* Holds Glyph Buffers 2D/3D by letter */
interface IGlyphBuffers {
P: Float32Array; 		// Positions
I: Uint32Array;  		// Indices number[];
N: Float32Array; 		// Normals
U: Float32Array; 		// UVs
FID: Float32Array;		// Colors shader
L: number; 				// Positions length
IL: number; 			// RAW Indices length
bounds: IGlyphXBounds 	// chars bounds
//_k?: Record<string, number>; // kern
}

interface IBlitBuffers {
_w: number;    			// width
_v: number|null;		// working as flag, is vertex char or not
_k?: Record<string, number>; // kern
P?: Float32Array; 		// Positions
I?: Uint32Array;  		// Indices
N?: Float32Array; 		// Normals
U?: Float32Array; 		// UVs
FID?: Float32Array;		// Colors shader
L: number; 			// Positions length
IL: number; 			// RAW Indices length
bounds: IGlyphXBounds 	// chars bounds
}

/* UI chars */
interface IChars {
LOWERCHARS: boolean;
UPPERCHARS: boolean;
NUMBERS: boolean;
PUNCTUATIONS: boolean;
SYMBOLS: boolean;
};

/* log */
interface IPerformance {
txt: string;
id: string;
mem?: number;
}

interface ILogType{
error: string;
info: string;
success: string;
}

interface ILogTotal {
totalfonts: number;
letters2D: number;
letters3D: number;
letters: number;
performance: number;
totalbytes2d: number;
totalbytes3d: number;
}

interface IStats {
memory: number;
textv: number;
textp: number;
panelv: number;
panelp: number;
extraMemory: number;
}

/* Assets */
type AssetType = 'image' | 'json' | 'jsonfont' | 'binfont' | 'c3dafont';

interface IAssetFile {
id: string;
filename: string;
type: AssetType;
path: string;
}

/*
interface IPGAssetFile {
id: string;
data?: string;
fontdata?: any;
type: AssetType;
}
*/

/* binary decode */
interface IRange {
s: number; // start
c: number; // count
o: number; // isHole (flag)
}

interface IContour {
m: number[];   // main contour
h: number[][]; // holes
r: IRange[];   // ranges
}

/* 2D or 3D letters */
interface IG3D {
_w: number;				// width
_x: number[];	  		// bounds from opentype.js [xMin, yMin, xMax, yMax]
_v: number[];     		// vertices
_i: number[];     		// indices
_n: number[];     		// normals
_k: Record<string, number>; // kern
_o: IContour[];  		// contours (3D)
_f: number;	  			// NEW front vertex count, same as the old V1 _b.f
bounds: IGlyphXBounds; 	// char bounds NOTE: when we set this we delete "_x"
P: Float32Array; 		// Positions
I: Uint32Array;  		// Indices number[];
N: Float32Array; 		// Normals
U: Float32Array; 		// UVs
FID: Float32Array;		// Colors shader
L: number; 				// Positions length
IL: number; 			// RAW Indices length
}

interface IFontData {
_info: any; // object "info" key's may change in other version? so leave it as any
[key: string]: IG3D; // [key: string]: any;
}