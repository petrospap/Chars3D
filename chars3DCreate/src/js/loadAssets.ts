import { Scene, AssetsManager } from '@babylonjs/core';

export class Assets{

//static private _Scene;
static _manager: AssetsManager;
static _font: Record<string, any> = {}; 
static _textures: Record<string, any> = {}; 
static _fontnames: string[];
private static _allowed: string[] = ['ttf','otf','woff','woff2'];

	constructor(scene: Scene){
		//Assets._Scene = scene;
		Assets._manager = new AssetsManager(scene);
	};
	
	static getFontNames(){

		// get font name
		// NOTE: fontnames.json auto generated when npm starts
		// MANDATORY: user must add fonts in "/public/fonts/" before start npm
		const fontnames = Assets._manager.addTextFileTask('fontnames', '/fonts/fontnames.json');
			fontnames.onSuccess = (t) => {
				Assets._fontnames = JSON.parse(t.text)
			};
		
		// load just one image for test
		const imageTask = Assets._manager.addTextureTask('gold', '/textures/gold.png');
			imageTask.onSuccess = (task) => {
				Assets._textures['gold'] = task.texture;
			};
		
		Assets._manager.onTaskErrorObservable.add((task) => {
		  console.log('Font names failed', task.errorObject.message, task.errorObject.exception)
		});
		
		Assets._manager.load()
	};
	
	// load font from UI when user submit
	static getFont(name: string, file: string){
		const filename: string[] = file.split('.');
		if(filename[0].includes('/') || filename[0].length > 50){
			throw('Error in file name! Only letters, Max length name: 50')
		};
		
		if(!Assets._allowed.includes(filename[1])){
			throw('Error: allowed files > ttf, otf, woff, woff2')
		};

		const fontTask = Assets._manager.addBinaryFileTask(name, '/fonts/'+file);
		fontTask.onSuccess = (task) => {
			Assets._font = task.data
		};
		
		Assets._manager.onTaskErrorObservable.add((task) => {
		  console.log('LOAD FONT failed', task.errorObject.message, task.errorObject.exception)
		});
		
		Assets._manager.load()
	}
}