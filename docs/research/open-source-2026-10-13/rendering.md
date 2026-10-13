# Open-source rendering and gameplay research — 2026-10-13

This is a source review, not a claim that any option improves Allworld until the proposed benchmark is run. External repository/API status was checked on 2026-10-13. No dependency, source, build, server, or test changes were made.

Repository identity for this pass: `5179285a25cb616e9c8ef5b137150a5a6f6e05e7`, committed 2026-10-12 22:32:05 +01:00 (`Storage switch, release A: the build's word is shadow`). The repository root carries an AGPL-3.0 license. This is the source state researched; the worktree also contains pre-existing dirty `src/scene/characters.ts`.

Pinned upstream evidence used here: [glTF-Transform `3797aad`](https://github.com/donmccurdy/glTF-Transform/tree/3797aad585021e68cf5fbf3f2fba37783596ffac) (2026-10-06), [meshoptimizer `b233043`](https://github.com/zeux/meshoptimizer/tree/b2330430776a95a1545f03fc7bf16927f8cadc59) (2026-10-09), [KTX-Software `1e31189`](https://github.com/KhronosGroup/KTX-Software/tree/1e31189218d016cd1b4096e644248ed20bbca22f) (2026-10-12), [three-mesh-bvh `b0935a7`](https://github.com/gkjohnson/three-mesh-bvh/tree/b0935a7ec5904d2c009880be8da843b2637f185d) (2026-10-12), and [Three.js `3995acf`](https://github.com/mrdoob/three.js/tree/3995acf2a9e79ebd2b02c0e9e7f820fa2a4838fb) (2026-10-12). Recheck these pins before dependency work.

## Current Allworld baseline

Allworld is already built around a useful performance contract:

- `package.json` uses Three.js `^0.180.0`; the lockfile already contains `meshoptimizer` `0.22.0` as a transitive dependency.
- `src/scene/models/gltf-source.ts:1-8,36-42` lazy-loads `GLTFLoader` and Three's Meshopt decoder, bakes node/UV transforms, and reuses one atlas texture per key.
- `src/scene/models/scene-models.ts:14-25,58-100,150-176` supports near/far models, merge or instance mode, explicit triangle/draw-call budgets, priority-based dropping, stand-ins, and distance focus.
- `src/map3d/city-build.ts:135-140` sets a city triangle budget and targets about forty draw calls; `:728-747` caps fabric populations and uses `InstancedMesh`.
- `src/venue-world.ts:32-40` and `src/map3d/map3d.ts:25-31` use on-demand rendering and stop their motion loops at rest. `src/venue-world.ts:122-159` exposes draw calls, triangles, geometries, textures, tier, and pixel ratio in diagnostics.
- `src/scene/body/skinned.ts:1-16,135-180,194-199` already uses a lazy Meshopt-decoded skinned body, one mesh/material, bounded animation transitions, and a pose checkpoint for procedural foot correction.

The asset capability is already present and documented. The three body GLBs and the street GLBs contain `EXT_meshopt_compression`, `KHR_mesh_quantization`, and (for textured models) `KHR_texture_transform`; the body clip pack has 60 animations. `package-lock.json` resolves `meshoptimizer` 0.22.0. `docs/ASSETS.md:63-84`, `package.json`, and `scripts/body/build-body.ts:1-11,27,46,89-92` document the deterministic `npm run body:build` pipeline, which fetches `gltfpack@1.3.0` through `npx`, resizes/encodes the body atlas to JPEG, simplifies/quantizes, and emits Meshopt-compressed GLBs. The right first question is therefore whether an extension of this existing pipeline produces measured additional value; do not recover a missing pipeline or add a duplicate optimizer.

### Read-only GLB inventory

The following counts come from the embedded JSON headers of the largest relevant shipped assets at this HEAD; triangle counts are index-count / 3 (or POSITION-count / 3 when non-indexed), before runtime merges or instancing.

| asset | bytes | primitives | triangles | materials | textures/images | animations | useful first fixture |
|---|---:|---:|---:|---:|---:|---:|---|
| `src/scene/body/assets/clip-pack.glb` | 338,060 | 0 | 0 | 0 | 0 / 0 | 60 | animation compression/decode and pose parity |
| `src/scene/body/assets/base-body-male.glb` | 159,916 | 1 | 9,002 | 1 | 1 / 1 | 0 | skinned mesh, atlas, quantization, wardrobe |
| `src/scene/street/assets/shops-cream.glb` | 107,204 | 5 | 438 | 1 | 1 / 1 | 0 | multi-part atlas, anchors/labels, near/far comparison |

The male and female body files are effectively the same size and triangle count (159,916/9,002 and 157,992/9,002 bytes/triangles); use the male file as the first fixture and include the female file in parity coverage. This inventory is evidence of shipped inputs, not a performance result.

Texture fixtures for KTX2 comparison are concrete: `base-body-male.glb` embeds a 1024×1024 JPEG atlas of 81,198 bytes; `base-body-female.glb` embeds 1024×1024 JPEG of 80,164 bytes; `shops-cream.glb` embeds a 1024×1024 JPEG of 95,937 bytes; and the shared procedural street atlas `src/scene/street/assets/home-atlas.jpg` is 1024×1024 and 138,566 bytes. These are compressed-image payload sizes, not decoded GPU memory. The body pipeline explicitly documents that gltfpack 1.3 has no WebP or KTX2 support (`docs/ASSETS.md:76-79`), making the body atlas a precise first KTX2 experiment.

That means the first question is whether an option replaces a measured bottleneck. Adding another batching, LOD, or animation framework without that proof would duplicate existing ownership.

## Candidates

### 1. glTF-Transform + meshoptimizer — audit and formalize the existing asset pipeline

The pinned [glTF-Transform repository](https://github.com/donmccurdy/glTF-Transform/tree/3797aad585021e68cf5fbf3f2fba37783596ffac) is MIT-licensed and provides JavaScript/TypeScript tooling for glTF 2.0. Its documented commands cover Meshopt compression of geometry, morph targets, and keyframe animation, plus texture resizing and KTX2/Basis Universal compression. Its CLI also exposes optimization switches for instancing, simplification, texture compression, flattening, joining, and quantization. The pinned [CLI source](https://github.com/donmccurdy/glTF-Transform/blob/3797aad585021e68cf5fbf3f2fba37783596ffac/packages/cli/src/cli.ts) is the primary API evidence.

The pinned [meshoptimizer glTF documentation](https://github.com/zeux/meshoptimizer/blob/b2330430776a95a1545f03fc7bf16927f8cadc59/gltf/README.md) documents `EXT_meshopt_compression`, `KHR_texture_basisu`, `EXT_gpu_instancing`, WebP, and Meshopt decoding; it also warns that unknown extensions, attributes, and some interactive-scene data may be discarded. The project is MIT-licensed in the same document, and its pinned [contribution guidance](https://github.com/zeux/meshoptimizer/blob/b2330430776a95a1545f03fc7bf16927f8cadc59/CONTRIBUTING.md) documents CI/testing expectations.

Fit: **extend the existing gltfpack pipeline only for measured additional value**. Keep `npm run body:build`, `scripts/body/build-body.ts`, and the current runtime loaders as the ownership boundary. A glTF-Transform/meshoptimizer experiment may be useful for a new asset class or a documented missing transform, but it must be compared with current gltfpack output and preserve labels, anchors, wardrobe data, animation metadata, and deterministic output. Compare file bytes, decoded triangles, load/decode time, texture bytes, render calls, and visual/animation parity. Do not add a duplicate optimizer merely because it is available upstream.

### 2. KTX-Software / Basis Universal — adopt for texture assets if VRAM or upload is the bottleneck

The pinned [Khronos KTX-Software repository](https://github.com/KhronosGroup/KTX-Software/tree/1e31189218d016cd1b4096e644248ed20bbca22f) provides KTX2 tools plus JavaScript/WASM bindings and a Basis Universal transcoder. The repository describes ETC1S and UASTC as formats that transcode to GPU-supported formats. Its pinned [REUSE metadata](https://github.com/KhronosGroup/KTX-Software/blob/1e31189218d016cd1b4096e644248ed20bbca22f/REUSE.toml) identifies the package as Apache-2.0. Khronos’s [developer guide](https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXDeveloperGuide.md) documents KTX2 in glTF through `KHR_texture_basisu` and distinguishes transmission format from GPU-compressed output.

Fit: **adopt selectively** for `src/scene/models/gltf-source.ts:44-64`, where atlases are loaded with `TextureLoader` and fixed anisotropy. This is a texture pipeline/runtime change, not a renderer rewrite. Use KTX2Loader only for measured atlas candidates and preserve a fallback for devices that cannot transcode. Acceptance must include decoded texture format, visual parity, memory/upload observations, and fallback behavior on the same phone tier. No benefit number is asserted here; KTX2 can reduce transfer/VRAM pressure, but the result depends on source texture content and target GPU support.

### 3. three-mesh-bvh — adopt for targeted spatial queries, not blanket rendering

The pinned [three-mesh-bvh repository](https://github.com/gkjohnson/three-mesh-bvh/tree/b0935a7ec5904d2c009880be8da843b2637f185d) is MIT-licensed and documents accelerated raycasts, shapecasts, `raycastObject3D`, and BVHs for batched meshes. Its pinned [`SkinnedMeshBVH` API](https://github.com/gkjohnson/three-mesh-bvh/blob/b0935a7ec5904d2c009880be8da843b2637f185d/API.md#skinnedmeshbvh) computes primitive bounds from `SkinnedMesh.getVertexPosition()` and requires `refit()` after skeleton updates. The general `MeshBVH` remains static and does not support morph targets or skinning. The pinned [release notes](https://github.com/gkjohnson/three-mesh-bvh/blob/b0935a7ec5904d2c009880be8da843b2637f185d/CHANGELOG.md) say `SkinnedMeshBVH` and `ObjectBVH` are still in development and their APIs may change; compatibility with Allworld’s Three.js r180 must be verified rather than inferred from the project’s r186 fix.

Fit: **adopt only for a measured query hotspot**. Candidate owners are `src/scene/camera-collision.ts`, `src/map3d/people.ts`, or future venue interaction queries. The current camera collision deliberately uses boxes and avoids mesh raycasts (`src/venue-world.ts:49-53`), so replacing that path would be a regression unless profiling shows boxes are insufficient. For the player body, a specialized SkinnedMeshBVH spike is technically possible but must include per-pose `refit()` cost and version pinning; it is not a blanket recommendation. A safe first spike benchmarks the same static venue mesh with native Three raycast versus BVH raycast, including build cost and disposal.

### 4. Three.js `LOD`, `InstancedMesh`, and current WebGPU/BatchedMesh work — study and extend existing code

Three.js is already the runtime dependency at `^0.180.0`. The official [LOD API](https://threejs.org/docs/pages/LOD.html) supports distance levels, hysteresis, and manual updates when `autoUpdate` is disabled. Allworld’s `scene-models.ts` already implements a domain-specific near/far layer, including async model swaps and distance focus. The city map already uses `InstancedMesh` (`src/map3d/city-build.ts:734-747`), and the map’s `houses.ts` uses instanced layers.

Fit: **study, do not add a second abstraction yet**. Three.js’s LOD could be useful for a self-contained moving actor or a future scene object with three levels, but replacing the existing budget-aware layer would lose priority dropping, stand-ins, atlas merges, labels, and async loading. Three.js release notes show continuing WebGPU and BatchedMesh/LOD work, but the current app explicitly gates WebGL (`src/map3d/map3d.ts:94-97`) and has a WebGL renderer path (`:156-162`). WebGPU should remain **deferred** until a browser/device support matrix and visual/performance benchmark justify a parallel renderer.

### 5. Rapier — defer physics; study character-controller boundaries

The [Rapier documentation](https://rapier.rs/docs/) describes an Apache-2.0 open-source 2D/3D physics engine with rigid bodies, joints, soft bodies, sensors, snapshots, and optional determinism. Its [JavaScript character-controller guide](https://rapier.rs/docs/user_guides/javascript/character_controller/) documents move-and-slide, slope limits, stairs, and moving platforms. However, the old [rapier.js repository is archived](https://github.com/dimforge/rapier.js) and explicitly migrated into the main Rapier repository’s `typescript` directory.

Fit: **defer**. Allworld currently has authored walk grids, box-based camera collision, step/approach paths, foot contact correction, and gameplay state that does not require a general rigid-body world. A physics engine would add WASM loading, fixed-step ownership, collider authoring, save/replay decisions, and a new collision contract. Revisit only for a named gameplay requirement such as vehicle collisions, dynamic props, or a physics-driven minigame. If revisited, benchmark the current movement path against a tiny isolated controller scene and keep physics outside authoritative economy/state logic.

### 6. glTF-Transform’s built-in simplification/instancing — study as an offline complement

The same [glTF-Transform CLI source](https://github.com/donmccurdy/glTF-Transform/blob/main/packages/cli/src/cli.ts) documents simplification, instancing, joining, quantization, and texture compression in one pipeline. This is useful for generating far GLBs that match Allworld’s current `near`/`far` placement contract, but it should not be treated as proof that automatic simplification preserves recognizability of Lagos landmarks, labels, doors, anchors, or wardrobe silhouettes. **Study** with 2–3 representative models; adopt only if the generated far asset passes landmark/anchor and triangle/draw-call checks.

## Recommended order

1. **Extend and benchmark the existing `gltfpack@1.3.0` asset pipeline** for a named additional need; use glTF-Transform/meshoptimizer only as a compared alternative, with a metadata-preservation allowlist.
2. **Benchmark KTX2 on the largest atlases** and adopt only where the target phone tier shows a real transfer, upload, or texture-memory win.
3. **Measure spatial queries before adding three-mesh-bvh**; current box collision and batched meshes may already be the cheaper path.
4. Keep Three.js `LOD`/WebGPU as study items because Allworld already owns equivalent LOD/instancing policy. Three.js r180's `WebGLRenderer` uses WebGL2 and has no WebGL1 fallback; the supported unavailable path is Allworld's existing 2D map / scene fallback, not a WebGL1 benchmark.
5. Defer Rapier until a concrete physics-driven feature exists.

## Noninvasive benchmark and acceptance plan

Use a temporary benchmark harness or existing diagnostics; do not change gameplay code for the first pass.

1. Fixtures: one street near/far pair, one textured model with anchors/sign labels, one body GLB plus clip pack, and one representative city pack. Record source commit, tool versions, file bytes, triangle counts, texture dimensions/bytes, and custom glTF metadata.
2. Runtime baseline: use `src/scene/harness.ts` diagnostics and `VenueWorld.diagnostics()` to record render calls, triangles, geometries, textures, pixel ratio, and frame counts at rest, while walking, during a near/far focus change, and during avatar transition.
3. Candidate runs: generate optimized copies outside the source tree; compare load/decode completion, first usable frame, renderer.info texture/geometry counts (object counts, not GPU bytes), estimated bytes from dimensions/format/mip levels, device-reported memory where available, visual screenshots, anchor positions, labels, door omission behavior, body pose/stride, and disposal.
4. Device matrix: at minimum one desktop Chromium/WebGL2 path and one phone-sized coarse-pointer/WebGL2 path. Separately exercise the actual Allworld renderer-unavailable path (the 2D map/fallback), because Three.js r180 does not support WebGL1. Keep `prefers-reduced-motion` and Data Saver cases in the matrix.
5. Acceptance: adopt only when the candidate preserves gameplay-visible behavior and improves a measured bottleneck without breaking the existing budget contract. A build, package install, repository activity, or a single happy-path screenshot is insufficient proof.

## Limits and gaps

No current Allworld performance trace, GPU memory sample, network waterfall, or device matrix was available in this research unit, so no speedup, FPS, memory, or download claim is made. Pinned repository facts and licenses should be rechecked immediately before dependency work. KTX2/Basis Universal requires an explicit extension of the current JPEG/gltfpack pipeline, decoder delivery, and fallback coverage. Existing dirty work in `src/scene/characters.ts` was left untouched.
