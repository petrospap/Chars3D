# Chars3D Babylon Lite Demo

A simply demo for [Babylon/lite](https://www.babylonjs.com/lite/), contains all the possibilities that you can `draw` with **Chars3D**.

A playground demo can be viewed in [Chars3D demo for Babylon Lite](https://liteplayground.babylonjs.com/snippet/KCY4JL/v/0)

---

## Build Your App

Build you App using **Babylon/lite** with pre builded fonts, but you can use your own fonts!

NOTE: this App contain a basic implementation for demo only.

---

## How to use

If you have created new **Chars3D fonts**

Add your created files `.JSON` or `.bin` or `.c3da` from **chars3DCreate** into local `/public/fonts` directory.
open `SETTINGS.ts` and write in constant **_FILES** the font you want to include, i.e.

```
	{ 
		id: 'fontID1', 
		filename: 'fonatname.json',
		type: 'jsonfont',
		path: '/fonts/'
	}
	{
		id: 'fontID2',
		filename: 'fonatname.bin',
		type: 'binfont',
		path: '/fonts/bin/'
	},
	{
		id: 'fontID3',
		filename: 'fonatname.c3da',
		type: 'c3dafont',
		path: '/fonts/c3da/'
	}
```

---

## API Implementation Usage

Chars3D for Babylon/lite uses two cameras an **ArcRotateCamera** for basic draws and an **FreeCamera** to draw our `sticky UI`.


All you need, for first time and once, to start **Assets()** then initialize **Chars3D()**.

```
	/* Start and load assets */
	new Assets(App.scene);
	
	/* Wait for all files to finish loading/decoding */
	Assets.onFinish = async () => {

		new Chars3D(App.scene, Assets._font, Assets._blit, Assets._textures,  Assets.hasblit, Assets.hasfont);
		App.init();
		App.runGame();
		App.canvas.focus()
	};
```

---

## Drawing a text

To draw a text, "we called paragraph" simply use,

```
	Chars3D.draw({
		id: 'fontID1', // MANDATORY
		txt: 'Hello World', // MANDATORY
		planepos: {x:0, y:1, z:0},
		frontcolor: '#ffffff'
	});
```


All variables that can be used to draw a text
NOTE: all colors must be in HEX

| Operation name | Type | Explanation |
| :--- | :--- | :--- |
| id: | string; | MANDATORY 'uniqueID' |
| txt: | string; | MANDATORY 'text to draw' |
| planepos?: | {x,y,z}; | Position of TransformNode or Parent Mesh, default {x:0,y:0,z:0} |
| letterpos?: | {x,y,z}; | Position of text, default {x:0,y:0,z:0} |
| parent?: | Mesh; | Use an existing Mesh, instant of TransformNode |
| meta?: | any; | Buttons callback, i.e {charname: App.function1, ..etc}; |
| buttons?: | boolean; | used to execute drawButtons() |
| around?: | boolean; | used only to execute drawAnimation() |
| font?: | string; | Font name to use |
| size?: | number; | size of the letters, default 1 |
| kern?: | number; | i.e 100 if not set OR default kern (if exist), |
| spacing?: | number; | default space, spacing + default space, i.e 400 |
| lineheight?: | number; | line height of letter, i.e 1.2 |
| paragraphwidth?: | number; | Set max width of paragraph |
| font3d?: | number; | Set depth of 3D (if font has builded with 3D), i.e 0.5 |
| bevel?: | number; | Set bevel i.e 0.5, final 3D depth is font3d + bevel |
| frontcolor?: | string; | front color for all letters, default #ffffff, RGBA |
| sidewallcolor?: | string; | side color for 3D letters, RGBA |
| backcolor?: | string; | back color for 3D letters, RGBA |
| texture?: | string; | texture*  to apply in all letters |
| emissivecolor?: | string; | emissive color, RGB |
| ambientcolor?: | string; | ambient color, RGB |
| diffusecolor?: | string; | diffuse color, RGB |
| specularcolor?: | string; | specular color, RGB |
| alpha?: | number; | alpha 0.0 to 1.0 |
| background?: | boolean; | Set if paragraph OR button has a background |
| bgcolor?: | string; | background color, RGBA |
| bgimage?: | string; | background texture* to apply  |
| border?: | boolean; | Set if paragraph OR button has a border |
| bgradius?: | number; | border radius, i.e 0.3 |
| bgthickness?: | number; | border thickness, i.e 0.5 |
| bordercolor?: | string, | border color, RGBA |
| padding | number[]; | Set padding of paragraph [left/right, top/bottom], default [0.5, 0.5] |
| adjustY?: | number; | panel adjust Y, i.e 0.05, default: 0.07 |
| adjustX?: | number; | panel adjust X, i.e 0.10 |
| notenable?: | boolean; | Set if text is enabled/visible |
| sticky?: | number; | experiment, set text to FreeCamera |
| disablelight?: | boolean; | disable light |
| exclude?: | boolean | exclude from enable/disable, mesh is always is visible if is set to true |

> *NOTE: (this texture must be Set in setting > _FILES to loaded )
---

## Update text

```
	Chars3D.update({
		id:'fontID1', 
		txt: 'What next?',
		frontcolor: '#000000'
	});
```

---

## Dispoce text

```
	Chars3D.dispose('fontID1');
```

---

## License

This project is open-source software distributed under the terms of the **MIT License**.
