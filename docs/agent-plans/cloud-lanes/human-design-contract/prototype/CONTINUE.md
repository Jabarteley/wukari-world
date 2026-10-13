# Original human prototype: active continuation

**Latest completed correction:** see [anatomy-candidate-v4/CONTINUE.md](anatomy-candidate-v4/CONTINUE.md) for connected eye/socket/lid geometry, finite passing checks and the v3/v4 comparison. The separate v4 candidate does not replace frozen master 3ee5882c; skin/cornea refitting and parent review are required before adoption. Earlier v3 and original-prototype history below remain preserved.

Parent expanded this same lane at approximately 18:34 UTC on 13 October 2026: deliver actual original Blender character geometry, first pixels, physical subset controls, expressions and a turntable. This is an independent prototype, not adoption of the existing character task or a game-body replacement. Same branch and two owned prefixes only. Skin/eyes, hair and wardrobe task launches are parent-owned; no subworkers were launched here.

## Immutable master and completed visual checkpoint

**Receiving lanes remain pinned to `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`.** The completed video uses that exact master. Its BLEND SHA-256 remains `36018022ff64367e7426069d7417625a3591f3a2c0684c628c11c3bd908f84d9`; GLB remains `5f0f8da1f3e6b14fc4910f04f02ed1eafe6446f896f44ef2b3a23f2ca071bc07`. Both were checked after capturing and after creating the separate derivative. Do not use the mutable branch tip to replace a receiving lane's input. Assets live at `experiments/cloud-lanes/human-design-contract/prototype/`:

- `original-human-prototype.blend`: compressed editable original mesh source, UVs, per-object shape keys, height/expression corrective drivers, neutral studio and camera. Blender 4.3.2.
- `original-human-prototype.glb`: uncompressed GLB with real POSITION morph targets and prototype PBR constants. No armature, skin weights, retargeting, skeletal animation or current-game-loader compatibility is claimed.
- `fit-frame.json`: exact asset hashes, explicit Blender/glTF axes, construction landmarks, six implemented controls, expression presets and corrective rule.
- `build_character.py`: complete original mathematical construction; no downloaded models, photographs, scans, SMPL or existing body assets. Original continuous face, orbital lids, lips, ears, neck, hands, fused shirt and trouser surfaces, shoes and simple scalp surface.
- `inspect_character.py`: bounded checks on the actual saved Blender mesh/morph data.
- `capture_character.py`: actual saved-asset captures, with each of the six identity controls isolated in the video. It never saves over the master.

Completed deliverables alongside this document:

- [character-controls-turntable.mp4](character-controls-turntable.mp4): 15 seconds, H.264, 384×512, 12 fps, 180 frames. First three seconds rotate the camera around the static body; six individual controls follow, then neutral, happy, sad and blink. Labels explicitly say six controls implemented, 32 unimplemented, and no skeletal rig.
- [expression-review.png](expression-review.png): four actual rendered expression states, inspected.
- [control-endpoints-review.png](control-endpoints-review.png): combined nose/body endpoint stills and asymmetric ears, inspected. These are combined extremes; the video isolates each control.
- [video-sampled-frames.png](video-sampled-frames.png): eleven decoded labelled samples, inspected. FFmpeg decoded the entire video without errors; `video-probe.json` confirms duration/frame count. Real-time playback was not performed.
- [eye-refinement-v2/neutral-blink-review.png](eye-refinement-v2/neutral-blink-review.png): closer neutral/blink renders from a **separate derivative**, not the frozen video/master. Its lid aperture is 29.6 mm wide and 8.6 mm high at the centre. Only four lid meshes and their morph positions changed; head/eye centres, all other mesh positions, UV/index topology, materials, body and hair remain inherited. It remains a stylized experiment with visible lid/face seams.
- `media-receipt.json`, `capture-values.json`, three `timeline-*.json`, render logs and `export-checks.json`: exact media hashes, state parameters and actual validation evidence.

The Library prepared-upload helper failed during hosted app tool discovery with `network`; **zero new Library saves are confirmed** for this batch. No uncertain write was retried or switched to a direct upload. Parent can use the exact branch media above or upload those files. Existing earlier Library IDs at the end of this file remain valid.

