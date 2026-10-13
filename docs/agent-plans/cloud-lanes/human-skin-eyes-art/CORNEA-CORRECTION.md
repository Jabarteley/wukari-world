# Owned corneal regression corrected

Parent requested correction of the 34 new half-blink cap/lid triangle intersections without changing the exact human master or hiding the failing test. The two owned corneal caps now use a **0.25 mm dome instead of 0.45 mm**, a smooth posterior displacement of at most **0.20 mm**. Their existing radius, vertex/triangle counts, UVs, height morphs, materials, alpha and visibility are unchanged. No new deformation rule, deleted face, reduced aperture or appearance option was added.

The original 23-case `check_fit.py` source is unchanged from `f504d2f450a95d5f411abca6f63b9401f1401fc5`; its previously failing gate now passes with **zero new cap/lid/head intersections**. Exact master remains `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`. All 31 original meshes, original UVs and every morph delta remain exact. Existing calibration assets are untouched.

## Evidence

- [Inspected neutral / half-blink / full-blink before-and-after close-ups](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/proof/before-after.jpg), rendered with the actual old/new GLBs, identical camera/lights and unmodified copper material. Both caps are still present and opaque-alpha; no display workaround is used.
- [Dense sweep](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/receipts/dense-blink.json): **1,001 blink amounts**, step **0.001**, at height **−1, 0, +1**, both eyes and both lids. **3,003 paired-eye poses / 12,012 cornea–lid tests per revision**, all triangles considered. Left/right blink independence was checked from the actual key sets.
- Before: failures from blink **0.479 through 0.839** at every sampled height; **81,063 intersecting triangle pairs summed across samples**, including the original 34 at half blink. After: **zero** added cap/lid crossings throughout the sweep. Eye, iris, pupil and head checks at all three heights also return **zero** cap intersections.
- Smallest sampled corrected cap/lid distance: **76.8 µm**; cap/iris sample: **10.7 µm**. Largest lid-vertex movement per blink step: **6.78 µm**. These are vertex-to-triangle samples, not exact global minima or a continuous-motion certificate. The dense per-sample arrays are retained in [dense-samples.npz](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/receipts/dense-samples.npz), with hash and axis definitions in the JSON receipt.
- [Candidate screen](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/receipts/candidate-scan.json) records why the cap was not flattened farther: 0.10/0.05 mm candidates introduced iris/pupil crossings. The chosen 0.25 mm dome was verified against those inner surfaces, not merely the lids.
- [GLB patch proof](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/receipts/glb-patch.json): only six existing buffer spans changed—POSITION/NORMAL/TANGENT for each cap—plus matching bounds and revision metadata. **All other binary bytes remain exact**, including master geometry/morphs, cap indices/UV/height deltas and all image payloads. Material and variant JSON remain unchanged.
- [Final source preservation](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/receipts/final-source-preservation.json), [decoded export](../../../../experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/receipts/decoded-fitted-glb.json), original 23-case gate and raw browser proof all pass. glTF Validator remains **0 errors / 2 pre-existing tangent-space warnings / 32 informational notices**.

The old fit report, contact witness, source/export receipts and exact before artifact hashes are retained under `fitted-v1/cornea-fix/receipts/before-*`. Before GLB/Blender bytes are fetched from immutable commit `f504d2f450a95d5f411abca6f63b9401f1401fc5` into ignored `cornea-fix/inputs/`; they are not duplicated in Git. Original source and old rendered evidence remain available at that commit.

## Scope and remaining master limitations

This closes the **owned cornea regression**. It does not close all human eye fit. The unchanged master eye/lid surfaces still report **177,800 triangle pairs summed across the dense sweep**; the unchanged original 23-case baseline remains **1,336**. These are repeated triangle-pair counts, not numbers of distinct defects. Visible lid/face seams, eye-corner specks and full-blink angular shading remain in both before/after images. Master UV overlaps, tangent-space warnings, absent morph normals and lack of a skeleton also remain. No continuous collision, anatomical realism, wearable animation or production admission is claimed.

Costs are unchanged: **30,386 triangles / 33 meshes / 17,352 decoded vertices / 111 summed morph targets / 50 material definitions / 64 images**. Corrected GLB: **2,125,024 bytes**; packed Blender source: **1,659,819 bytes**. The GLB's additional 96 bytes are JSON revision/bounds changes; the geometry buffers keep their prior lengths. The 12,012-pair sweep took approximately **12.2 seconds** in the available cloud environment, not a runtime or physical-device benchmark.

## Reproduce or continue

Run from repository root with the existing heavy=1 guard and 256 MiB Node heap. The before artifacts must be the exact hashes in `before-pins.json`; `apply_correction.py` always reads those frozen inputs. It writes only owned cap geometry and the owned derivative. `patch_glb.py` uses Blender's selected-cap export to update only the original cap spans. No master rebuilding or material rebaking is necessary.

```sh
python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/pin_before.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 45s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/apply_correction.py
python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/patch_glb.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 120s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/dense_blink.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/check_fit.py
NODE_OPTIONS=--max-old-space-size=256 node scripts/agent-slot.ts heavy --wait-ms 1000 -- node scripts/agent-slot.ts server --wait-ms 1000 -- node scripts/agent-slot.ts browser --wait-ms 1000 -- timeout 90s python3 experiments/cloud-lanes/human-skin-eyes-art/fitted-v1/cornea-fix/browser_proof.py
```

The existing full material builder also has the corrected dome constants for fresh regeneration. `merge_variants.py` refuses stale pre-correction temporary exports. No new package, appearance, worker, global setting, master edit, shared runtime change, merge or deployment. Browser/server resources were disposed and closed; heavy/server/browser slots were released. Parent can review the corrected owned caps now while separately tracking the inherited master defects.

User-facing before/after Library image: `libfile_451c2c6a65e88191a7b35ef0f3e94988`, version 0, file `file_000000003634820b93de1136aab343b0` (**Allworld-cornea-correction-before-after-prototype.jpg**). Prior Library images remain preserved as earlier studies.
