# Baseline main-thread profile, 2026-10-17

Branch `perf` (= origin/main), Vite dev server (open-dev, unminified, so URLs are `/src/...` and `chunk.js` is the pre-bundled three.js). Headless Chromium with the GPU (ANGLE/Metal), 1280x800, `/?diagnostics`, guest life. Each scene: CPU sampling at 500 us for 8 s while the avatar walked (`walkTo(x+/-20, z)` every 1.5 s). Script: `/tmp/allworld-probes/perf-profile.mjs`; analysis: `perf-analyse.mjs`, `perf-render.mjs` in the same folder.

Scenes: **neighbourhood** (outside home; 43k triangles, 30 draw calls) and **city street** (`location: city-street`, entered through `walkStreetGate()`; 28k triangles, 9 draw calls).

Sampled wall time about 8.1 s each. Main thread idle: neighbourhood 41.5%, street 71.0%. Busy: neighbourhood 4.45 s, street 2.09 s.

## Top self-time functions (idle excluded)

Neighbourhood (percent of all samples):

| Function | File | Self ms | % |
|---|---|---|---|
| toDataURL (native) | called from three `serializeImage` via `native-body.ts clone` | 1737 | 21.7 |
| updateWorldMatrix | three (chunk.js) | 516 | 6.4 |
| multiplyMatrices | three | 279 | 3.5 |
| applyBoneTransform | three | 199 | 2.5 |
| wasm-function[1] | wasm | 145 | 1.8 |
| localToWorld | three | 104 | 1.3 |
| srgbChannel | character-lab/runtime/characters.js | 102 | 1.3 |
| getVertexPosition | three | 76 | 1.0 |
| updateMatrixWorld | three | 74 | 0.9 |
| bodyMask | character-lab/runtime/characters.js | 52 | 0.7 |

Street:

| Function | File | Self ms | % |
|---|---|---|---|
| updateWorldMatrix | three | 687 | 8.6 |
| multiplyMatrices | three | 370 | 4.6 |
| applyBoneTransform | three | 204 | 2.6 |
| localToWorld | three | 144 | 1.8 |
| updateMatrixWorld | three | 92 | 1.2 |
| applyMatrix4 | three | 53 | 0.7 |
| sample | character-lab/runtime/foot.js:50 | 45 | 0.6 |
| traverse | three | 37 | 0.5 |
| fromBufferAttribute | three | 33 | 0.4 |
| getX | three | 31 | 0.4 |

`(program)` is 2.9% in both; the sample had 12.7k points each. By file (street): three `chunk.js` 22.9%, `foot.js` 0.8%, `characters.js` 0.6%, `street/host.ts` 0.3%.

## Where the frame time goes

- **Neighbourhood** has a one-off cost inside the window: `makeTemplate` (`scene/body/canonical-crowd.ts:162`) totals 2570 ms (32% of samples). 1745 ms of it is `native-body.ts` `clone` -> three `Material.copy` -> `Texture.toJSON` -> `canvas.toDataURL`. This is crowd-template building, not steady-state. Excluding it, busy time is about 1.9 s (23%).
- **Frame loop** (`motion-loop.ts frame`, via `venue-world.ts tick` or `street/host.ts`): 2125 ms neighbourhood, 1977 ms street, nearly all of the street's busy time (95%).
- **Character animation dominates the street frame.** `characters.js update` totals 1771 ms (85% of busy), including `foot.js update` (foot planting) 1593 ms and `foot.js sample` 583 ms, `stand-in.ts step` 932 ms, `native-body.ts sample` 1789 ms. Most of that is three's skeleton/matrix work (`updateWorldMatrix`, `localToWorld`, `getVertexPosition`, `applyBoneTransform`) called from foot sampling.
- **Render submission** on the main thread is small: `WebGLRenderer.renderBufferDirect` 10 to 27 ms self, `setProgram` 9 ms. GPU time is not visible in a main-thread CPU profile.
- **GC**: `(garbage collector)` 0.4% neighbourhood (33 ms), 0.6% street (51 ms).

## Heap (street, after `HeapProfiler.collectGarbage`)

Total 175.6 MB.

| Constructor / type | MB |
|---|---|
| (native) | 125.0 |
| (string) | 17.7 |
| (code) | 13.7 |
| (array) | 4.3 |
| Object | 4.1 |
| (concatenated string) | 3.9 |
| (hidden) | 2.3 |
| (object shape) | 1.3 |
| Array | 0.5 |
| ArrayBuffer / Float32Array | 0.3 / 0.3 |

Native breakdown: `JSArrayBufferData` 87.7 MB (3431 buffers), `ExternalStringData` 36.4 MB (4563 strings, mostly dev-server source text). ArrayBuffer data grouped by retainer: glTF parser caches 39.4 MB (1488 buffers), morph `DataArrayTexture` 24.3 MB (39), `BufferAttribute` arrays held by promises 14.6 MB (370), a wasm `Memory` 4.1 MB (the `simplifyAttr` mesh simplifier).

Largest ArrayBuffers: 18.6 MB (`DataArrayTexture` `Source` data, held by a `SkinnedMesh` geometry morph texture); 3.9 MB (wasm Memory); 3.3 MB, 1.9 MB, 1.9 MB, 1.1 MB (GLTFParser cache promise results); 2.5 MB (`GLTFBinaryExtension.body` in `AssetStore`).

## Raw files (`/tmp/allworld-shots/perf-profile/`)

- `neighbourhood.cpuprofile`
- `street.cpuprofile`
- `street.heapsnapshot` (100 MB)
- `street.png` (street screenshot from the final run)

Caveats: dev build (unminified, no bundle splitting); headless; one run per scene; the Vite module URLs carry no hashes to strip.
