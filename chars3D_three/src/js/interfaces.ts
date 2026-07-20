// interfaces v:0.5

export interface IPos {
x: number;
y: number;
z: number;
}

export interface Ixy {
x: number;
y: number;
}

export interface IBoundingInfo{
minimum: IPos;	// Vector3
maximum: IPos;	// Vector3
center: IPos;	// Vector3
extendSize: IPos;	// Vector3 (Half-extents)
size: IPos;		// Vector3 (Full width/height/depth)
}

export interface IBoundingBox{
x: number;
y: number;
z: number;
m: number[];
}

export interface IBackgroundGeometry {
innerX: Float32Array;
innerY: Float32Array;
outerX?: Float32Array;
outerY?: Float32Array;
}

/* Main User Text Input, passed to draw() */
export interface IDrawOptions {
id: string;
txt: string|string[];
planePos: IPos;
parent?: any[]; /* Mesh; */
meta?: any[];
buttons?: boolean;
around?: boolean;
font?: string;
size?: number;
letterpos?: IPos;
kern?: number;
spacing?: number;
lineheight?: number;
paragraphwidth?: number;
font3d?: number;
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
adjustY: number;
adjustX?: number;
bgimage?: string;
bgcolor?: string;
bordercolor?: string;
bgthickness?: number;
outline?: boolean;
outlinedepth?: number;
outlinecolor?: string;
billboard?: number;
notenable?: boolean;
sticky?: number;
disablelight?: boolean;
exclude?: boolean;
}


/* Calculated State setData() */
export interface IParagraphState {
id: string;
sticky: number|false;
charcode: string;
font3d: number|false;
bevel: number;
billboard: number
letterpos: IPos;
planepos: IPos;
plane: any[]; /* TransformNode | Mesh */
font: string;
meta: any[]|false;
size: number;
Len: number;
lineHeightCalc: number;
paragraphwidth: number;
kern: number|false;
spacing: number;
background: boolean;
border: boolean;
padding: number[];
adjustY: number;
adjustX: number;
radius: number;
thickness: number;
outline: boolean;
outlinedepth: number;
outlinecolor: number[];
paragraph: any[];
meshes: any[];
material: any[]; /* Char3DMaterial */
defaultKern: number|false;
source: IBoundingBox|false;
jit: any[]; /* AtlasAssemble */
plasmatime:number;
finalWidth: number;
finalHeight: number;
centerXOffset: number;
centerYOffset: number;
lastTextLength: number;
sizeMightChange: boolean;
ascender: number;
descender: number;
targetCamera: IPos; //Vector3;
animationFrameId: number;
}

/* not set for Three */
export interface IUpdateButton {
id: string;
color?: string;
hoverbg?: string;
//clickbg?: string; // TODO
}

export interface IUpdateData {
id: string;
txt?: string;
size?: number;
frontcolor?: string;
sidewallcolor?: string;
backcolor?: string;
diffusecolor?: string;
emissivecolor?: string;
outlinecolor?: string;
bordercolor?: string;
}

/* Three Color */
interface IColor {
r: number;
g: number;
b: number;
isColor: boolean
}

export interface IColor4 {
rgb: number[]; //Color; // Named Color properties for structural clarity?
alpha?: number; // Alpha property map
}

export interface IShaderMaterialColors {
texture?: any[]; //Texture
frontcolor?: IColor4; //Color4, 
sidewallcolor?: IColor4; //Color4, 
backcolor?: IColor4; //Color4,
ambient?: number[]; //Color3,
emissive?: number[]; //Color3,
diffuse?: number[]; //Color3,
specular?: number[]; //Color3,
alpha?: number;
background?: boolean;
bgcolor?: IColor4; //Color4,
bgtexture?: any[]; //Texture
bordercolor?: IColor4;
disablelight?: number;
uIs3DMode?: number
}

// helper Enable Or Disable text
export interface IEnableOrDisable {
enable: boolean;
name: string;
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
export interface IGlyphBuffers {
P: Float32Array; 		// Positions
I: Uint32Array;  		// Indices number[];
N: Float32Array; 		// Normals
U: Float32Array; 		// UVs
FID: Float32Array;		// Colors shader
L: number; 				// Positions length
IL: number; 			// RAW Indices length
bounds?: IGlyphXBounds 	// chars bounds
//_k?: Record<string, number>; // kern
}

export interface IBlitBuffers {
_w: number;    			// width
_v: number|null;		// working as flag, is vertex char or not
_k?: Record<string, number>; // kern
P?: Float32Array; 		// Positions
I?: Uint32Array;  		// Indices
N?: Float32Array; 		// Normals
U?: Float32Array; 		// UVs
FID?: Float32Array;		// Colors shader
L?: number; 				// Positions length
IL?: number; 			// RAW Indices length
bounds?: IGlyphXBounds 	// chars bounds
}

/* UI chars */
export interface IChars {
LOWERCHARS: boolean;
UPPERCHARS: boolean;
NUMBERS: boolean; 
PUNCTUATIONS: boolean;
SYMBOLS: boolean;
};

/* Assets */
type AssetType = 'image' | 'json' | 'jsonfont' | 'binfont' | 'c3dafont';

interface IAssetFile {
id: string;
filename: string;
type: AssetType;
path: string;
}

/* binary decode */
export interface IRange {
s: number; // start
c: number; // count
o: number; // isHole (flag)
}

export interface IContour {
m: number[];      // main contour
h: number[][];    // holes
r: IRange[];      // ranges
}

/* 2D or 3D letters */
export interface IG3D {
_w: number;			// width
_x?: number[];	  	// bounds from opentype.js [xMin, yMin, xMax, yMax]
_v?: number[];     	// vertices
_i?: number[];     	// indices
_n?: number[];     	// normals
_k?: Record<string, number>; // kern
_o?: IContour[];  	// contours (3D)
_f?: number;	  	// NEW front vertex count, same as the old V1 _b.f
bounds?: IGlyphXBounds; // char bounds NOTE: when we set this we delete "_x"
P?: Float32Array; 		// Positions
I?: Uint32Array;  		// Indices number[];
N?: Float32Array; 		// Normals
U?: Float32Array; 		// UVs
FID?: Float32Array;		// Colors shader
L?: number; 			// Positions length
IL?: number; 			// RAW Indices length
}


export interface IFontData {
_info: any;
[key: string]: IG3D; //  [key: string]: any;
}