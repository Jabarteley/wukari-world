Current correction: [owned cornea regression fixed, with dense sweep and before/after proof](../../../../docs/agent-plans/cloud-lanes/human-skin-eyes-art/CORNEA-CORRECTION.md). The original 23-case gate now passes; inherited master defects remain.

# Skin and eyes on the pinned human — material fit study

[Current before/after close-ups](cornea-fix/proof/before-after.jpg) · [Pre-correction GLTF study](proof/fitted-gltf-proof.jpg) · [Blender portraits](proof/fitted-portraits.jpg) · [editable source](artifacts/fitted-human-skin-eyes-v1.blend) · [GLB with three material variants](artifacts/fitted-human-skin-eyes-v1.glb) · [fit failure](receipts/morph-fit.json) · [continuation](../../../../docs/agent-plans/cloud-lanes/human-skin-eyes-art/FITTED-CONTINUE.md)

**Provisional material derivative, not accepted animated eye fit or a finished realistic human.** Exact input is human producer commit `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`. The master and original calibration assets remain unchanged. Existing hair, anatomy, clothes and identity/expression design belong to the human producer; this lane adds original procedural material bakes, appearance variants and two thin corneal surfaces only.

## Frozen inputs and preservation

`pin_master.py` reads exact Git blobs into ignored `inputs/` and verifies the source Blender and GLB against `fit-frame.json` and `geometry-checks.json`. The frame itself hashes to `51fae932279d1513e16c4d06ce633f6218a994fe6c224bc3436e105cc519083b`. `input-pins.json` preserves all byte/hash/source paths. No moving branch is consumed.

Saved-source checks preserve all **31 original meshes' positions, ordered triangles, original `Prototype_UV_v1` and every morph delta**. `capture_witness.py` confirms preservation on the final packed `.blend`. The new caps have their own `Fitted_Cornea_UV_v1` and matching `body.height` key. `verify_export.py` independently decodes both actual GLBs and confirms every original triangle position and all corresponding POSITION morph payloads are byte-exact after expanding their respective index buffers. It does not assume shared exported vertex indices.

No master mesh rebuild, remesh, UV edit, expression repair or skeleton addition occurred. Import reads the actual saved master. All derivative files stay in this lane. Metres, Blender X character-left / Z up / -Y front convert to GLB X character-left / Y up / +Z front. Master nodes retain identity transforms. The caps use the supplied eye centers at Blender `[±0.032,-0.036,1.635]`, conform to the actual 36 × 28 × 28 mm eye envelope, and extend about 0.25 mm anterior to its existing iris center. They are thin optical approximations with no volumetric corneal thickness or tear film.

## Materials and editing

The original calibration's authored textures are sampled in object-space triplanar fields and analytically rasterized into the exact prototype UVs. Skin pigment contrast is reduced to 45%; cheek warmth and lower central-face roughness are artistic choices. Micro-normal fields are a tangent-space approximation, not measured physical pores or a Cycles ray-bake. All three appearances share the same procedural detail field; they are not distinct scanned people or ethnicity classifications.

Head maps: **256 × 256**. Other exposed skin/lip maps: **64 × 64**. Iris/sclera: **256 × 256**. This is a bounded texture draft for fit and portability review, not production-resolution portrait texturing. The original calibration's 512-pixel maps remain preserved. Source files and maps are local, packed into the `.blend` and reproducible from `build_fitted.py`; its source is also embedded as a Blender Text block.

In Blender, each skin/lip object has named material options `Fitted_01_umber_<object>`, `Fitted_02_copper_<object>` and `Fitted_03_rose_<object>`. Assign the matching material to change its appearance; color/normal/roughness image nodes remain editable. The packed file defaults to copper.

The GLB carries `KHR_materials_variants` for 12 skin/lip bindings, with three named appearances. `merge_variants.py` keeps the copper geometry/morph buffer intact and merges material/image payloads from the other looks; no geometry is duplicated. A viewer without material-variant support displays copper. `viewer.html` explicitly resolves variant material mappings using raw GLTFLoader and applies each exported shape target, including `corrective.height.CHANNEL = body.height × expression.CHANNEL`.

Base colors are sRGB; roughness and normals are Non-Color/linear data. Normal green is +Y; normal strength is 0.35. Roughness is packed in G. `verify_export.py` confirms exact decoded color/normal pixels and roughness G values for all 36 skin/lip materials. Alpha is OPAQUE on every material, with opaque image pixels; corneal transmission is optical (`KHR_materials_transmission`, IOR 1.376 through `KHR_materials_ior`), not alpha blending. Core PBR omits Blender subsurface scattering; the prior calibration shader-loss proof still applies. No game static importer or skinned runtime route is modified or verified.

## Actual measurements and costs

| Measurement | Value |
| --- | ---: |
| Packed editable `.blend` | 1,659,819 bytes |
| GLB with all variants | 2,125,024 bytes |
| Original + added triangles | 29,186 + 1,200 = **30,386** |
| Original + added meshes | 31 + 2 = **33** |
| Blender source vertices including caps | 15,814 |
| Decoded GLB vertices including UV/tangent splits | 17,352 |
| POSITION morph targets, summed across meshes | 111 |
| Skeleton joints / animation clips | 0 / 0 |
| Material definitions including all three variants | 50 |
| Texture records / unique embedded images | 64 / 64 |
| Embedded PNG bytes | 634,338 |
| Separate generated source PNG bytes | 588,502 |
| Estimated RGBA8 base-level texture bytes, all variants | 3,260,416 |
| Observed renderer calls, portrait / full-body views | 52 / 68 |
| Observed submitted triangles, portrait / full-body views | 43,360 / 60,772 |

