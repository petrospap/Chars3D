# CHARS3D CREATE

This application is used to compile raw font files into geometric outlines, contour ranges, and triangulated index maps optimized for high-performance 2D and 3D WebGL rendering libraries.

Chars3D Create utilizes the following core libraries:
*   [BabylonJS](https://github.com/BabylonJS/Babylon.js)
*   [opentype.js](https://opentype.js.org/)
*   [earcut](https://github.com/mapbox/earcut)

The project includes preset examples from these excellent sources:
*   [Google Fonts](https://fonts.google.com/)
*   [Oxanium Font](https://github.com/sevmeyer/oxanium)
*   [Kenney Fonts](https://kenney.nl/assets/kenney-fonts)
*   [fontspace](https://www.fontspace.com/)

---


## What is Chars3D?

Chars3D is a lightweight, Data-Oriented 2D/3D typography engine built for [Babylon.js](https://babylonjs.com/), and [Three.js](https://threejs.org/). Due to its decoupled architecture, the compiled geometry data can easily be adapted for any other 3D web framework.

**NOTE:** `Chars3D Create` is strictly an Asset Pre-compiler Tool. Its sole purpose is to process fonts and export geometry data. Once your font files are generated and saved, they are loaded and rendered using the core `Chars3D` engine found inside the standalone framework or demo application folders.

---

## Key Benefits

By pre-computing geometric shapes ahead of time (Ahead-Of-Time/AOT compilation), the runtime graphics application completely eliminates the need to bundle heavy libraries like `opentype.js` or `earcut`. 

This delivers a massive reduction in initial bundle sizes and dramatically optimizes runtime CPU usage, as the engine never has to waste precious processing cycles recalculating glyph vector paths or executing triangulation algorithms over and over again!

---

## Output Format Architecture

Chars3D generates 4 distinct output formats to fit different deployment strategies:

1. **JavaScript Format (`.js`)**: Embedded directly as a native code `import` inside a script module.
2. **JSON Format (`.json`)**: Ideal for standard runtime asset streaming via an `AssetsManager` loop or plain browser `fetch`.
3. **Binary Format (`.bin`)**: Identical data to JSON, but compiled into a smaller, raw byte structure.
4. **`.c3da` Binary Format (Blit Format)**: The ultimate performance option. Unlike the first three formats which require the engine to convert JavaScript/JSON/binary data numbers into TypedArrays upon loading, a `.c3da` file houses **direct WebGL-ready TypedArrays**. 

Loading a `.c3da` file is pure "plug-and-play" straight into the browser heap memory, delivering un-matched runtime performance. 

**Downside & Recommendation:** Storing raw high-precision floating-point arrays directly inside a file results in a larger footprint compared to standard text JSON strings. For the best loading speeds, it is recommended to host `.c3da` files directly adjacent to your application context (or utilize server-level GZIP/Brotli encoding) rather than streaming them over uncompressed networks.

---

## How To Use

Generating custom glyph data is straightforward:

1. Place your source font files (`.ttf`, `.otf`) inside the chars3DCreate `/public/fonts` directory. *(Note: If you add new source font files, you must restart your dev script to find those new fonts).*
2. Initialize or run the development server via terminal: `npm start`.
3. Open the browser interface and press **"o"** to reveal the configuration UI sidebar. Select your target font and tweak your desired settings (space, kern, lineheight, etc). When ready, click **"Build"**.
4. Once the font renders cleanly on your web screen, your geometric assets are compiled and ready to extract. If you notice structural clipping, adjust the settings and rebuild.
5. Download your chosen format and move the generated file straight into the `/public/fonts` directory of your BabylonJS or ThreeJS runtime/demo folders.
6. Register your new font identifier key inside your application's global `SETTINGS` config array, and you are ready to render!

---

## Font Capabilities & Limitations

Any standard font format natively supported by `opentype.js` can be processed into a Chars3D asset. This includes vector icon families like *MaterialSymbols*, *FontAwesome*, and custom geometric icon alphabets.

### BETA Limitations

While 2D font conversion handles almost any typeface flawlessly, 3D mesh extrusion can struggle with certain complex font weights or thin curved families (such as *Ubuntu-Thin*). This can occasionally manifest as minor visual anomalies or beveled edge spikes depending on how tightly packed the font's vector anchors are drawn.

**Golden Rule for 3D Typography:** For pristine 3D extrusion, select cleaner, solid typefaces created by well-established type designers. Avoid heavily stylized fonts that feature pre-baked spikes, multiple hollow gaps, intersecting paths, or grunge typefaces. The simpler and cleaner the font curves are drawn, the more compact, performance-optimized, and beautiful your final `.c3da` file outputs will be!

---

## ⚠️ Security & Trust Notice

*   **Local Execution Security**: The `Chars3D Create` asset compiler tool is designed strictly for personal, local deployment workflows. Do not host or expose the compiler application publicly on the web.
*   **Trust the Origin**: The `.c3da` and `.bin` formats are uncompressed, high-performance binary structures housing raw data streams. While `.js` and `.json` text formats allow you to inspect glyph coordinates easily, binary arrays cannot be manually read without a decoder pipeline. **Only load and run binary assets that you have generated yourself or obtained from trusted sources.**
*   **What is the worst a bad asset can do?**: Because the `AtlasBinaryDecoder` reads data streams directly into type-restricted hardware structures (`Float32Array`/`Uint32Array`) to feed WebGL vertex buffers, **it is architecturally impossible for a `.c3da` or `.bin` asset to execute arbitrary malicious code or scripts on a client machine.** A manipulated, invalid, or corrupted font file can only result in scrambled 3D text geometry or trigger a standard, non-destructive WebGL browser tab crash.
*   **Built-in Verification**: Every compiled `.c3da` asset incorporates a core **`ATLS` Magic Header Signature** and an integrated **Bitwise Validation Checksum Footer** to automatically intercept, flag, and reject corrupted or altered binary payloads at the hardware layer.

---

## License

This project is open-source software distributed under the terms of the **MIT License**.
