# V5 UV-only correction: complete

The already-saved v5 portrait comparison is **`libfile_eaf2a90ff35c819192aaac774c56d0ce`**, version0, file `file_00000000a1d881f69c366a6b6fb6e4f7`. Its confirmed receipt remains in the protected v5 directory. No rerender, duplicate Library save, visual acceptance or skin refitting occurred.

Input checkpoint: **`c54141c1eb809f1c529e5808e46d228f3451e20f`** on `codex/cloud-human-design-contract-20261013`. Both original v5 assets, portraits, failed evidence, fitting frame and original checker remain byte-for-byte untouched. This correction is a separate `anatomy-candidate-v5-uv1/` derivative within the same two owned prefixes. Final immutable remote SHA is in the task response.

## Exact tiny change

All seven new overlaps came from Head triangles9860/9861, where the interpolated UV for new vertex5074 crossed the continuation of boundary edge1851→1915. [overlap-diagnostic.json](overlap-diagnostic.json) lists all seven pairs, indices and coordinates using the original intersection method.

Only the **U coordinate of vertex5074 at seven UV corners** changed:

```
U: 0.41507062315940857 -> 0.41523799300193787
V: 0.4725876450538635  -> unchanged
delta U: +0.00016736984252929688
loops: 29242, 29244, 29247, 29575, 29579, 29582, 29585
```

The point now lies0.00005 U beyond that edge's continuation on the correct chart side. No UV tile changes, separate materials, tolerance changes or overlap exclusions were introduced. All7,888 retained original Head triangle UVs and every other Head UV corner remain exact. All26 other mesh UVs remain exact.

[correction-receipt.json](correction-receipt.json) contains before/after hashes for **all27 meshes**: positions, ordered triangles, corner normals, all shape-key coordinates/settings, corrective driver expressions/bindings, transforms and material assignments are identical. Actual GLB triangle-expanded positions and every morph position are also exact; all non-Head exported UV hashes are exact. Six identity controls, anchor values, eye dimensions and frame ID remain unchanged. The fitting packet includes the canonical unchanged anchor hash. Triangle count remains30,194, meshes27, and all existing budget arithmetic is unchanged.

## Actual result with the unchanged checker

[checks.json](checks.json): **PASS,35 poses, zero failures**. New/new UV overlaps **3→0**, new/original **4→0**. The **2,102 inherited original/original overlaps remain unchanged**, as the original checker explicitly scopes them out. No whole-atlas or production acceptance is implied.

The checker itself has the same SHA-256 before and after:

`2fb91dccf2488049b3ca2a19d911dd79b21f6dd21d48089131bbcc88240db6ef`

`check_v5_uv_copy.py` copies that byte-identical checker and its unchanged dependencies to an isolated temporary tree, places the corrected BLEND at its expected input path and runs it. Only the two asset SHA fields in the temporary build receipt change; no test logic, tolerances, monkeypatches or skipped assertions change. This preserves the frozen v5 files and historical FAIL result. [unchanged-checker-receipt.json](unchanged-checker-receipt.json) records exact source/dependency hashes, and `checks-output.txt` retains actual console output. The temporary tree is removed on completion.

Geometry metrics remain identical to v5: zero proper eye/head crossings and sampled new-head self crossings, zero normal reversals, exact full-blink closure, minimum triangle area1.1764618796529679e-8 m², minimum normal cosine0.2791510188914226. No broad test suites were rerun.

## Assets and reproduction

Files under `experiments/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v5-uv1/`:

- `anatomy-candidate-v5-uv1.blend`: SHA-256 `33c3f4a8d87ca764fb16004d2f322d45fe46bae247303317d92fa5a188efcbaa`.
- `anatomy-candidate-v5-uv1.glb`: SHA-256 `f0ab94dedf374d8e7e5374f58f2da14d7f21df1076145e581916cdf9083b27de`.
- `fit-frame-candidate-v5-uv1.json`: same geometry frame ID and anchors, UV revision1 and corrected asset hashes.

From repository root, sequentially:

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/inspect_v5_uv.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 45s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/fix_v5_uv.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/check_v5_uv_copy.py
```

All three ran successfully under the existing single heavy slot. Blender4.3.2, no rendering or new dependency/service/credential/permission changes. No usage denial occurred. The original protected BLEND hash is asserted before mutation; the corrected derivative is saved separately. Use committed bytes rather than rebuilding for receiving work.

Parent is reviewing the existing v5 pixels. No face-quality acceptance is claimed, and no skin/cornea fitting is started. Further anatomy, production UV cleanup and fitting remain parent-directed. No additional work or heavy job is left running.