Measured neutral: **29,186 triangles**, **31 meshes**, width 0.662678 m, height 1.748 m from sole minimum 0.010 m to scalp maximum 1.758 m. Existing high-detail preview limit is 34,000 triangles; this prototype stays below it. This is not the medium/crowd tier, whole-scene budget, draw-call optimization or hardware performance acceptance. Game budgets were not edited.

`geometry-checks.json` records **112 sampled neutral/endpoint/pairwise/expression combinations, zero current failures**, finite coordinates, no zero-area triangles, conservative orientation checks, independent nose/ear regions, central lid closure and the triangle cap. Initial failures are retained in `geometry-checks-before-fix.json` and `geometry-checks-lid-review.json`: inward-ear folding and lid-corner/height composition defects were real. Ear maximum movement was reduced to 8 mm; the blink canthus was corrected; height × expression product correctives preserve eyelid closure when the body is shortened. Lid projected Jacobians are checked separately because a 3D normal-angle comparison alone does not distinguish a rotating lid from a fold; 0.01% projected-area tolerance handles float32 closed canthi. This is not continuous collision, self-intersection, skinning or realism acceptance.

Implemented identity subset, all signed [-1,1]: `nose.projection`, `nose.alarWidth`, `earLeft.protrusion`, `earRight.protrusion`, `body.height`, `body.shoulderWidth`. The other **32 contract controls are not implemented geometry**. Expressions use left/right smile, frown, inner-brow raise and blink channels. Every exported `corrective.height.CHANNEL` must receive `body.height * expression.CHANNEL`; Blender has actual drivers, while a glTF consumer must calculate the products itself.

## Receiving-lane boundaries and fit limits

Freeze exact asset SHA before using it. Coordinates: Blender metres X character-left, Z up, front -Y; glTF conversion `[x,y,z] -> [x,z,-y]`. All authored mesh nodes have identity transforms. `geometry-checks.json` contains per-mesh position, ordered-triangle and UV hashes plus actual bounds. Fit landmarks are construction points, not surveyed body anatomy or accepted surface anchors. `fit-frame.json` is distinct from the earlier synthetic anchor test packet.

The head/eye/orbit meshes and cylindrical rear-seam head UV are usable as an explicitly provisional calibration input. UV islands are not a production atlas. The current garment surfaces are a **clothed body envelope**; there is no independent undressed torso/leg master yet, so receiving wardrobe work cannot claim final body fit. Scalp/hair and materials are simple local placeholders; their new owners may build separately against this pinned envelope, not edit this master or wait for ownership to proceed on their calibration assets. This lane keeps face/body/expression geometry and any future master rig.

Important visual limits remain: stylized face, simple skin shading, cap-like scalp placeholder, oversized flat ears, angular shoulders, small hands, unfinished lid-to-face transitions, plain garments, no locomotion. Original neutral views and the first raw render are retained. The first render exposed protruding eyeballs and an unsuitable hairline; the frozen master reduced those defects but did not achieve realistic anatomy. The separate narrower-lid derivative still shows surface patches/seams in close-up. Geometry checks are not a realism pass. Skin/hair/clothing realism and game integration remain open.

## Actual execution and next steps

No dependency installation, paid tool, production/runtime/shared pipeline changes. Blender commands use four threads, one repository heavy slot and finite timeouts; Node slot runner heap 128 MiB. First successful render took 9.45 s including build/export, peak child RSS 354,016 KiB. A three-view pass took 23.89 s, peak 364,032 KiB. Cycles CPU, 24 samples, no GPU/device performance claim. The Blender build has no OpenImageDenoise, so the initial denoise request failed and was disabled. It also reports missing optional Draco; the uncompressed GLB export succeeds. Full game tests/build/typecheck have not been rerun.

