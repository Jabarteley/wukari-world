# V4 anatomy review: scoped improvement; skin and full-character acceptance pending

Exact candidate **`2921534bdc8959a8489713f9b1652381702808a5`**, GLB SHA-256 **`2338c0b3b4d34d3549e2a2d30c91b4ddf65dc2111c9b6f13450a2dd8dad3477d`**, has been inspected. The finite geometry correction is supported by independent export checks and a visible improvement in closed lids. **The character is still not convincing/realism accepted.** Keep this candidate pinned for the already assigned skin refit and later bounded combined review; it is not production adoption or a replacement of the frozen master.

## Visual judgment from actual supplied images

Inspected the producer's [matching v3/v4 neutral, half-blink and full-blink comparison](https://github.com/kromate/joinallworld/blob/2921534bdc8959a8489713f9b1652381702808a5/docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/Allworld-anatomy-v4-neutral-half-full-review.png), plus the original 600×720 [v4 neutral](https://github.com/kromate/joinallworld/blob/2921534bdc8959a8489713f9b1652381702808a5/docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/neutral.png) and [full-blink](https://github.com/kromate/joinallworld/blob/2921534bdc8959a8489713f9b1652381702808a5/docs/agent-plans/cloud-lanes/human-design-contract/prototype/anatomy-candidate-v4/full-blink.png) files. These are the producer's actual Blender renders with placeholder materials, not a coordinator-generated beauty render. Exact image bytes/hashes are in [input-pins.json](input-pins.json); comparison SHA-256 is `57a3ce56a99f7a633388c52e92a417e995b13d10496bdb79c545a14cb603c50a`.

- **Improved:** the v3 bulbous closed lids have flattened substantially. The new eyes sit more coherently inside the sockets, and the detached-looking raised lid patches are reduced. This is a useful scoped anatomy correction.
- **Still visible:** full blink produces angular, almost rectangular socket folds above and below the closure line, with pinched corners. The neutral eyes read as narrow apertures under pronounced creases. The smooth bridge/cheek transitions, simple nostril forms, slab-like visible ear silhouettes and stiff lips remain stylized. A skin texture alone cannot be assumed to correct those shapes.
- **Material limits:** these images contain placeholder skin, iris and hair shading. Their grain/surface appearance is not evidence about the incoming skin refit. The cap-like hair is the original placeholder, not either prepared silhouette derivative.
- **Unreviewed:** this pass has no new profile/back view, animation/video, full assembled character, final skin, rigged motion or game render. The frontal stills cannot establish closure from every angle or continuous deformation. No numeric pass is called realism.

## Independent intake and geometry evidence

[compatibility-and-cost-plan.json](compatibility-and-cost-plan.json) was generated from the exact GLB bytes. It confirms **29,538 triangles, 27 primitives/mesh nodes, 10 used materials, zero images, zero skins and zero animations**; raw GLB size is 2,902,692 bytes. Raw bytes are not the game's compressed download measurement.

All **20 unaffected meshes** preserve triangle-expanded positions, UVs, POSITION morph payloads and node transforms against frozen `3ee5882c8efde54c00fddaa6cbdbc8d1bca48b8a`. The seven changed surfaces are Head, both Eye, Iris and Pupil surfaces. Four standalone lid nodes are absent. The six identity-control declarations, axes/units and 16 construction anchors match exactly.

Original Head face UVs are byte-identical in triangle-expanded order; **149 of the original 8,096 triangles** have changed rest positions. Their changed-region bounds are recorded, as are all per-part hashes. All three declared hair surface-anchor triangles retain their positions and old morph deltas; newly added blink deltas are zero on those anchors. The torso/neck/limb/shoe surfaces used by the clothing envelope are unchanged. These checks support the existing fitting inputs without claiming that the whole Head is unchanged.

[targeted-geometry-checks.json](targeted-geometry-checks.json) and [execution output](targeted-geometry-output.txt) record **five independent exported-morph states**: neutral, half blink, full blink, and each all-six-controls endpoint combined with half blink. Both existing silhouette hairstyles were checked in each state (ten hair/state combinations); wardrobe was checked once per state. No new skin/caps were present.

- Eye/iris/pupil versus Head proper crossings: **0** across all five states, including neutral. This independently supports the scoped closure of the previously measured 69 neutral eye/head crossings.
- New connected-lid normal reversals: **0**; minimum sampled new-lid triangle area `2.5295251320737453e-7 m²`.
- Hair/body and wardrobe/body proper crossings: **0**; finite, nondegenerate sampled geometry. Minimum signed nearest-normal samples: hair **0.003404731879 m**, wardrobe **0.002793039248 m**. No negative samples beyond the existing 0.2 mm hair /0.1 mm garment tolerances.
- Input hashes stayed unchanged and neutral reset was exact. The prior audited proper-crossing function is pinned by SHA-256; three crossing/disjoint/touch classifier fixtures passed at the unchanged 0.25 µm tolerance.

