# Original human prototype: active continuation

Parent expanded this same lane at approximately 18:34 UTC on 13 October 2026: deliver actual original Blender character geometry, first pixels, physical subset controls, expressions and a turntable. This is an independent prototype, not adoption of the existing character task or a game-body replacement. Same branch and two owned prefixes only. Skin/eyes, hair and wardrobe task launches are parent-owned; no subworkers were launched here.

## Early usable master checkpoint

The branch commit that contains this file pins the neutral master for receiving lanes. Parent should forward its exact SHA from the task update, not a mutable branch tip. Assets live at `experiments/cloud-lanes/human-design-contract/prototype/`:

- `original-human-prototype.blend`: compressed editable original mesh source, UVs, per-object shape keys, height/expression corrective drivers, neutral studio and camera. Blender 4.3.2.
- `original-human-prototype.glb`: uncompressed GLB with real POSITION morph targets and prototype PBR constants. No armature, skin weights, retargeting, skeletal animation or current-game-loader compatibility is claimed.
- `fit-frame.json`: exact asset hashes, explicit Blender/glTF axes, construction landmarks, six implemented controls, expression presets and corrective rule.
- `build_character.py`: complete original mathematical construction; no downloaded models, photographs, scans, SMPL or existing body assets. Original continuous face, orbital lids, lips, ears, neck, hands, fused shirt and trouser surfaces, shoes and simple scalp surface.
- `inspect_character.py`: bounded checks on the actual saved Blender mesh/morph data.
- `capture_character.py`: actual saved-asset captures; stills/turntable work continues from this early checkpoint without rebuilding the master.

Measured neutral: **29,186 triangles**, **31 meshes**, width 0.662678 m, height 1.748 m from sole minimum 0.010 m to scalp maximum 1.758 m. Existing high-detail preview limit is 34,000 triangles; this prototype stays below it. This is not the medium/crowd tier, whole-scene budget, draw-call optimization or hardware performance acceptance. Game budgets were not edited.

`geometry-checks.json` records **112 sampled neutral/endpoint/pairwise/expression combinations, zero current failures**, finite coordinates, no zero-area triangles, conservative orientation checks, independent nose/ear regions, central lid closure and the triangle cap. Initial failures are retained in `geometry-checks-before-fix.json` and `geometry-checks-lid-review.json`: inward-ear folding and lid-corner/height composition defects were real. Ear maximum movement was reduced to 8 mm; the blink canthus was corrected; height × expression product correctives preserve eyelid closure when the body is shortened. Lid projected Jacobians are checked separately because a 3D normal-angle comparison alone does not distinguish a rotating lid from a fold; 0.01% projected-area tolerance handles float32 closed canthi. This is not continuous collision, self-intersection, skinning or realism acceptance.

Implemented identity subset, all signed [-1,1]: `nose.projection`, `nose.alarWidth`, `earLeft.protrusion`, `earRight.protrusion`, `body.height`, `body.shoulderWidth`. The other **32 contract controls are not implemented geometry**. Expressions use left/right smile, frown, inner-brow raise and blink channels. Every exported `corrective.height.CHANNEL` must receive `body.height * expression.CHANNEL`; Blender has actual drivers, while a glTF consumer must calculate the products itself.

## Receiving-lane boundaries and fit limits

Freeze exact asset SHA before using it. Coordinates: Blender metres X character-left, Z up, front -Y; glTF conversion `[x,y,z] -> [x,z,-y]`. All authored mesh nodes have identity transforms. `geometry-checks.json` contains per-mesh position, ordered-triangle and UV hashes plus actual bounds. Fit landmarks are construction points, not surveyed body anatomy or accepted surface anchors. `fit-frame.json` is distinct from the earlier synthetic anchor test packet.

The head/eye/orbit meshes and cylindrical rear-seam head UV are usable as an explicitly provisional calibration input. UV islands are not a production atlas. The current garment surfaces are a **clothed body envelope**; there is no independent undressed torso/leg master yet, so receiving wardrobe work cannot claim final body fit. Scalp/hair and materials are simple local placeholders; their new owners may build separately against this pinned envelope, not edit this master or wait for ownership to proceed on their calibration assets. This lane keeps face/body/expression geometry and any future master rig.

Important visual limits remain: stylized face, simple skin shading, cap-like scalp placeholder, unfinished eye-corner transitions, plain garments, no locomotion. Original neutral views and the first raw render are retained. The first render exposed protruding eyeballs and an unsuitable hairline; these were corrected before the neutral master, without pretending the early image was finished. Skin/hair/clothing realism and game integration remain open.

## Actual execution and next steps

No dependency installation, paid tool, production/runtime/shared pipeline changes. Blender commands use four threads, one repository heavy slot and finite timeouts; Node slot runner heap 128 MiB. First successful render took 9.45 s including build/export, peak child RSS 354,016 KiB. A three-view pass took 23.89 s, peak 364,032 KiB. Cycles CPU, 24 samples, no GPU/device performance claim. The Blender build has no OpenImageDenoise, so the initial denoise request failed and was disabled. It also reports missing optional Draco; the uncompressed GLB export succeeds. Full game tests/build/typecheck have not been rerun.

From worktree `/workspace/joinallworld-human-design-contract` (or a fresh checkout of the exact published SHA):

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 45s blender -b experiments/cloud-lanes/human-design-contract/prototype/original-human-prototype.blend -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/inspect_character.py
```

Do not rebuild a receiving lane's frozen master; import its exact bytes. If this lane must reproduce the source, run `build_character.py -- --mode export` in the same bounded wrapper. Neutral views use `--mode views`; the first portrait uses `--mode first`. Generated Blender backup and frame scratch files are ignored inside the owned prototype directory.

Next in this task: inspect actual expression/endpoint stills; produce the short turntable with explicit control labels; inspect it; check exported GLB morph bytes and fitting hashes; push final receipts and Library deliverables. Rig/locomotion may follow this visual checkpoint under parent direction. Do not block independent prototype work on existing character-task lookup, but do not claim its paths or integrate into its runtime.

First actual pixels were saved to Library as `libfile_e731471706a48191b0468c886fa9c297`, version 0, file `file_00000000b918823090c4e659c08b2da8` (`first-neutral-portrait.png`), explicitly labelled raw first geometry. Parent had independently delivered the older topology sketch; it is not the new character.
