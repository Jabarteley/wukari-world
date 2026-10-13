# V5 face checkpoint: geometry complete, visual review and UV blocker open

User requested this same character task continue at 22:06 UTC on 2026-10-13. This finite pass replaces the rejected rectangular eye/socket field with curved orbital topology, delivers actual neutral/half/full-blink portraits and exact compatibility evidence. It is a separate original fictional prototype, not a replacement for the existing character task or frozen master. Parent owns face-quality review, integration and further launches.

## Pinned input and execution

- Branch: `codex/cloud-human-design-contract-20261013`; only the two existing human-design-contract prefixes changed.
- Protected input: `2921534bdc8959a8489713f9b1652381702808a5`, v4 BLEND SHA-256 `fb6f488c55b01083fc23803a79e677ae957ecc237004de62a78bd8804ee76302`. Original master `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`, v3 and v4 assets remain unchanged.
- Actual v4 neutral/full portraits were inspected before work. Rejection: narrow squinting eyes, pinched angular sockets, layered-looking closure despite zero crossings.
- Early source checkpoint **`3a97852d41e2d0a2341e1df05c7d6d2a712b2e49`** was published and verified with `git ls-remote`. Its tree equals provisional local `fb31578e`. Shell push returned `fatal: could not read Username for 'https://github.com': No such device or address`; the already-connected, authorized GitHub app successfully published the same branch without credentials or permission changes. Final publication uses that same route. Obtain the final immutable commit SHA from the task response and verify remote equality.
- Local execution worked normally. No usage denial occurred, no account/model switch, no bypass, no new agent and no production/shared runtime change. Blender jobs used one existing heavy slot, 4 CPU threads (2 for export checks), Node heap128 MiB, finite timeouts. No broad game suite or other owner's 3,003-case scan was repeated.

## Review artifact and actual geometry

[Neutral/half/full comparison](Allworld-anatomy-v5-neutral-half-full-review.png) shows protected v4 above and v5 below at the same camera, lighting, 600×720 source resolution and 24 Cycles samples. No material/lighting substitution, image generation or facial-pixel editing was used. Individual final `neutral.png`, `half-blink.png`, `full-blink.png` remain available. Saved Library copy: `libfile_eaf2a90ff35c819192aaac774c56d0ce`, version0, file `file_00000000a1d881f69c366a6b6fb6e4f7`; confirmed in `library-receipt.json`.

Candidate files are under `experiments/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v5/`:

- `anatomy-candidate-v5.blend`: SHA-256 `4152f4deb9acf722b5327a95fbab7201c7f8f1ef87cfafb8b0b3acb19e33e09d`.
- `anatomy-candidate-v5.glb`: SHA-256 `d7d44dd281028fbe42da892866a8b149d343708748587542f14fb8884682c777`.
- `fit-frame-candidate-v5.json`: schema4, `original-human-anatomy-frame@5`, exact axes, anchors, source hashes, geometry/UV changes and corrective semantics.

**30,194 triangles / 27 mesh nodes**, +656 triangles from v4. Entire v4 rectangular lid fields and 208 surrounding original Head triangles are removed. Two continuous annular fields use eight curved rings with 64 samples each, 2,000 new faces including the bridge, and direct connections to the remaining head. The original v4 orbital Y displacements are reverted in 62 original vertices (maximum8.927 mm); all original Head X/Z values and retained morph deltas remain exact. There are no layered eyelid objects.

Actual aperture width is **28.400 mm**, central neutral height **10.400 mm**; v4 was24×7.9 mm. This is +18.3% width / +31.6% central height, not an eyeball-shrink workaround. Half blink measures5.200 mm, full blink has zero paired-edge gap. The upper lid travels7.0 mm at centre, lower3.4 mm, meeting1.6 mm below the eye anchor. The closure curve continues through the canthus columns to avoid a folded corner fan. Diagonals are chosen for deformation quality in the three authored poses; the independent continuous-orientation check verifies intervening blink values for its listed control packets.

Eye centres stay exactly `[±0.032,-0.036,1.635]` metres. Globes become29.6×26×26 mm envelopes, with iris/pupil surfaces reprojected onto them. All six eye-object topologies and UVs are retained from v4. The iris/pupil depth and the globe positions change. Skin appearance remains inherited; no eye-material or cornea-owner work is claimed.

The larger opening and continuous socket field are visible improvements over the rejected grid. The face remains stylized. Inner/outer corner dimples, subtle closed-lid crease and overall facial proportions still need human art review; this is not final realism acceptance. No outfits, countries, hairstyle expansion or full rig were added. Country-aware styling remains in the published brief with free player customization.

## Validation: distinguish geometry from UV acceptance

