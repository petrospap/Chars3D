# Chars3D Babylon

## Build Your App

Build you App using [Babylonjs](https://babylonjs.com/) and your own fonts, this is the same code as the "Demo". 
We remove some functions used in "demo", to be more "clean" end easiest to create something new.

NOTE: this App contain a basic **'PARAGRAPH'** and **'SCORE'**

---

## How to use

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


In index, first and once, need to start **Assets()** then initialize **Chars3D()**.

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

All variables that can be used to draw a text included as info in `index`

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