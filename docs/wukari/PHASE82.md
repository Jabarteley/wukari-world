# Wukari Life: performance and character polish

Run `npm run wukari:play` and open http://127.0.0.1:5196/. Choose **Customize Character**, select Male or Female, change appearance and **Save character**. Saved Phase 8.1 looks remain compatible. Clothing, all eight hairstyles, face zoom and idle/walk/sprint use the existing rigged characters.

To measure your own machine, choose **Settings → Measure performance**. This starts 20 seconds of play: walk, sprint, turn the camera and stay in the foreground. Download the result when it finishes. It includes FPS, median and 95th-percentile frame times, CPU update/submission costs, renderer identity, render resolution and resource estimates. An interrupted measurement is labeled. Repeat after warm-up and after several minutes of play; compare the same route, preset and resolution. A 30 FPS frame budget is 33.33 ms. Average FPS alone does not establish stability.

## Appearance review

Separate torso/sleeve primitives are replaced by a continuous garment derived from the licensed native body, with interpolated native skin weights at exact cuffs, neckline and hem. A relaxed fabric envelope and smoother torso normals remove painted-muscle shading. The complementary body cut prevents skin or trousers fighting the garment along those boundaries. Polo collar shading and jacket panels remain selectable, together with clothing/shoe colors. This remains a simple stylized wardrobe, without cloth simulation or imported fashion assets.

Faces, eye textures, hair geometry and source assets are preserved. Native triangle counts are 14,318 male / 15,060 female with 65 joints and three source materials each. No facial decimation was applied. Normal maps remain 1024 pixels. Hair is already merged into a fitted cap and one strand/curl mesh; it remains attached to the head. All sixteen preset/style combinations are reviewed in screenshots and covered by eye/brow ray and head-attachment checks. Owner visual approval remains open.

## Profiling and changes

The baseline is the committed Phase 8.1 implementation, measured before runtime optimizations using Chrome CDP CPU sampling and frame timestamps. A clean six-second walking sample at a 1440×960 browser viewport, DPR 1, measured **55.93 FPS**, 16.7 ms median and 32.9 ms 95th percentile. The initial failed connection attempts were a stopped local server, not GPU initialization failures; the clean baseline has no captured browser errors. The prior 3–4 FPS result explicitly used SwiftShader and is not a hardware comparison.

CPU profiles identified triangle raycasts for camera obstruction, matrix updates, collision iteration and renderer state work. Changes address those costs:

- Camera obstruction uses a 16 m grid and exact footprint-side/roof intersections instead of scanning a combined triangle mesh. Tests compare non-tangent rays to the rendered Float32 extrusions within 1 mm; exact source-coordinate vertex tangencies are retained rather than rounded away.
- Movement queries the same exact road-capsule and building-clearance rules through a spatial index. Tests compare against the original predicates at road offsets, boundaries and negative grid cells. No source coordinates, road widths/corrections or geographic data files change.
- Static world transforms are frozen. The renderer owns the avatar matrix update instead of an extra forced recursive walk in every animation call. Scratch movement/direction vectors avoid repeated hot-path allocation.
- Road caps at identical endpoints share the largest existing safe disk. The union is unchanged, while redundant triangles/overdraw are removed. Roads and buildings remain batched. No expensive real-time shadows or post-processing were present or introduced; the existing lightweight contact disk remains.
- The world stops rendering behind menu panels and while hidden, so the editor does not compete with a live town renderer. The preview keeps its context across preset switches, creates actual hair thumbnails incrementally only in customization, and caches at most four thumbnail sets. Stale preset images clear immediately. GPU resources, samples and pending thumbnail work are disposed/cancelled on exit. Body cut geometry is cached against the two immutable native templates; instances own cloned buffers.

The matching post-change short profile measured **58.48 FPS**, 16.7 ms median and 18.5 ms 95th percentile; the default male scene fell from **94,824 to 74,058 triangles**. Camera triangle intersection functions disappear from the top 24 sampled functions; `updateMatrixWorld` self samples fell from 158 ms to 31 ms. Profile windows differ slightly due to CDP overhead. Total script time per wall second did **not** improve in these two noisy samples, so the evidence supports specific hotspot/geometry reductions and improved observed frame pacing, not a universal CPU-speedup claim. Driver uploads, rendering and ordinary matrix work remain visible costs.

## Graphics settings

| Setting | Resolution | Gameplay horizon | Road detail lines |
|---|---|---|---|
| Low | 75% scale, DPR cap 1 | 220 m | Hidden |
| Medium | Full scale, DPR cap 1.25 | 500 m | Visible |
| High | Full scale, DPR cap 1.75 | 1000 m | Visible |

The geographic overview retains its full camera range. Faces, hair, collisions and source footprints retain their detail in every preset. Medium and High have the same pixel resolution at DPR 1; High's sharper buffer becomes relevant on denser displays. The horizon is a display limit, not a change to the geographic records.

## Hardware and limitations

Available reference hardware: Intel Core i7-7600U (four logical processors), Intel HD Graphics 620, Windows, Intel driver 31.0.101.2135. Chrome's actual WebGL renderer identifies **ANGLE / Intel HD Graphics 620 / D3D11**, and browser GPU diagnostics report hardware WebGL enabled. These are real local GPU measurements from headless Chrome, not SwiftShader. Headless capture and CDP add overhead; this is not a physical-phone or long-session thermal test, and owner agreement/acceptance of this reference configuration is pending.

GPU execution time and total driver VRAM consumption are not exposed here. CPU render submission timing is explicitly not GPU time. Reported geometry-buffer bytes and texture estimates exclude driver caches, decoded template images, multisample framebuffer overhead and compositor allocations; renderer counts are provided separately.

