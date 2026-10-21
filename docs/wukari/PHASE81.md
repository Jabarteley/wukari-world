# Wukari Life — avatar and road quality review

Run **`npm run wukari:play`** from the repository and open **http://127.0.0.1:5196/**. An existing local server may already be serving that address. Choose **Customize Character → Male / Female**, select hair and colours, use the **Body–Face** zoom and Front / ¾ / Side controls, then scroll to **Save character**. The rotation button animates a turntable. Both presets have the same clothing/hair choices. Saved Phase 8 appearances migrate without losing their colours; missing presentation defaults to Male.

**Explore Map** shows the real network before spawning. **Walk this network** starts at its marked original junction. WASD/arrows walk, Shift sprints, drag or Q/E turns the camera. Touch directions and Sprint remain available. **Map Information → Expand conflict review** shows exact feature IDs and before/after road surfaces. Access and physical safety remain unverified; this is virtual play, and FUW remains a separate non-spawning location review.

## What changed visually

The old procedural face is replaced by Quaternius's separate rigged male and female models, with modeled noses, mouths, lips, cheeks, jaws, ears, eyelids, eyebrows and textured eyes. The native face topology and facial alignment are retained. Male and Female have distinct heads, body proportions and silhouettes. Original fitted garments, shoes, scalp-fitted hair and native-bone animation are adaptations in the existing Three.js stack. No Blender installation, account service or animation subscription is required.

Eight styles are available to either preset: low fade, buzz cut, short afro, curly afro, cornrows, box braids, locs and bun. The selector uses thumbnails rendered from the actual model. The cap is clipped from the actual head surface, and braid placement is projected against the scalp. Eye/brow sightlines are checked geometrically and reviewed in screenshots, including three-quarter views. The idle/walk/run controller drives the imported skeleton with continuous distance-based phase and smooth heading changes.

This remains a **stylized, neutral-expression character**, with original simple garments and hair rather than a finished commercial character wardrobe. There are no facial expression blendshapes or strand simulation. I visually inspected the face, hairline, profile, clothing and normal gameplay captures; intermediate helmet-like caps, raised cornrows and body-painted clothing were rejected and revised. The owner's visual acceptance is still the product quality gate; green tests do not establish attractiveness.

## Asset rights and size

