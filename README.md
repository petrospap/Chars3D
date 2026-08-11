# Chars3D (BETA)

Chars3D is a lightweight, ultra-high-performance, parametric 2D and 3D typography rendering engine built for TypeScript, currently running with those engines, [Babylon.js](https://babylonjs.com/), [Babylon/lite](https://www.babylonjs.com/lite/) and [Three.js](https://threejs.org/). By abandoning traditional, heavy CPU vertex-merging pipelines, Chars3D implements a data-oriented **Librarian Architecture** that enables **0ms–1ms text layout mutations directly on the live main thread**.

It is purpose-built for rendering dynamic text across multiple concurrent fonts in fast-updating real-time applications, such as game HUD counters (FPS, scores), ticking system clocks, interactive 3D menus, and responsive virtual dashboards.

---

## Architecture Blueprint

Chars3D decouples font asset management into a highly efficient, dual-stage ecosystem:

### 1. The Compiler Stage (`chars3DCreate`)

An ahead-of-time (AOT) pre-compiler utility leveraging `opentype.js` and `earcut` to parse vector font contours into unified geometric outlines, contour ranges, and triangulation index maps. It strips structural bloat to export 4 highly optimized deployment formats: `.js`, `.json`, `.bin`, or raw `.c3da` binary streams.

### 2. The Runtime Engine Stage (`Chars3D`)

The browser client streams the lightweight, pre-compiled font asset data directly via a plain network `fetch` or local loader.
* **Chars3D (The Surveyor)**: Evaluates input text strings on-the-fly, pre-calculating precise paragraph bounding areas, layout sizing boundaries, word-wrapping constraints, and active font kerning pairs.
* **AtlasAssemble (The Transfuser)**: Executes flat, linear memory copies sequentially in-place directly into a persistent master GPU array buffer view window, flushing the updated indices instantly to the active WebGL rendering pipeline.

---

## Core Technical Achievements

1. **0ms Runtime String Mutations**: Re-writes active vertex buffer structures sequentially in-place utilizing rapid `TypedArray.prototype.set()` memory blitting operations.
2. **Compact Over-The-Air Payload**: Leverages custom compressed `.js`, `.json`, `.bin`, or `.c3da` binary asset pipelines, completely dodging the massive network bandwidth weight of pre-baked mesh geometry streams.
3. **Parametric Cubic Bezier Beveling**: Implements smooth, continuous convex or concave edge profiles at runtime backed by strict hardware miter limits. This prevents geometry spikes, self-intersections, or "cogwheel" layout artifacts on sharp curved glyphs like *s*, *e*, or *n*.
4. **Isolated Shading & Lighting Channels**: Employs a specialized vertex attribute layout (`aFaceId`) to map discrete surface indices. Front faces, back caps, extruded sidewalls, and background panels are treated as independent shading layers. This lets developers restrict post-processing glow or blur layers strictly to the beveled rims without causing visual "air bleeding" or color leakage.
5. **WebGL Buffer Stability**: Tracks variable text lengths by shifting a virtual draw window via hardware dynamic allocation pointers. This completely eliminates the severe performance stutters, driver stalls, and memory leaks commonly associated with continuous mesh `.dispose()` and re-allocation loops.

---

## Material & Color Management

While the `Chars3D Create` compiler tool utilizes standard framework materials (`StandardMaterial`) during asset tracking passes, the runtime `Chars3D` engine implements custom, highly efficient **GPU Shaders** for lightning-fast color and texture composition.

Every paragraph mesh is segmented into discrete material rendering channels. 2D text exposes a dedicated **FrontFace**, while 3D meshes incorporate an automated **SideWall (Extrusion/Bevel)** and **BackFace**. When a container **background or border** is activated, a fourth unique rendering channel is created. This clean structural separation gives you pixel-perfect, independent color, alpha, and texture wrapping control over every single face layer.

---

## Performance Matrix

`Chars3D Create` and the core `Chars3D` runtime engine use fundamentally different mesh rendering strategies. While the compiler relies on traditional merge operations to compute font contours, the runtime engine streams raw data blocks directly to WebGL array registers. 

In Babylon.js, the runtime completely bypasses the heavy `VertexData` abstraction layer, executing via raw `setVerticesData` and `setIndices` pipelines. In Three.js, it streams values directly through clean `BufferAttribute` views.

| Operation Tracker | Time Complexity | CPU Processing Duration | Allocation State / Memory Footprint |
| :--- | :--- | :--- | :--- |
| **Traditional Merging (v1)** | $O(N)$ (Blocky) | 60ms – 120ms execution pauses | Heavy Garbage Collector strain & heap churn |
| **Chars3D In-Place Blit (v2)** | $O(1)$ (Fluid) | **0ms – 1ms execution window** | **Zero-Allocation Footprint** |

---

## Repository Breakdown & Architecture Paths

To keep deployment clean and prevent cross-framework package pollution, the repository is segmented into 5 independent directories. Developers can extract and use only the precise module required for their target environment:

```
/chars3D
├── /chars3DCreate            	# Node.js AOT Font Pre-compiler & Asset Generation dashboard
├── /chars3D_demo_   			# Feature-rich BabylonJS showcase (Scoreboards, real-time clocks)
├── /chars3D_babylon          	# Standalone BabylonJS library files (Zero-noise template)
├── /chars3D_demo_threejs     	# Performance showcase running ThreeJS direct buffer blitting
├── /chars3D_three            	# Standalone ThreeJS library files (Zero-noise template)
├── /playgroundAssets			# playground Assets
├── /chars3D_pg_babylon_Lite	# Files for liteplayground demo (PG)
├── /chars3D_babylon_Lite		# Standalone Babylon/lite library files (template: Under construction)
```

### Demos (BabylonJS OR ThreeJS)
The `/chars3D_demo_babylonjs` and `/chars3D_demo_threejs` environments showcase the Chars3D blitting pipeline under heavy real-time mutation stress. 
* *Note on ThreeJS Features*: The ThreeJS demo currently features a leaner layout suite compared to the BabylonJS build. As the core author specializes in BabylonJS, the open-source community is highly encouraged to contribute, expand, and patch missing parametric layout features!
* *Performance Benchmark*: Despite fewer initial menu features, telemetry tracking reveals that **ThreeJS achieves a better raw WebGL rendering performance**, processing large text blocks in 0ms–1ms by binding raw arrays directly onto hardware attributes.

### Chars3D WebGPU Engine - Demo Babylon Lite

The `/chars3D_pg_babylon_Lite` directory contains the modern, WebGPU-exclusive iteration of Chars3D ported directly to the tree-shakable @babylonjs/lite ecosystem.
You can test its performance metrics, multi-stage typography layering, and liquid procedural shaders instantly in the **official Babylon Lite Playground Sandbox:**
🔗 [Chars3D Dynamic Live Playground Snippet](https://liteplayground.babylonjs.com/snippet/KCY4JL/v/0)

**Architecture Shift: BabylonJS vs. Babylon Lite**

Transitioning from standard legacy Babylon.js to the modern Lite ecosystem introduces critical architectural improvements:
	
	**Dual-Scene Pipeline:**
	Because Babylon Lite drops traditional billboard states, we implement an optimized dual-scene layout tracking a single canvas context. This isolates our interactive world space from a completely locked, high-speed 2D UI interface overlay.
	
	**Functional Geometry Packing & Pipeline Limitations**
	Custom font glyph streams bypass heavy, class-based object instantiations and write raw coordinates directly into a single continuous ArrayBuffer for unified GPU uploads. 
	However, implementing this layout under Babylon Lite reveals key memory and API constraints:

	**WebGPU Attribute Overhead:** 
	Flattening detailed typography alongside custom miter data and stage coloring tracking vectors increases the runtime layout footprint. For 2,346 characters, the master text array buffer consumes **~5.39 MB of base memory paired with ~3.01 MB of extra memory** dedicated strictly to storing WebGPU tracking attributes (T and FIDCOLOR).

	**Rigid Buffer Architecture:**
	The native createMeshFromData() factory handles vertex definitions through a rigid layout pattern designed for fixed attributes (positions, normals, indices, uvs, uvs2, tangents, colors).

	**Custom Vertex Shader Constraints:**
	Because the factory lacks a generic data pipeline or an extensible attribute dictionary loop, we cannot pass custom scalar registers like our legacy "aFaceId" directly. 
	To maintain compatibility with Lite rigid layout, our engine must manually reformat 1-component custom data into standard 4-component vectors (Float32Array) and inject them into an unrelated register slot like colors (input.color.x) or tangents. 
	This limitation restricts the framework's native capabilities when writing tailored, highly complex WebGPU WGSL vertex modules.

> Note: Clean, standalone implementation build scripts and modular packages for standalone deployment will be deployed directly once final framework iterations conclude.


### 📦 Standalone Libraries (To start your own App)
Because this project is in its public BETA rollout phase, it is distributed directly via this repository rather than an NPM bundle. To integrate Chars3D into an active project without the visual noise or interface overlays of the interactive demos, navigate to `/chars3D_babylon` or `/chars3D_three`. These folders isolate the pure engine scripts, enabling you to mount fonts, hook up textures, and render custom paragraphs instantly.

---

## The Story Behind Chars3D

While developing an interactive application, I encountered a major graphics bottleneck: I needed to render more than 80 independent blocks of real-time 3D text simultaneously, spanning several distinct font families, while i needed some extra functionalities.

I extensively explored the mainstream text generation mechanisms available within the web ecosystem:
*   [BabylonJS Built-in Text Mesh](https://doc.babylonjs.com/features/featuresDeepDive/mesh/creation/set/text)
*   [MSDF Text Addon](https://doc.babylonjs.com/addons/msdfText/)
*   [MeshWriter Extension](https://doc.babylonjs.com/communityExtensions/meshWriter/)
*   [Fast, dynamic 3D text in any TrueType font (Forum Discussion)](https://forum.babylonjs.com/t/fast-dynamic-3d-text-in-any-truetype-font/15770)

Many of these solutions felt computationally heavy, created severe heap garbage collection spikes during string mutations, or required linking large third-party runtime modules. I realized that under the hood, every single typography tool was executing the exact same repetitive steps on the user's client machine:

1. Loading a Font
2. Loading and running `opentype.js`
3. Executing triangulation via `earcut.js`
4. Computing vector contours, bevel boundaries, and miter lengths for every single character.
5. draw text

OR 
1. Loading a JSON font paths translated by `facetype.js`
2. draw text using MeshBuilder.textBuilder, 
	- where executes, triangulation via `earcut.js` 
	- and Computing vector contours, for every single character via ExtrudePolygon, slow and heavy,

OR 
1. Loading a JSON font paths translated by [Bmfont](https://msdf-bmfont.donmccurdy.com/), where supports only .ttf fonts
2. Loading a font image
3. executing the heavy `await ADDONS.TextRenderer.CreateTextRendererAsync()`
4. .addParagraph
5. draw text

I had this engineering epiphany: **We do not need to execute these heavy parsing steps on the client's device at runtime.** 

Instead, we can construct a dedicated compilation tool to analyze font vectors ahead of time, compute the shape indices, and serialize those raw array results directly into static files. At runtime, the rendering application simply reuses these pre-compiled geometric character modules.

This approach delivers massive hardware acceleration, skips client-side vector calculations entirely, and removes the need to bundle `opentype.js` or `earcut.js` or other heavy functions, inside your production client build. 

That is how **Chars3D** was born!


## Credits & Engineering Context

*   **Algorithmic Inspiration**: The baseline architectural concept for low-level vertex array generation was inspired by the excellent work found in the BabylonJS forum thread: *[Fast, dynamic 3D text in any TrueType font](https://forum.babylonjs.com/t/fast-dynamic-3d-text-in-any-truetype-font/15770)* and its accompanying [Playground Example](https://playground.babylonjs.com/#IVGSG0#9). Segments of this triangulation logic are integrated within the `chars3DCreate` pre-compiler asset tool.
*   **The AI Acceleration Journey**: The full development cycle of the Chars3D framework spanned roughly 6 months of intense programming and optimization. This project was accelerated through the collaborative use of **Advanced AI Technology**. Utilizing AI acted as a major step forward, cutting down on deep architectural debugging passes and enabling a single engineer to build a dual-framework graphics engine in a fraction of the traditional timeline.

---

## License

This framework is open-source software distributed under the terms of the **MIT License**.

