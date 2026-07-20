License
http://creativecommons.org/publicdomain/zero/1.0/
Free to public. Do whatever you like with those Scripts.
This script gived As Is.
Demo/Download: https://simply4all.net/map-card-screenshot

---------------------------------------------------------------------------------------

Install:
Using Vite:

1 npm install

2 npm start OR npx vite

view: http://localhost:5173/
stop: ctrl + c

3 when you are ready save to dist
npm run build (OR) npx vite build

read more 
https://vitejs.dev/guide/
https://www.freecodecamp.org/news/get-started-with-vite/
https://www.section.io/engineering-education/develop-and-deploy-fast-apps-with-vite-js/


---------------------------------------------------------------------------------------
npm cache clean --force
npm cache verify
-- rm -rf node_modules/ remove manual
npm install
---------------------------------------------------------------------------------------
clear cashe

vite --force

-------------

package.json: from https://forum.babylonjs.com/t/how-do-i-use-babylonjs-ktx2decoder-properly/49350/5
{
  "name": "bjs-ktx2",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite --open",
    "build": "tsc && vite build",
    "preview": "tsc && vite build && vite preview --host --open"
  },
  "typeRoots": [
    "node_modules/@types",
    "src/@types"
  ],
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.2.7"
  },
  "dependencies": {
    "@babylonjs/core": "^7.0.0",
    "@babylonjs/inspector": "^7.0.0",
    "@babylonjs/ktx2decoder": "^7.1.0",
    "vite-plugin-arraybuffer": "^0.0.6",
    "vite-plugin-wasm": "^3.3.0"
  }
}