The existing Allworld runtime, actual native GLBs, release screenshots and third-party notices were inspected. The initial filename search incorrectly reported the assets absent; direct checks confirmed usable files. Its MakeHuman-derived female base is 2,632,124 bytes with 53 bones, 26,928 triangles and 90 morph-target entries; its selected motion GLB has 11 clips. Those meshes have recorded CC0 terms; motion has separate CMU attribution/redistribution terms. The Allworld default-character package receipts record roughly 4.0-4.8 MB Brotli per dressed preset and a catalogue/recipe runtime. This milestone chooses a smaller two-template stylized slice and original bone animation instead of porting that whole adapter stack; the existing assets and runtime are preserved. The replacement uses only the **free Standard** version of [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), obtained through [the creator's itch.io page](https://quaternius.itch.io/universal-base-characters). Both Quaternius primary pages explicitly identify CC0 and commercial use; the downloaded archive includes the same CC0 licence. No paid Source files or proprietary game assets were used.

- Creator licence: [models/LICENSE.txt](../../data/wukari/phase81/models/LICENSE.txt).
- Exact archive/source/derived hashes and modifications: [models/provenance.json](../../data/wukari/phase81/models/provenance.json).
- Male GLB: **1,728,700 bytes**. Female GLB: **1,835,444 bytes**. Both contain their rig, skin weights, original eye image and optimized 1024-pixel normal maps. Original facial topology is unchanged. Skin palette textures/redundant attribute references were removed; normal vectors were resized and renormalized. Initial unoptimized repacks were approximately 10 MB total; the shipped pair is 3.56 MB.
- Optional offline reproduction: `python scripts/wukari/prepare-character.py` against the pinned archive in the ignored local cache. Pillow and NumPy were already installed; no new runtime dependencies were added. Running the game uses the committed assets and requires no Python.
- Templates/immutable decoded images are bounded to the two presets. Each actor owns cloned geometry, materials, texture handles and skeleton GPU data; preview loops, observers, canvases and WebGL contexts are released on close. Hair thumbnail rendering shares the one preview context. Only the two template meshes and decoded source images persist for the page's lifetime; instance GPU texture handles are explicitly disposed.

## Road diagnosis and correction

The Phase 7 data already contained bends and junctions, and the renderer preserved their polyline vertices. However, its 760 m whole-way window omitted some connecting roads, including way **185860487** at the previous spawn. The low follow camera looked down a short straight road, while overview fog washed out the distant network. This was a selection/presentation problem, not a projection axis swap or fabricated straightening.

The new selection is a **1 km square**, centred at original OSM **node 1965491008**, **9.7763613° E, 7.8695157° N**. It contains **54 residential road ways, 243 building footprints, 30 shared-reference junctions and six subset graph components**. The spawn is a genuine four-neighbour junction joining ways **185860473, 558732998, 558732999 and 558733010**. Geometry tests walk three original arms beyond the junction. No connector or bend is invented. The display window is not a town/campus boundary; crossing ways and relation geometry remain omitted and the crossing-way IDs are inventoried.

The source is the existing, nine-batch validated local aggregate, SHA-256 `9dece439bd87b8f4883d7e42f3704275bf1102f98310d6e0cb09b181e3398750`. No PBF was redownloaded, no importer rebuilt, and original data/batches were not overwritten. [Full inventory and diagnosis](evidence/phase81-geography.json). [Editable ODbL data/provenance offer](../../data/wukari/phase81/README.md). FUW JSON is byte-identical to Phase 7.

| Road way | Building way | Exact centre-line clearance | Cause / action |
|---|---|---:|---|
| 558733005 | 1523015718 | 0 m | Genuine source intersection; suppress intersecting surface intervals and flag review |
| 185860473 | 1415422307 | 1.159 m | Illustrative 5 m width; narrow surface |
| 475906384 | 1415424316 | 2.349 m | Illustrative width; narrow surface |
| 558733005 | 1523024637 | 2.234 m | Illustrative width; narrow surface |
| 558733011 | 1415424318 | 2.262 m | Illustrative width; narrow surface |
| 559324416 | 1415422313 | 0.929 m | Illustrative width; narrow surface |

These are projected geometric distances, not survey accuracy. The projection/axis roundtrip is unchanged; roof/extrusion placement uses the original footprint. Exact segment/edge intersections and interior checks distinguish source conflicts from width-only conflicts. Four-metre **linear display intervals on the original centre lines** have widths bounded by their exact minimum building clearance minus 5 cm; intersecting intervals are suppressed. Round joins use the same safe capsule bounds. Original road/footprint records remain selectable in Map Information, including the dashed conflicting centre line in the comparison. The 243 selected footprints contain no duplicate vertex sets, open rings or proper self-crossings. Buildings are never moved, rotated, resized or deleted. Movement uses the same visible surface capsules with 40 cm body clearance, plus the unchanged building collisions and restrictions.

## Evidence and checks

- [Male front](evidence/phase81-male-front.png), [face](evidence/phase81-male-face.png), [¾](evidence/phase81-male-quarter.png), [side](evidence/phase81-male-side.png), [normal gameplay](evidence/phase81-male-gameplay.png).
- [Female front](evidence/phase81-female-front.png), [face](evidence/phase81-female-face.png), [¾](evidence/phase81-female-quarter.png), [side](evidence/phase81-female-side.png), [desktop junction gameplay](evidence/phase81-desktop.png).
- All eight: [low fade](evidence/phase81-hair-low-fade.png), [buzz](evidence/phase81-hair-buzz-cut.png), [short afro](evidence/phase81-hair-short-afro.png), [curly afro](evidence/phase81-hair-curly-afro.png), [cornrows](evidence/phase81-hair-cornrows.png), [box braids](evidence/phase81-hair-box-braids.png), [locs](evidence/phase81-hair-locs.png), [bun](evidence/phase81-hair-bun.png).
- [Network bends/junctions](evidence/phase81-network-overview.png), [width overlap comparison](evidence/phase81-width-overlap-before-after.png), [source intersection comparison](evidence/phase81-source-overlap-before-after.png).
- [Mobile gameplay](evidence/phase81-mobile.png), [mobile editor](evidence/phase81-mobile-editor.png), [mobile save controls](evidence/phase81-mobile-editor-controls.png), [recorded browser turn](evidence/phase81-turntable.html). Download and open the standalone HTML turn player locally. It contains 16 unmodified compositor captures, with playback controls; timing is illustrative. Headless WebM output was rejected after visual review found black frames despite a decodable container. Mobile is Chromium viewport/touch emulation, not a physical-phone benchmark.

Reproduce focused checks:

```powershell
node --test src/wukari/*.test.ts scripts/typecheck.test.ts
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p scripts/wukari/tsconfig.json
npm run wukari:build
# With the application running:
node scripts/wukari/quality-browser.ts
```

The geographic/avatar subset covers preset validation, legacy persistence migration, native silhouettes/rigs, all eight hairstyles against both eye/brow rays in front/¾ views, gait continuity, owned disposal, exact source positions, true connectivity, three-arm walking, source/width conflict detection, every rendered capsule's clearance from all 243 buildings, asset hashes and unchanged FUW bytes. Browser QA checks actual preset/hair switching, save/reload, face zoom, animation capture, normal camera gameplay, camera/movement, junction direction changes, map pause, review UI, FUW refusal, touch release, settings and preview disposal. Structured results: [phase81-browser.json](evidence/phase81-browser.json).

**Full-project TypeScript is not certified clean.** Previous unrelated engine `fetch` context, Worker `TextDecoder` options and `.test.mjs` ownership findings, plus incomplete memory-limited full runs, remain documented in [phase7-types.json](evidence/phase7-types.json). This milestone does not alter compiler baselines or suppress errors. The focused strict check and Wukari production build are separate evidence. The existing Vite chunk-size advisory is retained.

Final validation: **63/63 tests passed**, focused strict TypeScript passed, production build passed, and all **15 browser acceptance groups passed** with no captured errors. The final test-fixture typing correction was additionally rechecked with 5/5 avatar tests. Screenshot review confirms visible eyes and genuine junction geometry; garment shoulder/collar edges remain simple and angular. Owner visual approval is outstanding.

Performance limit: this headless software-rendered Chromium run measured approximately **3-4 FPS** while moving (16 draw calls, 77,082 triangles), so smooth hardware-browser performance is **not established**. Test on the owner's GPU and a physical phone before accepting performance. The captured-frame turntable is a visual review artifact, not a frame-rate recording.
