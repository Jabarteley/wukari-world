# Eyelid candidate v3 — bounded correction complete, review required

The four-lid candidate is complete and **not adopted or realism-accepted**. Parent owns combined review and further launches. Original master `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a` and v2 at `f00a004c2372e1f4ce9305c283be9632c0f238e3` remain unchanged. Source checkpoint `d20184674744995a02c804210853a34f29b958aa` was pushed and remote-verified; obtain the final immutable candidate SHA from the task response. No other lane should rebind automatically.

## Candidate and proof

- Assets: `experiments/cloud-lanes/human-design-contract/prototype/eyelid-candidate-v3/eyelid-candidate-v3.blend` and `.glb`.
- Separate `fit-frame-candidate-v3.json` gives exact asset hashes, inherited coordinate/anchor frame, retained controls and the new corrective rule. Original `fit-frame.json` is unchanged.
- [Inspected neutral / half / full blink sheet](Allworld-eyelid-candidate-v3-neutral-half-full.png). Individual images are `neutral.png`, `half-blink.png`, `full-blink.png`: 600×720, 24-sample Cycles CPU, no denoising or generated replacement pixels.
- [Geometry and UV checks](geometry-uv-checks.json), [actual GLB compatibility](glb-compatibility.json), [build/preservation receipt](build-receipt.json), [source report pins](input-review.json), [original/v2 diagnosis](inherited-intersections.json).

Final cost: **32,482 triangles / 31 meshes**. Adding the skin lane's stated 1,200 cap triangles is arithmetically 33,682, below the existing 34,000 preview cap. This is not a combined fit test, draw-call/crowd/mobile budget or adoption permission. No skeleton or skeletal animation was added.

## Compatibility

Only `UpperLid_Left`, `LowerLid_Left`, `UpperLid_Right`, `LowerLid_Right` have revised topology, UVs, shape-key positions and derived normals. All **27 other original meshes** retain exact positions, ordered triangles, UVs, every shape-key coordinate and material bindings in the saved Blender file. Independent actual GLB decoding also verifies triangle-expanded POSITION, TEXCOORD_0 and every POSITION morph payload for those 27 meshes. Body, head, eyes, iris/pupil, hair, clothes and material appearance are unchanged.

The six implemented identity controls retain their names/ranges/meanings. The other 32 remain unimplemented. Existing expression names and `corrective.height.CHANNEL = body.height * expression.CHANNEL` remain. The lids inherit relevant existing head morphs at their outer boundaries.

**New additive consumer rule:** `corrective.blinkArcLeft/Right = 4 * expression.blinkLeft/Right * (1 - expression.blinkLeft/Right)`. Blender has actual drivers; GLB consumers must calculate this arc weight and the existing height products. Setting only the blink target is insufficient. POSITION and NORMAL morph targets are exported; no runtime code was changed.

Four separate rectangular `Eyelid_UV_v3` maps replace the old lid unwraps. They are independent per-object maps, not a shared atlas. If parent adopts, only lid textures and lid-specific vertex/barycentric bindings need new versions. Other 27 mesh/UV payloads remain compatible. This is a separate overlapping skin patch, not a welded replacement head. Receiving lanes keep their current pinned inputs until review.

## Tests and remaining visual defect

**35 actual dependency-graph cases pass:** six individual identity endpoints; both combined six-control extremes at neutral/half/full blink; quarter/half/three-quarter/full blink at three heights; happy/sad; asymmetric blink. Zero sampled proper transverse crossings for lids versus eyes, iris, pupils, head or opposite lid. Driven positions match expected weights within **0.1491 μm**, with finite positions and nonzero triangles.

The filter retains raw BVH candidates, requires both-plane straddling and overlapping segments on the planes' intersection line, and passes three independent crossing/disjoint/touch fixtures. Strict plane/interval tolerance is **0.25 μm**, approximately two float32 ULPs at 1.635 m. Earlier 10 nm closed-seam counts are retained. Raw boundary touches are not automatically penetration. This is sampled testing, not continuous collision, global clearance or exhaustive coplanar/self-collision proof.

All four candidate UV maps have **zero positive-area triangle overlaps**, unit summed area and nonzero triangles. Original maps have 708 / 964 / 524 / 1010 overlapping triangle pairs under the same polygon-area test; these are not the skin lane's raster pixel fractions. Ear/iris/finger UVs were not changed.

Inspected renders show smoother lower lids, a distinct half blink, full eye coverage and a reduced outer patch edge. **Closed lids still look raised and stylized**, with residual crease/transition artifacts; this is not realistic anatomy acceptance. The unchanged eye/head interface has **70 raw BVH pairs, 69 proper transverse crossings at neutral**. A lids-only overlay cannot remove that underlying penetration. No eye repositioning, head reshaping or appearance change was implemented.

Rejected rim-matched images exposed white crescents and remain under `rim-matched-rejected-*`. The first envelope draft had crossings and a circular border; its image/check remain under `envelope-draft-rejected-*`. `full-closure-before-split-fix.json` retains a later failed seam result. Final geometry gives upper/lower lids matching closed-edge vertex samples. Failures were preserved, not relabelled.

## Other-owner inputs

Read skin checkpoint `f504d2f450a95d5f411abca6f63b9401f1401fc5`: 23 poses, 1,336 reported original eye/lid BVH pairs summed across poses, 34 added-cornea pairs at half blink. `input-review.json` pins its report hash. This lane reproduced original eye/lid raw BVH pairs 58 / 60 / 58 at neutral/half/full; v2 had 22 / 42 / 66. Original head/lid raw pairs were 510 / 392 / 367; v2 had 480 / 413 / 378. Pair counts are not distinct contact regions.

Parent later reported skin correction **`2544b6d66bddf5431ed15bd17298a21b43bcc454`**: dome 0.45→0.25 mm, 3,003 sampled poses, zero added intersections, master unchanged. That work was neither imported nor edited here; its scan was **not repeated**. Its proof does not automatically certify these revised lids. Parent chooses the smallest combined check after review.

## Exact bounded reproduction

Run from `/workspace/joinallworld-human-design-contract` or a fresh checkout of the final SHA, only as needed for new changes. All completed commands terminated. No broad game tests/build/typecheck, new worker, paid tool, credentials change, runtime edit or deployment.

```sh
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/diagnose_lids.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 75s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/build_lid_candidate_v3.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=4 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 90s blender -b -t 4 --python-exit-code 2 --python experiments/cloud-lanes/human-design-contract/prototype/check_lid_candidate_v3.py
NODE_OPTIONS=--max-old-space-size=128 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 20s bash experiments/cloud-lanes/human-design-contract/prototype/assemble_lid_proof_v3.sh
```

Builder `-- --no-render` skips images; checker `-- --quick` selects only three diagnostic poses and is not the final gate. Assembly `--image-only` changes layout without repeating unchanged GLB checks. Four Blender CPU threads; no device-performance claim. Nonfatal optional-Draco/Fontconfig warnings retained. Reproduce in a fresh review checkout; never silently overwrite a published candidate.

Parent next action: review this immutable candidate alongside pinned skin/hair/wardrobe work. Retain the current master until explicit adoption. Further anatomy work needs a separate version and scope; this bounded task is finished.
