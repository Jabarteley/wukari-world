# Actual master fitting handoff — 3ee5882

The parent supplied the exact human master during this task after the calibration checkpoints were pushed. The new **lane-owned, unrigged fitting derivative** consumes `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`; it does not overwrite the master or the original detailed/calibration hair sources.

Open [master-fitted-hair-editable.blend](../../../../experiments/cloud-lanes/human-hair-art/artifacts/master-fit-v1/master-fitted-hair-editable.blend). This self-contained 1,293,569-byte source includes the frozen body's copied geometry, UVs and controls, both fitted hairstyles and both fitted silhouettes. The original master placeholder is hidden only in this derivative. Crop is visible by default; hide its `FIT curl-crop / ...` objects and unhide the other desired `FIT ...` group for viewport/render. Never show all four alternatives simultaneously.

Actual rendered GLBs, visually inspected:

- [Crop: front, three-quarter, temple/ear, nape and morph extremes](../../../../experiments/cloud-lanes/human-hair-art/artifacts/master-fit-v1/curl-views/contact-sheet.png).
- [Swept bun: same six views and extremes](../../../../experiments/cloud-lanes/human-hair-art/artifacts/master-fit-v1/bun-views/contact-sheet.png).
- [Full-body height/shoulder/ear/nose endpoints and fitted LOD comparison](../../../../experiments/cloud-lanes/human-hair-art/artifacts/master-fit-v1/body-lod-views/contact-sheet.png).

## Pin and verification

`inputs/master-3ee5882.json` records exact Git file paths, bytes and SHA-256 for source `.blend`, GLB, fit frame, geometry report and inspection source. Source `.blend` hash `36018022ff64367e7426069d7417625a3591f3a2c0684c628c11c3bd908f84d9`; GLB hash `5f0f8da1f3e6b14fc4910f04f02ed1eafe6446f896f44ef2b3a23f2ca071bc07`; fit-frame hash `51fae932279d1513e16c4d06ce633f6218a994fe6c224bc3436e105cc519083b`. Actual saved positions, ordered triangles and UV arrays for all **31 master meshes** were independently compared to the producer's hashes before fitting. Original source files retain their hashes afterward.

The integration base remains `caaee5e1b91afc7f3cd3f2124df3547dc7f492ec`; old contract `71d6b5ad391754b0f30fc5364e993208299640ed` remains pinned independently. The received master is a new explicit input, not a moving-branch assumption.

## What changed and measured costs

Original high-detail styles remain in C01/S02 calibration folders. The fitting crop retains **96 complete geometric curl bundles** selected from the original reduced crop; the fitted bun uses the original reduced swept/bun geometry. Actual head triangle projection replaces the temporary ellipsoid. Each vertex receives a 3.2 mm surface margin plus preserved authored hair depth. Actual head morph deltas transfer barycentrically; height uses the producer's exact `dz=(z−0.010)*0.05` rule, including offset height. No acquired texture, alpha cards or unbounded strands.

| Fitted derivative | Hair triangles | Raw GLB bytes | Character total after placeholder replacement |
| --- | ---: | ---: | ---: |
| Curl crop | 6,574 | 189,416 | 33,242 |
| Swept bun | 5,766 | 213,100 | 32,434 |
| Curl silhouette | 358 | 13,856 | 27,026 |
| Bun silhouette | 502 | 18,984 | 27,170 |

The producer has 29,186 triangles including a 2,518-triangle placeholder; totals use **26,668 remaining body triangles + one hair option**. Both fitting hairstyles are below the unchanged 34k high-preview triangle maximum. This is not draw-call, medium/crowd, full-scene, in-game or phone acceptance. Near fitting derivatives still use 4/10 hair primitives and four materials respectively; silhouettes use 1/2 primitives and one material. All textures/texture bytes=0, skeletons/skins/animations=0. Real POSITION morph targets are exported and counted per mesh in `decoded-validation.json`. `export-metrics.json` records decoded float32 positions, bounds, bytes and hashes.

## Actual fit checks

[fit-checks.json](../../../../experiments/cloud-lanes/human-hair-art/artifacts/master-fit-v1/fit-checks.json) contains **112 cases per variant, 448 variant/case checks**:

- neutral;
- signed endpoints for all six implemented identity controls;
- every pair of identity endpoints;
- happy/sad/blink and expression × identity endpoints.