The five-state analysis took about **0.415 seconds** inside one 45-second Blender/heavy-slot bound, two threads and 128 MiB Node heap. No broad suite, old 35/448/17/3,003-state producer suite or unchanged v3 capture was rerun. Discrete tests do not certify all combinations, continuous/coplanar/self-collision, rigged or undressed-body fitting.

The producer's separate 35-state and limited continuous-orientation evidence was read, not relabelled as coordinator execution. Its reported **2,102 inherited Head UV overlap pairs** and inherited degenerate cap UVs remain disclosed. The scoped new socket UV pass is not a production-atlas pass.

## Prepared composition and actual-code budget boundary

Use v4 once, hide only `Hair_original_close_curl_surface` (**2,518 triangles**), add exactly one existing silhouette hairstyle, and add the **2,324-triangle** garment-only envelope. Keep all original torso/leg geometry; no invented body mask. Hair input is `7a9759f1c371aba39bc34b875e64797c4071ad25`; wardrobe input is `8f6e32102f47330239c30d45aa552ea6e17d9011`. Their source blobs and fitting metadata are pinned here.

| Hair | Hair triangles | Total before new skin geometry | Conditional total with prior 1,200 cap triangles | Margin under 34,000 |
| --- | ---: | ---: | ---: | ---: |
| Existing crop silhouette | 358 | 29,702 | 30,902 | 3,098 |
| Existing bun silhouette | 502 | 29,846 | 31,046 | 2,954 |
| Detailed crop, held | 6,574 | 35,918 | 37,118 | −3,118 |
| Detailed bun, held | 5,766 | 35,110 | 36,310 | −2,310 |

These are decoded-input arithmetic, **not measured assembled totals**. New cap cost is unknown until the skin handoff; actual combined fields remain null. Both detailed styles exceed 34,000 even before added caps. The fixed v4-minus-placeholder-plus-wardrobe cost is 29,344; total hair allowance is `4,656 − new skin-added triangles`, or 3,456 if caps remain 1,200. No cap increase or hidden clothing subtraction is used.

All 13 [actual-code budget source pins](../renderer-budget-source-pins.json) were reverified against this unchanged checkout's production baseline `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. **34,000 is the existing procedural high-preview comparator**, not shipped-body admission. Shipped skinned base still requires <=10,000 triangles, one primitive/material/skin and compatible joints/weights; this candidate cannot use that route. Wardrobe's actual guards remain <=4,000/item and <=3,000 combined, leaving 676 triangles for other counted wardrobe items. Venue tests remain <17,000 triangles /<=60 calls for their existing scene scope. No current-game, device or download-budget acceptance follows from this preview arithmetic.

## Skin wait and next action

The previous corrected caps from `2544b6d66bddf5431ed15bd17298a21b43bcc454` are **incompatible** with the smaller v4 globes. Unchanged eye centres do not preserve cap fit. Four lid maps/node bindings must migrate to the connected Head; changed iris/pupil mappings also need explicit review. Existing eye/head originals are not combined with the old skin as a substitute.

Read [MATERIAL-DRAW-PLAN.md](MATERIAL-DRAW-PLAN.md) before another combined render. It explains why the old optical pipeline conditionally projects **60/62 calls** for the silhouettes, and identifies six compatible-material grouping proposals that could save seven opaque primitives, subject to the incoming skin packet. No geometry/material consolidation has been implemented or visually approved.

Wait for the existing skin owner to return the exact versioned refit, Head binding migration, changed-surface hashes, geometry/material/texture costs and affected fit evidence. Then reconcile those bytes before one finite combined review under the existing limits. Parent owns launches/adoption; all current lanes keep ownership. Country-context recipes remain research proposals with rights/local review pending and identity-preserving travel rules. Original Blender background/mobile production remains separate.

No new browser, server or render was started; heavy/server/browser slots were free after execution. No producer assets, sealed prior packet, runtime, dependencies, CI, budgets, main branch or deployment were modified.

## Reproduction

Helpers are in `experiments/cloud-lanes/integration-contract/anatomy-v4-review/`. Reuse `combined-review-v1/glb.py`; it is a read-only dependency, not a producer edit. Fetch exact Git objects named in the input pins if absent, then run `materialize.py` to restore ignored scratch. Only repeat checks for changed inputs or necessary fresh-environment verification:

```sh
python3 experiments/cloud-lanes/integration-contract/anatomy-v4-review/materialize.py
NODE_OPTIONS=--max-old-space-size=128 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 30s python3 experiments/cloud-lanes/integration-contract/anatomy-v4-review/audit.py
NODE_OPTIONS=--max-old-space-size=128 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 node scripts/agent-slot.ts heavy --wait-ms 1000 -- timeout 45s blender -b -t 2 --python-exit-code 2 --python experiments/cloud-lanes/integration-contract/anatomy-v4-review/sample_geometry.py
```

`audit.py` reads the existing Three 0.180.0 installation at `/workspace/joinallworld-cloud-coordinator/node_modules/three` to pin the renderer analysis. Reconcile that path/package on another machine before execution; no installation was performed here.
