# Anatomy v4: actual review checkpoint, validation in progress

Parent requested only eye/head/lid correction after combined review `7d01f9979aea8d0d74b6110d6de662c69a7c4a40`. Inputs and three flagged faces are pinned in `input-pins.json` and `incoming-lid-flags.json`. Previous final `7a8928797aea919ae92d41fe4cc15f1c2ad74da1`, v3 asset `b62b7fb6`, and original master `3ee5882c` remain untouched. No rebind, integration, production deployment or realism acceptance.

Actual new candidate assets are under `experiments/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/`. Builder and focused checker are adjacent `build_anatomy_v4.py`, `check_anatomy_v4.py`. Current geometry: **29,538 triangles / 27 meshes**, with 20 unaffected meshes verified exact. Eye globes are 24 mm spheres centred on the exact original eye anchors; iris surfaces conform to them. Only 62 old head vertices move, within the orbital region; original scalp/body/ear/nose fit anchors remain unchanged. New lids are welded to the original head-opening edges and embedded in the Head mesh. Four separate overlaid lid objects are removed. Existing six identity controls and blink/height corrective semantics remain; other 32 controls remain unimplemented.

Actual neutral/half/full renders are present and have been inspected. Closed eyelids are flatter than v3's bulbous overlays; local socket transitions and facial proportions remain coarse/stylized. A first iris draft intersected the resized globe visually and was corrected with short radial segments; its image is retained as `first-neutral-iris-defect.png`. No appearance features were added.

Current measured UV limitation: 2,102 inherited positive-area overlaps among old head faces; 20 additional overlaps among new faces, zero new-versus-old overlaps. Iris/pupil maps have zero overlaps. The initial checker stopped at this UV gate, so it did not yet report eye/head crossings. It now preserves that failure and continues the geometry/orientation gates; the current bounded test is running. Do not treat this source checkpoint as a passed candidate.

All Blender calls use one existing heavy slot, Node heap128 MiB, four CPU threads, timeout90s. No other owner's suites or 3,003-case scan repeated. Exact active command:

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/check_anatomy_v4.py
```

Builder uses the same wrapper with `build_anatomy_v4.py`; `-- --no-render` omits images. Frozen source bytes remain the input. No body/hair/clothing modifications, budget changes, new workers or runtime edits. Remaining work is finite: inspect pending test output; address only identified socket/normal/UV defects or stop with a specific blocker; freeze and publish the final proof/compatibility receipt. Detailed hair remains over the combined budget even after this reduction.
