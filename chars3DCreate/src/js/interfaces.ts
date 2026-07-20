// interfaces v:0.1

// Simple helper for coordinates
export interface IPos {
x: number;
y: number;
z: number;
}

export interface Ixy {
x: number;
y: number;
}

// User Input (passed to draw())
export interface IDrawOptions {
id: string;
txt: string;
planepos: IPos;
parent?: Mesh;
callback?: string;
font?: string;
size?: number;
letterpos?: IPos;
kern?: number;
spacing?: number;
lineheight?: number;
font3d?: number;
bevel?: number;
frontcolor?: string;
sidewallcolor?: string;
backcolor?: string;
emissivecolor?: string;
ambientcolor?: string;
billboard?: number;
notenable?: boolean;
outline?: boolean;
outlinewidth?: number;
outlinecolor?: string;
sticky?: number;
}

// Calculated State setData()
// passed to drawParagraph() 
export interface IParagraphState {
id: string;
txt: string|string[];
letterpos: IPos;
plane: Mesh;
size: number;
font: string;
depth: number | false; // font3d becomes depth
bevel: number | false;
frontcolor: number[];  // Color4
sidewallcolor: number[]; // Color4
backcolor: number[]; // Color4
lineHeightCalc: number;
spacing: number;
kern: number | false;
//paragraphwidth: number | false;
//unitsPerEm: number;
Len: number;
defaultKern: number|false
emissivecolor: string; //Color3;
ambientcolor: string;//Color3;
outline: boolean;
outlinewidth: number;
outlinecolor: string;//Color3;
sticky: number | false;
vertexData: any[]; // Or specific VertexData type
};


export interface IUpdateData {
id: string;
txt: string;
frontcolor?: string;
};

// helper Enable Or Disable text
export interface IEnableOrDisable {
enable: boolean;
name: string;
visibletime?: number;
}

/* bevel / contour */
export interface IBoundingBox{
x: number;
y: number;
z: number;
m: number[];
}

export interface IGlyphXBounds {
minX: number;
minY: number;
maxX: number;
maxY: number;
rangeX: number;
rangeY: number;
centerX: number; // Absolute midpoint pivot for text centering
centerY: number; // Absolute midpoint pivot for vertical alignment
}

interface IGlyphBounds {
cW:? number;  // width 
cH:? number;  // height
cX:? number;  // centerX
cY:? number;  // centerY
}

/*
// REMOVED, use IG3D
export interface IG2D {
_w: number;   // width
_x: number[]; //IGlyphXBounds // bounds
_v: number[]; // vertices
_i: number[]; // indices
_n: number[]; // normals
_k?: Record<string, number>; // kern
}
*/
/* binary decode */
interface IRange {
s: number; // start
c: number; // count
o: number; // isHole (flag)
};

interface IContour {
m: number[];    // main contour
h: number[][];  // holes
r: IRange[];    // ranges
};

/* 2D or 3D letters */
/*
export interface IG3D_ORI {
_w: number;       	// width
_x: number[]; 		// bounds
_v: number[]|null;  // vertices
_i: number[];     	// indices
_n: number[];     	// normals
_k?: Record<string, number>; // kern
_o?: IContour[];  	// contours (3D)
_b?: {            	// back/front info
	f: number;
	v: number[];
};
};
*/

export interface IG3D {
_w: number;       	// width
_x: number[]; 		// bounds
_v: number[]|null;  // vertices
_i: number[];     	// indices
_n: number[];     	// normals
_k?: Record<string, number>; // kern
_o?: IContour[];  	// contours (3D)
_f?: number;		// NEW front vertex count, same as _b.f
};

/* Holds Glyph Buffers 2D/3D */
export interface IGlyphBuffers {
_w?: number;			// width
_v?: null|boolean;		// flag
_x?: number[],			// glyph bounds
_k?: Record<string, number>; // kern
P?: Float32Array;		// Positions
I?: Uint32Array;  		// Indices number[];
N?: Float32Array; 		// Normals
U:? Float32Array; 		// UVs
C?: Float32Array; 		// Colors
FID?: Float32Array;		// Colors shader
L?: number; 			// Positions length
//IL?: number;
//bounds?: IGlyphBounds;
}


/* update Glyph VertexData 2D */
export interface IGlyphVertexData2D {
g: IGlyphBuffers; 
pos: IPos; 
size: number; 
color: number[];
}

/* update Glyph VertexData 3D */
export interface IGlyphVertexData3D{
g: IGlyphBuffers; 
pos: IPos; 
size: number; 
depth: number; 
bevel: number | false;
fc: number[]; // Front Color4
sc: number[]; // Side Color4
bc: number[]; // Back Color4
}

/* UI interfaces */
export interface ILetters {
LOWERCHARS: string[];
UPPERCHARS: string[];
NUMBERS: string[]; 
PUNCTUATION: string[];
SYMBOLS: string[];
SPECIFIC_LETTERS: string[];
};

export interface IFontData {
    _info: any;
    [key: string]: any; 
};

/* Custom log */
export interface ILogger {
containerId: string; 
useHtml:boolean; 
useConsole: boolean;
}

export interface ILogType {
error: string;
info: string;
success: string;
}