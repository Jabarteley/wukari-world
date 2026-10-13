# Anatomy v4: finite correction complete, parent review pending

This is a separate review candidate on `codex/cloud-human-design-contract-20261013`, not replacement of frozen master `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`. It closes the scoped eye/head/lid geometry defects from the combined review within the documented tests. Parent owns adoption, integration, skin/cornea refitting and any further launches. No workers or heavy jobs remain running.

## Exact inputs and outputs

- Repository baseline: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`; original ownership/coordinator inputs remain in the lane-level continuation.
- Combined review: `7d01f9979aea8d0d74b6110d6de662c69a7c4a40`, directory `docs/agent-plans/cloud-lanes/integration-contract/combined-review-v1/`. Three exact input document hashes are in [input-pins.json](input-pins.json); the three incoming lid-normal flags are retained in [incoming-lid-flags.json](incoming-lid-flags.json).
- Original geometry input: the exact frozen master BLEND, SHA-256 `36018022ff64367e7426069d7417625a3591f3a2c0684c628c11c3bd908f84d9`. The v3 comparison input remains `b62b7fb6d10e9c80e0d127d535d97a86d0b29f49`; its final receipt is `7a8928797aea919ae92d41fe4cc15f1c2ad74da1`. Neither is overwritten.
- The actual early v4 checkpoint was pushed as `705d3954bde439411a7434bcb09bb1b45840524b`. It had a new socket-bridge UV defect and is superseded by the final candidate containing this document. Obtain the immutable final commit SHA from the task response and verify remote equality before adopting any bytes.
- New editable BLEND: `experiments/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/anatomy-candidate-v4.blend`, SHA-256 `fb6f488c55b01083fc23803a79e677ae957ecc237004de62a78bd8804ee76302`.
- New GLB in the same directory: `anatomy-candidate-v4.glb`, SHA-256 `2338c0b3b4d34d3549e2a2d30c91b4ddf65dc2111c9b6f13450a2dd8dad3477d`.
- Versioned fitting interface: `fit-frame-candidate-v4.json` beside the assets; frame ID `original-human-anatomy-frame@4`, schema version 3. Original contract schemas, fixtures and migrations remain unchanged.
- [Actual neutral/half/full comparison](Allworld-anatomy-v4-neutral-half-full-review.png): v3 above, v4 below, matching camera/lighting, original placeholder materials. Separate final `neutral.png`, `half-blink.png`, `full-blink.png` are also present. Library copy: `libfile_4259a9be0c0081918f0c0f919308142a`, version 0, file `file_00000000132481f6bd4feac98e5df03b`; confirmed in [library-receipt.json](library-receipt.json).

## What changed and the compatibility boundary

The candidate has **29,538 triangles / 27 mesh nodes**, 2,944 fewer triangles and four fewer nodes than v3. Eyeballs are 24 mm spheres around the exact original eye centres. The iris surfaces now conform to those smaller globes, with three radial rings; pupil positions follow the same sphere. Only 62 original head vertices move, exclusively in local orbital Y, at most 8.927 mm. New lids connect directly to the original head-opening edges as part of `Head_continuous_anatomy`. The annular bridge uses planar tessellation with collinear boundary splitting, avoiding the prior twisted zipper triangles. No material feature was added.

Changed nodes are Head, Eye_Left/Right, Iris_Left/Right and Pupil_Left/Right. The four separate UpperLid/LowerLid nodes are removed. **Node-specific lid bindings must migrate to Head.** Existing morph target names remain: blink targets, height-expression product correctives, and blink-arc correctives now animate the connected Head lids. A glTF consumer must continue calculating:

```
corrective.height.CHANNEL = body.height * expression.CHANNEL
corrective.blinkArcLeft/Right = 4 * blinkLeft/Right * (1 - blinkLeft/Right)
```

All **20 unaffected meshes** preserve their exact positions, topology, UVs and morph positions in the source and decoded export. Original Head face UVs are retained exactly, while new connected lids fill the original eye-hole chart. Iris topology and iris/pupil UVs change; eye sphere positions change. Scalp, temples, nose bridge, ears, body and all shared construction anchors remain fixed. Blender axes remain metres, +X character-left, +Z up, front -Y; glTF mapping remains `[x,y,z] -> [x,z,-y]`. Eye centres remain left `[0.032,-0.036,1.635]`, right `[-0.032,-0.036,1.635]`.

Six identity controls remain implemented: nose.projection, nose.alarWidth, earLeft.protrusion, earRight.protrusion, body.height and body.shoulderWidth. The other 32 controls remain unimplemented geometry. Expressions remain supported within the prototype; there is still no skeleton, skin weights, locomotion or independent undressed torso/leg master.

**Skin/cornea rebind is required.** Old corrected caps fitted to larger globes would float anterior to the new eye surfaces; unchanged centre anchors do not imply surface compatibility. Parent should pass the exact new asset hashes and fitting frame to that owner. This lane did not import, edit, validate or re-run that owner's 3,003-case scan. Hair/body/wardrobe inputs and their owners remain untouched.

## Executed finite evidence

[checks.json](checks.json) is PASS with 35 actual dependency-graph evaluations: individual identity endpoints, combined six-control extremes with blink, height × blink combinations, happy/sad and asymmetric blinks. Results:

- Zero proper crossings among all tested eye/iris/pupil/head pairs; neutral Eye/Head crossings reduced from the incoming 69 to **0**. The same audited proper-crossing function uses triangle-plane straddling and intersection-line overlap at 0.25 micrometre tolerance. Mere coincident/tangent contact is not counted as a proper crossing.
- Zero lid normal reversals; minimum new-face area `2.4042716037942096e-7 m²`, minimum normal cosine to neutral `0.36191452608143354`. Maximum actual-versus-expected morph position error `1.4901161193847656e-7 m`.
- No new-head non-adjacent self crossings at neutral, half and full blink. All 96 Head boundary edges are actual eye-aperture edges; no unattached socket seam and no edge incident to more than two triangles.
- New socket UV overlap pairs **0**, new-versus-original **0**, iris/pupil **0**. **2,102 inherited overlap pairs remain among original Head faces**, with inherited degenerate cap UVs; the original UVs are not a production atlas. This PASS is for the scoped new geometry, not whole-atlas acceptance.
- Five fixed identity packets have a continuous blink-orientation certificate over `[0,1]`: normal-dot polynomials are evaluated at endpoints and every real stationary point. Minimum positive dot ratio is `0.3371933643888247`, with zero nonpositive faces. This certifies orientation for those packets, not continuous collision freedom or the full identity domain.

[export-compatibility.json](export-compatibility.json) separately decodes the actual GLB, including sparse morph accessors: finite positions/morphs/normals, exact 20 protected meshes and original Head UVs, 29,538 triangles / 27 meshes, zero eye/iris/pupil-versus-head proper crossings and zero lid normal flags at neutral/half/full blink. Actual console results are retained in `checks-output.txt` and `export-output.txt`.

Initial failures remain reviewable: `first-neutral-iris-defect.png` and first build receipt record an iris draft that visibly intersected the smaller globe. `checks-before-bridge-fix.json` / `checks-before-uv-fix.json` record 20 added bridge UV overlaps, subsequently fixed. These are historical failures, not current candidate results. No broad game suites or redundant original-master/other-owner checks were run.

## Reproduce, one bounded command at a time

From repository root, use Blender 4.3.2 and the existing heavy-slot runner. Builder imports the untouched original mathematical source. The builder's receipt says validation pending because build and validation are separate operations; the later checks and export receipts are authoritative.

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/build_anatomy_v4.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/check_anatomy_v4.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/verify_anatomy_v4_export.py
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 12s bash experiments/cloud-lanes/human-design-contract/prototype/assemble_anatomy_v4_proof.sh
```