## Measured results

Final hardware results and validation are recorded below. Reference viewport is 1440?960, with a 1440?884 game canvas at DPR 1. The route exercises walking, camera rotation, lateral movement and sprinting; collisions can stop off-route movement. This is a local review target, not an agreed universal device guarantee.

| Preset | 20-second FPS | Median frame | 95th percentile | Frames over 33.33 ms |
|---|---:|---:|---:|---:|
| Low | 57.58 | 16.7 ms | 16.8 ms | 15 / 1152 |
| Medium | 59.88 | 16.7 ms | 16.8 ms | 1 / 1197 |
| High | 57.78 | 16.7 ms | 17.0 ms | 18 / 1155 |

These samples exceed 30 FPS on average and at the 95th percentile; isolated slower frames remain, so this is not a guarantee of every frame or sustained thermal performance. Small differences between presets are within run-to-run system variation and do not imply High is faster than Low.

The measured female/cornrows scene submits 56,752 triangles, 15 Low / 16 Medium-High draws, 16 geometry resources, five textures and ten programs. Geometry buffers total about 4.32 MB and estimated texture storage is about 5.96 MB (decimal units). Mean CPU update time was 0.16?0.26 ms; mean render submission 1.35?2.51 ms. Default male/short-afro complexity differs, and is captured separately in CPU profiling. No claim of total GPU-memory consumption is made.

The sustained-test editor visits became ready in 661?837 ms including CDP polling/click overhead. Collected JS heap changed from 12,658,260 to 12,891,568 bytes (+233,308 bytes), with zero preview canvases after close. The final visual-only pass independently measured 788?878 ms and +246,316 bytes after four visits; it also left zero preview canvases. This bounded test is useful regression evidence, not a proof against every long-session leak. Templates and up to four thumbnail sets intentionally remain cached. Cold initialization includes model decode and thumbnail generation and is slower.

The last visual pass raised the garment hem by 3 mm after these sustained samples; triangle/material counts and render settings are unchanged. Its updated screenshots and visual-only regression are separately recorded in `phase82-browser.json`. Small hem/cuff edge artifacts can still be visible on close inspection, and the wardrobe remains basic; owner approval is pending.

## Evidence and reproduction

- [Baseline CPU/frame profile](evidence/phase82-profile-baseline.json), [post-change profile](evidence/phase82-profile-after.json).
- [Hardware measurements](evidence/phase82-hardware-measurements.json), [browser acceptance](evidence/phase82-browser.json).
- [Male front](evidence/phase82-male-front.png), [face](evidence/phase82-male-face.png), [side](evidence/phase82-male-side.png), [three-quarter](evidence/phase82-male-quarter.png), [gameplay](evidence/phase82-male-gameplay.png).
- [Female front](evidence/phase82-female-front.png), [face](evidence/phase82-female-face.png), [side](evidence/phase82-female-side.png), [three-quarter](evidence/phase82-female-quarter.png), [gameplay](evidence/phase82-desktop.png).
- [Mobile gameplay](evidence/phase82-mobile.png), [mobile editor](evidence/phase82-mobile-editor.png), [captured-frame turntable](evidence/phase82-turntable.html) (download/open locally; illustrative playback timing).
- The `phase82-male-hair-*` and `phase82-hair-*` images show every hairstyle on male and female respectively. Mobile images use viewport/touch emulation, not a physical phone.

```powershell
node --test src/wukari/*.test.ts scripts/typecheck.test.ts
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p scripts/wukari/tsconfig.json
npm run wukari:build
# With Wukari Life running:
node scripts/wukari/polish-browser.ts
$env:WUKARI_PROFILE_LABEL='after'
node scripts/wukari/profile-browser.ts
```

Whole-project TypeScript remains uncertified with inherited engine/Worker/test-ownership and memory-limited-run findings documented in [Phase 8.1](PHASE81.md) and [Phase 7 type evidence](evidence/phase7-types.json). Focused strict checks and Wukari build are separate evidence; no compiler baseline or suppression changed. FUW remains a non-spawning location review, with access and physical safety unverified. No NPC, database, economy, multiplayer, deployment or geographic extraction work is included.

| Hairstyle | Male | Female |
|---|---|---|
| Low fade | [View](evidence/phase82-male-hair-low-fade.png) | [View](evidence/phase82-hair-low-fade.png) |
| Buzz cut | [View](evidence/phase82-male-hair-buzz-cut.png) | [View](evidence/phase82-hair-buzz-cut.png) |
| Short afro | [View](evidence/phase82-male-hair-short-afro.png) | [View](evidence/phase82-hair-short-afro.png) |
| Curly afro | [View](evidence/phase82-male-hair-curly-afro.png) | [View](evidence/phase82-hair-curly-afro.png) |
| Cornrows | [View](evidence/phase82-male-hair-cornrows.png) | [View](evidence/phase82-hair-cornrows.png) |
| Box braids | [View](evidence/phase82-male-hair-box-braids.png) | [View](evidence/phase82-hair-box-braids.png) |
| Locs | [View](evidence/phase82-male-hair-locs.png) | [View](evidence/phase82-hair-locs.png) |
| Bun | [View](evidence/phase82-male-hair-bun.png) | [View](evidence/phase82-hair-bun.png) |

Final verification: **68/68 focused tests passed**, strict focused `vue-tsc` passed, and the Wukari production build passed (41 modules, JS 763.08 kB / 212.10 kB gzip). The existing 500 kB chunk advisory remains visible. The sustained browser run passed **17 groups** with no captured errors; the final visual-only run repeated the **16 applicable groups**, referencing the preserved sustained hardware measurement file.
