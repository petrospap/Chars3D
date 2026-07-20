import { writeFileSync, readdirSync } from 'node:fs';
import { extname } from 'node:path';
/*
getfontnames.js
load fonts names from specific folder.
If you add files from upload, 
you can add the nodemon package and run nodemon --watch public/files getfontnames.js 
in a separate terminal. 
This will update your fontnames.json 
instantly every time you drop a new file into the folder "fonts".
*/

const folderPath = './public/fonts';
const outputFile = folderPath+'/fontnames.json';
// Define the extensions you actually want to expose
const ALLOWED_EXTENSIONS = ['.ttf', '.otf', '.woff','woff2'];
//const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.json', '.pdf', '.mp3'];
try {
  const files = readdirSync(folderPath).filter(file => {
      const extension = extname(file).toLowerCase();
      // Only include files in ALLOWED_EXTENSIONS
      return ALLOWED_EXTENSIONS.includes(extension);
    });

  writeFileSync(outputFile, JSON.stringify(files, null, 2));
} catch (err) {
  console.error('Get font names failed:', err);
}