Append `-- --no-render` to the builder to omit images. Renders use Cycles CPU, four threads, 24 samples, 600×720, no unavailable OIDN. Export is uncompressed; missing optional Draco is nonfatal. Proof assembly uses actual renders and captions only. Fresh builds can differ in container metadata; use the pinned committed asset bytes for receiving lanes. No packages, credentials, permissions, paid services, budget caps or shared runtime files changed.

## Remaining blockers and parent-owned next step

The comparison visibly reduces the raised closed lids. Orbital creases and facial proportions remain coarse/stylized; this is **not final realistic-character acceptance**. Human anatomy/art review is still needed. Production UV cleanup, rig/deformation, remaining controls and device/runtime acceptance remain outside this correction.

[budget-comparison.json](budget-comparison.json) uses the pinned combined-review formula: candidate − 2,518 placeholder hair + 1,200 cornea triangles + chosen hair + 2,324 wardrobe. Conditional totals are 37,118 detailed crop, 36,310 detailed bun, **30,902 crop silhouette**, **31,046 bun silhouette** against 34,000. Detailed hair still fails; silhouette margins are 3,098 / 2,954. This is arithmetic, not a rebuilt combined scene; refitted corneas may change costs. No new draw-call, optical-pass or physical-device claim is made.

Parent should review this frozen image/geometry, then explicitly select a new shared input if desired, coordinate skin/cap rebind and any node-specific lid migration, and run one bounded combined review. Do not silently replace the frozen master or the existing character task. No further launch is delegated here.