[checks.json](checks.json) records **35 actual evaluated poses**. Geometry results: zero proper crossings across all tested eye/iris/pupil/head pairs, zero new-head self crossings in neutral/half/full blink, zero sampled normal reversals, minimum new triangle area `1.1764618796529679e-8 m²`, minimum cosine to neutral `0.2791510188914226`, maximum morph evaluation error `1.4901161193847656e-7 m`. All128 boundary edges are actual eye-aperture edges; no unjoined socket seam or edge incident to more than two triangles. Continuous blink orientation for five fixed identity packets has minimum positive dot ratio `0.03315904361268313` and zero nonpositive triangles. This does not certify continuous collisions or every combination of the full control domain.

**The overall checker is intentionally FAIL for UV overlaps:** 3 new/new and4 new/original overlap pairs, plus2,102 inherited overlaps in retained old Head faces. No guard was relaxed. The final candidate retains original outer-seam UVs and provisional polygon-interpolated new UVs. A harmonic interior-chart experiment increased overlaps to36/33 and was reverted; its failure evidence remains `checks-harmonic-uv-experiment.json`. Production skin binding is blocked until the local UV chart is repaired and reviewed. The candidate can be reviewed visually with its unchanged constant materials.

[export-compatibility.json](export-compatibility.json) is **PASS for its separate geometry/export scope**: actual dense+sparse GLB accessors, finite data, exact20 unaffected meshes, exact UVs on all7,888 retained original Head triangles, and neutral/half/full geometry checks with zero normal flags or eye-surface crossings. It confirms all six identity controls, unchanged Head X/Z and exactly preserved retained-head morph deltas. It also compares the saved sources before/after the final UV-only reversion and proves every mesh position, triangle and morph position used in the renders is exact. This export PASS does not override the explicit UV FAIL.

Earlier defects and their evidence are retained: first images show omitted bridge triangles and deep corners; `checks-before-canthus-fix.json` and `checks-before-triangulation-uv-fix.json` capture the actual canthus orientation/self-crossing failures. Explicit adjacency walking and boundary-edge checks replaced the failing polygon-hole bridge. Actual final console output is in `checks-output.txt` and `export-output.txt`.

## Receiving-owner compatibility and budget

Same27 mesh-node names as v4; Head and six Eye/Iris/Pupil nodes changed, **20 unaffected meshes exact** in source and decoded export. Body, clothing, ears, brows, lips, scalp geometry and all shared construction anchors remain intact. Six identity controls and existing expression target names remain. Node-specific lids had already moved onto `Head_continuous_anatomy` in v4; no new node migration is introduced here. Keep the same consumer formulas:

```
corrective.height.CHANNEL = body.height * expression.CHANNEL
corrective.blinkArcLeft/Right = 4 * blinkLeft/Right * (1 - blinkLeft/Right)
```

Axes remain Blender metres, +X character-left, +Z up, front -Y; glTF mapping `[x,y,z] -> [x,z,-y]`. The other32 identity controls, skeleton/weights/locomotion and independent undressed body are still unimplemented. Current contract schemas, fictional presets and save migration remain untouched.

**Cornea/skin rebind is required** because the globe envelope, iris depth and local Head topology/UVs changed. Do not reuse old surface bindings merely because eye-centre anchors are unchanged. Do not edit or substitute another owner's assets.

[budget-comparison.json](budget-comparison.json) uses unchanged pinned add-on counts: candidate −2,518 placeholder hair +1,200 caps +2,324 wardrobe + selected hair. Projected totals: **31,558 crop silhouette /31,702 bun silhouette**, margins2,442 /2,298 under34,000. Detailed crop37,774 / detailed bun36,966 still fail. These are conditional arithmetic totals, not combined-scene, draw-call or device acceptance; cap refit may change costs. No budget cap was raised.

## Exact commands and next step

Run one at a time from repository root. The final focused checker exits2 because the UV failure remains explicit. Existing Blender4.3.2 exports uncompressed GLB; optional missing Draco is nonfatal. No unavailable denoiser is enabled.

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/build_anatomy_v5.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/check_anatomy_v5.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 35s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/verify_anatomy_v5_export.py
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 12s bash experiments/cloud-lanes/human-design-contract/prototype/assemble_anatomy_v5_proof.sh
```

The last build used `-- --no-render` for the UV-only reversion. Prefer committed exact asset bytes for receiving work; metadata on a fresh build may differ. Original master, v3 and v4 are protected independently and must not be rebuilt by receiving lanes.

Parent should review this one neutral/half/full checkpoint before expanding scope, then decide whether to refine corners/closure and repair the local UV chart on this candidate. Any accepted successor needs explicit skin/cap coordination and one bounded combined review. No further launch or autonomous anatomy iteration is pending here.