The texture estimate excludes mip levels, driver overhead, transmission buffers and framebuffer memory; it is not measured GPU allocation. Draw counts include optical transmission passes; the full-body proof includes a grid. These software WebGL counters are not phone/device timing. The 30,386 asset triangles fit the producer's 34,000 high-detail preview cap, not medium/crowd budgets or scene-level admission. Neutral GLB bounds are `[-0.3313110,0.0100000,-0.1195804]` to `[0.3313666,1.7580000,0.1390000]` metres. Geometry dimensions are authored, not surveyed anatomy.

## Original fit failure and visual limits (before correction)

`check_fit.py` samples **23 cases**: neutral; both endpoints of all six implemented identity controls; all six together at each extreme; happy/sad/full blink; height extremes with blink; half blink; left-only and right-only blink. This is a new derivative fit test, not a rerun of the producer's 112 deformation checks. The remaining 32 contract identity controls remain unimplemented.

Before the correction at the link above, the caps added **34 triangle intersection pairs at half blink**, 18 left upper lid and 16 right upper lid. Other sampled cases add zero cap/lid/head triangle crossings, including neutral, full blink and all identity endpoints. The unmodified original eye/lid geometry already has **1,336 triangle intersection pairs summed across the cases**, including **58 at neutral**. Counts are triangle pairs, not independent physical contact regions; some inherited contacts may be hidden near the socket. No untested master-surface collisions are certified.

The archived `cornea-fix/receipts/before-half-blink-witness.json` records the original crossing triangles. The current `capture_witness.py` now records zero added crossings; the old GLTF study image retains its historical red witness. The new before/after close-ups show the actual correction. The smallest sampled vertex-to-surface cap/lid distance is approximately **2.4 µm**, in the failed pose. It is not a positive global clearance certificate. BVH triangle intersections, not that distance, establish the crossing. Linear interpolation between the master's lid endpoints is a likely contributor; the producer owns any trajectory correction. This lane does not change those expression targets.

Fixed-UV triangle surface area ratios over the sampled skin cases range from approximately **0.0368 to 4.0036**, with the largest compression/stretch on the blinking lid. Non-blink cases range from approximately **0.2768 to 2.0695**. These ratios describe geometric area change per unchanged UV triangle, not a full texture-distortion or injectivity proof.

The inherited unwrap has overlaps. The raster receipt counts pixel coverage, including some shared-edge raster ambiguity; representative multiply covered fractions include roughly 20% of the iris fan's covered pixels, 27–29% of covered ear pixels, and 15% of lower-lid pixels at this resolution. One UV texel cannot carry two different surface colors, so detail may be smeared or displaced there. No production-atlas claim is made.

Both final contact sheets were opened and visually inspected. The three appearances, lighting changes, height/proportion changes, closed lids and half-blink witness are visible. The full-body framing was widened after the first browser pass hid the taller head beneath its label. The portrait still has conspicuous pigment mottling, bright eye-edge bands, visible lid/face seams and cap-like inherited hair. Iris detail is limited by the prototype UV fan. Cycles has residual transmission noise; the browser proves the exported materials without that noise. These are material/fit studies on a stylized prototype, not photorealism acceptance.

Validator result: **0 errors, 2 warnings**, plus 32 informational notices. Both warnings are generated tangent space on the head and neck: the original n-gon caps prevent Blender's direct tangent export, so GLTFLoader derives a basis at runtime. Other renderers may differ. Source topology was preserved rather than silently altering it to remove this warning. POSITION morphs are preserved; there are no exported morph-normal targets. Lighting may remain imperfect during large deformations. Browser proof completed with no page errors or failed requests and disposed/closed its owned resources.

## Bounded reproduction and continuation

Use the existing repository slot runner with heavy=1, Node heap 256 MiB, Blender 2 threads. Commands run from repository root. Existing lane-local Three and glTF Validator dependencies are reused; no new package installation is needed if the calibration proof is available.

```sh
python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/pin_master.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 40s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/inspect_input.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 240s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/build_fitted.py
python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/merge_variants.py
python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/make_sheet.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/check_fit.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 40s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/capture_witness.py
python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/verify_export.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s node experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/validate.ts
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- node scripts/agent-slot.ts server --wait-ms 1000 -- node scripts/agent-slot.ts browser --wait-ms 1000 -- timeout 90s python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/browser_proof.py
```

The unmodified `check_fit.py` previously exited **2** for the original half-blink regression. The corneal geometry has now changed, and the same test exits **0**. Its complete before failure receipt remains in `cornea-fix/receipts/before-morph-fit.json`; the new dense sweep verifies the transition between the original test samples. Exit 75 from the wrapper means defer a busy slot. No original full suite or unchanged producer checks were rerun. All original calibration files remain at their prior bytes.

Parent should relay the half-blink witness and provisional UV overlap findings to the human master owner. Consume only a new exact checkpoint for any revised eyelids/UVs; make a new derivative version and preserve this one. Do not authorize production/animation on the basis of a still portrait. No skeleton, weights, locomotion, wearable animation, collision admission or current-game integration is established.

Original material scripts/textures and cap geometry are authored for this repository under AGPL-3.0-or-later. The original human geometry is attributed to the pinned human-design-contract producer under the repository license. No external art, photographs, scanned individuals, paid tools or new workers. Existing Three/validator/Pillow/NumPy/Blender/DejaVu proof tooling has the same development-only notices as the calibration packet; no fonts or third-party artwork are vendored.