The six controls are nose projection/alar width, independent left/right ear protrusion, body height and shoulder width. The other 32 identity controls remain unimplemented by the master and are not claimed tested. Expressions apply the producer's height product correctives; raw GLTFLoader preview explicitly calculates them. Blender drivers preserve available transferred correctives in the saved derivative.

All hair vertices were checked for signed nearest-body clearance. All remaining master body meshes, including both ears, were included, with only triangles wholly below every hair bound spatially excluded. BVH candidate pairs are followed by finite edge/triangle intersection checks; **all cases had zero BVH candidates**, zero confirmed body intersections and zero hair vertices inside by more than 0.2 mm. Worst sampled minimum clearance:

| Variant | Minimum | Worst case |
| --- | ---: | --- |
| Crop | 3.046 mm | body.height = −1 |
| Bun | 3.193 mm | body.height = −1 |
| Crop silhouette | 3.405 mm | body.height = −1 |
| Bun silhouette | 6.762 mm | body.height = −1 |

This fixes the previously recorded temporary-fixture cap/bun penetrations **for these actual-master fitting derivatives**. It does not retroactively certify calibration originals. This is sampled static surface fit, not a proof over continuous controls, self-intersections within hair, physical simulation or skeletal poses. Master has no skeleton; poses tested=0 and rig hash=null.

`fit-proposal.json` pins the real master position/ordered-topology/UV hashes, named scalp triangle+barycentric anchors and body-relative identity matrix. Geometry already occupies body metres (Blender Z-up/−Y-front; glTF Y-up/+Z-front). Joint is null until the actual producer supplies a rig. Do not falsely identify this topology as `allworld-body-23@1` or import a fitted morph attachment through the static ModelPart route.

## Evidence and remaining art work

Four fitted GLBs pass Khronos with zero errors/warnings. Saved fitted `.blend` re-export produces **exact final canonical bytes** for all four, including morph targets. The first byte comparison exposed two scene extras set after initial export; the canonical exports now come from saved source and the recipe sets those extras earlier. Every other JSON field and BIN geometry/morph byte was identical; `receipts/fitted-saved-source-check.json` records the initial/final hashes and exact difference. Screenshots were rendered before this metadata-only normalization, with identical geometry/material/morph bytes. No render was repeated for unchanged pixels.

All three new contact sheets were opened and inspected. Actual head/ears remain visible; short/wide and tall/narrow bodies use the same camera for honest endpoint comparison. Reduced crop is visibly sparse/rod-like at portrait distance; bun loses the original fine grooves and shows coarse bands. These are useful fitted geometry prototypes, not realistic-hair acceptance. Improve fine original texture/normal detail or redistribute geometry in a reviewed allocation before portrait-quality acceptance. The producer's facial/eye/body quality is unchanged and remains owned by that producer.

## Reproduce / continue

From repository root, fetch only if the immutable object is absent, then materialize verified read-only inputs into ignored lane scratch:

```sh
git fetch origin 3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a
python3 experiments/cloud-lanes/human-hair-art/materialize_master.py
python3 experiments/cloud-lanes/human-hair-art/verify_inputs.py
python3 experiments/cloud-lanes/human-hair-art/seal_packet.py --check
```

Actual bounded commands are preserved in `receipts/fit-master-v1.json`, `fit-checks-v1.json`, `render-fit-*.json` and `reexport-master-fit.json`. Build into a **fresh** owned directory with `fit_master.py -- --out ...`, never over frozen artifacts. Check saved source with `fit_checks.py -- --out <its folder>`. Both require shared heavy=1, `bounded_run.py` <=120s, Blender threads=2; browser additionally requires server/browser slots. No full suite or game build needed for these changed assets.

For manual Blender controls, set each named shape-key value consistently across body and visible `FIT` meshes, then update the scene; keep unspecified keys zero. A continuation helper may provide scene-level sliders inside this owned derivative, but must not change the master's control semantics. In GLTFLoader set matching `morphTargetInfluences`, then every `corrective.height.X = body.height * expression.X`, as the included previews do. Future skeletal binding waits for the producer's exact rig checkpoint.

Environment-disconnect notification was reconciled once at `2026-10-13T19:09:18Z`: live command succeeded, all three slots free, checkpoint and master bytes present. Nothing was lost and no active render was restarted.