From worktree `/workspace/joinallworld-human-design-contract` (or a fresh checkout of the exact published SHA):

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 45s blender -b experiments/cloud-lanes/human-design-contract/prototype/original-human-prototype.blend -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/inspect_character.py
```

Do not rebuild a receiving lane's frozen master; import its exact bytes. If this lane must reproduce the source, run `build_character.py -- --mode export` in the same bounded wrapper. Neutral views use `--mode views`; the first portrait uses `--mode first`. Generated Blender backup and frame scratch files are ignored inside the owned prototype directory.

## Reproduce the completed media and derivative

Run from the repository root, one command at a time. All heavy commands acquire the existing single slot and terminate within finite bounds. The three frame chunks each completed successfully; scratch frames are intentionally ignored, while the final MP4 and evidence are committed.

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 75s blender -b experiments/cloud-lanes/human-design-contract/prototype/original-human-prototype.blend -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/capture_character.py -- --mode stills

# Repeat for [60,120) and [120,180), preserving the 75-second bound per chunk.
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 75s blender -b experiments/cloud-lanes/human-design-contract/prototype/original-human-prototype.blend -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/capture_character.py -- --mode frames --start 0 --end 60

NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 60s blender -b experiments/cloud-lanes/human-design-contract/prototype/original-human-prototype.blend -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/refine_eyes_v2.py

NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 35s bash experiments/cloud-lanes/human-design-contract/prototype/assemble_media.sh

NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 15s python3 experiments/cloud-lanes/human-design-contract/prototype/inspect_exports.py
```

The expression sheet was made with ImageMagick montage from neutral/happy/sad/blink, 320×400 tiles, four columns; no facial pixels were edited. `assemble_media.sh` records exact caption, encoder, montage and video-decoding commands. FFmpeg uses two threads; Blender uses four CPU threads. Nonfatal Fontconfig cache warnings occurred during assembly. The raw videos use eight Cycles samples per frame; stills use twenty, eye close-ups thirty-two. Grain is expected; no image-generation replacement or denoising was applied. Committed render logs retain warnings/errors, paths, timing and completion markers; repetitive Cycles progress is omitted, with raw local logs retained under ignored `prototype/frames/render-logs/`.

`eye-refinement-v2/refinement-receipt.json` records **36 actual dependency-graph evaluations**: height {-1,0,1} × blink {0,0.5,1} × four lids. Actual driven positions matched expected corrected positions within 2 μm, with finite nonzero triangles and no sampled projected fold. The frozen master's prior 112-case result was reused without rerunning unchanged geometry. `inspect_exports.py` decoded actual dense and sparse GLB accessors for both files: 29,186 triangles each, finite indexed positions, nonzero POSITION morphs, and **28 height-product targets per export**. The validator initially rejected Blender's legal sparse accessor encoding; sparse decoding was then implemented and both files passed. Neither GLB contains skins or skeletal animation. No broad application tests were run again.

## Parent handoff and remaining work

The requested bounded visual checkpoint is complete. Parent owns any further launch, adoption or integration. Preserve `3ee5882c` as the skin/eyes, hair and wardrobe calibration input until parent explicitly chooses a new shared version. The eye derivative is an optional geometry review candidate at `prototype/eye-refinement-v2/`, with its exact hashes in the receipt; do not silently substitute it into another lane.

Next useful face/body work is a genuinely continuous anatomical lid/socket transition, improved ear/nose/cheek proportions, hands and shoulder silhouette, followed by agreed identity endpoints. A joined or revised head topology would need an explicit new fit/UV/morph version and receiving-lane coordination. The current four separate lid patches are a demonstrated limitation. Skin shading cannot alone correct it.

Rigging, weights, joint/rest matrices, shoulder/hip/knee pose correction, locomotion, undressed body fitting, the remaining 32 geometry controls, speech/gaze and runtime save integration remain unimplemented. Before claiming realism or production acceptance, demonstrate deformation and clothing/hair fit at agreed endpoints and poses, then the actual game/device flow. Existing character task ownership remains untouched; its unsupported-placement lookup is still unresolved outside this task.

First actual pixels were saved to Library as `libfile_e731471706a48191b0468c886fa9c297`, version 0, file `file_00000000b918823090c4e659c08b2da8` (`first-neutral-portrait.png`), explicitly labelled raw first geometry. Parent had independently delivered the older topology sketch; it is not the new character.

The previously saved neutral full-body image is `libfile_2c70688d19f881918aa5b265e73cbfc8`, version 0, file `file_00000000a58881f7b54e8df4332f1ef4`. These earlier files are not substitutes for the completed video or new review sheets.
