# Kenney Food Kit buka integration

## Implemented scope

The buka uses Kenney Food Kit 2.0's open `pot-stew.glb` for the fourth counter pot only. It replaces the red procedural pot at `(2.7, 1.35, -7)` with the source mesh at scale `1.35`. The existing ladle stays because its lower tip meets the imported pot's open rim. The other counter pots and the kitchen-corner pot are unchanged.

The source review originally recommended `bowl-soup.glb` on geometry cost alone. Visual art review selected `pot-stew.glb` because its handles and cooking-pot silhouette fit the buka counter more clearly.

## Runtime shape

`BatchGeometry` adds one small static-geometry seam to the existing scene batch:

- `pos`, `nor`, and `idx` carry the source geometry.
- optional `col` carries linear RGB per vertex.
- `Batch.geometry(shape, colour, options?)` applies the current `Batch.at(...)` transform, transforms normals through the existing normal-matrix path, multiplies baked colours by the caller's tint, and merges indices into the selected existing layer.
- `footprintRecorder` measures the imported shape once from its full bounds, then routes it through the same wall-part, walk-obstacle, and camera-solid ownership rules as a primitive.

The generated module exports one indexed `KENNEY_POT_STEW` shape. It adds no runtime GLB load, texture, material, separate mesh, or additional draw. The shared solid material keeps the normal venue roughness and lighting behavior.

## Source and bake evidence

- Source GLB: 29,560 bytes, 532 vertices, 370 triangles, identity node transform.
- Source bounds: `[-0.328724712, 0, -0.411035806]` to `[0.328724712, 0.360799998, 0.411035806]`.
- Texture: 512 × 512, 8-bit indexed PNG, nearest filtering, glTF `flipY=false` orientation.
- Compact generated source: 10,345 bytes; gzip level 9: 4,298 bytes; SHA-256 `38f59214b8a4086762653ff321be87143f737aee13a9fb286ecfa4d6094bc313`. This replaces the 88,808-byte literal version (7,472 gzip).
- Licence copy: 711 bytes; SHA-256 `32a081c2035dd4db47d850c83244da048165f0e53d71c076b76c1afc0590bc7f`.

The atlas cannot be represented as one exact flat colour per triangle: 164 of 370 triangles sample more than one palette colour. The accepted bake samples each vertex and lets the existing vertex-colour material interpolate in linear RGB. A 10-step barycentric grid over all triangles produced 24,420 comparison samples against the nearest source atlas: maximum channel error `0.048984` at triangle 232, RMS channel error `0.009508`. The bake rejects maximum error above `0.06` so a materially different atlas cannot silently pass.

## Acceptance boundary

The parent reference render compared the original GLB and atlas with the generated shape through the actual batch and scene material from three-quarter, top/interior, and side views. Shape, handles, stew surface, and closed front-side surfaces were preserved; the smoother baked gradient was accepted. Evidence: `docs/research/open-source-2026-10-13/evidence/kenney-pot-source-baked.jpg`.

The buka close-up accepted scale `1.35`, counter contact, and orientation. The selected pot's ladle was lowered from centre Y `2.15` to `1.99` so its end reaches the stew; other ladles are unchanged. Renderer comparison was 12,347 triangles, 16 calls, and 16 geometries before, then 12,645 triangles, 16 calls, and 16 geometries after: the expected net 298 triangles with no added call or geometry. The final close-up is `evidence/buka-kenney-pot-closeup.jpg`. Desktop and 390-pixel before/after harness captures show the same scene composition and counts; temporary camera/crowd/viewport overrides were restored.

The original isolated runtime probe produced 370 triangles, 532 vertices and one merged mesh with `material.map === null`. A rotated asymmetric geometry probe matched the recorded bounds to within `3.48e-7` and retained `solid@wallBack` ownership. Existing movement/sight checks passed 19/19 and parametric venue checks passed 4/4. No test files were added or edited for this unit.

The real local guest travelled from Freedom Park to Amala Shitta and completed the Efo Riro meal at the counter. Hunger increased from 10 to 65; the player finished at the counter with `moving=false`, `blocked=false`, `easing=false`. The settled venue remained at render count 23,540 and ambient frame count 6,833 across a subsequent 16-second observation, with the loop stopped. This scene had one ambient resident and measured 12 calls / 13,964 triangles / 11 geometries / 5 textures. These are full-game observations of this sample, not a low-end-phone guarantee.

## Final compact representation

Exact complete-vertex welding reduces 532 vertices to 404 while retaining the same 1,110 indices, triangle order and winding. The 5,496-byte payload stores bounded int16 positions, two-component octahedral normals, two palette indices per byte, delta-coded indices and a 12-colour float32 palette. It decodes once into the existing typed-array BatchGeometry; scratch data is scoped to the decoder and no work is added per frame.

A parent-run comparison against the retained literal artifact measured maximum position error 0.000006169, normal direction error 0.002559 degrees and colour error 2.609e-8; every decoded index is valid. A repeated bake produced identical source and licence bytes. The final buka harness still renders 12,645 triangles at six visitors, 16 calls and 16 geometries, matching the pre-compaction scene.

The complete production build and download check passed after compaction: shared scene chunk 188,216 raw / 70,633 gzip, versus limits 192,000 / 71,000. The previous literal chunk was 254,958 / 74,525. No budget or bundler-splitting rule was changed.
