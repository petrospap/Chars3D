# Chars3D Babylon Demo

A simply demo for [Babylon](https://babylonjs.com/), contains all the possibilities that you can `draw` with **Chars3D**.

---

## API Implementation Usage


First and once, need to start **Assets()** then initialize **Chars3D()**.

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
		id: 'TEXTID', // MANDATORY
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
		id:'TEXTID', 
		txt: 'What next?',
		frontcolor: '#000000'
	});
```

---

## Dispoce text

```
	Chars3D.dispose('TEXTID');
```

---

## License

This project is open-source software distributed under the terms of the **MIT License**.

---