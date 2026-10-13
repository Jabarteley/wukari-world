# V4 material and draw-call consolidation plan — unimplemented

Prepare against human `2921534bdc8959a8489713f9b1652381702808a5`, existing hair `7a9759f1c371aba39bc34b875e64797c4071ad25`, wardrobe `8f6e32102f47330239c30d45aa552ea6e17d9011` and the **pending** v4 skin derivative. This is a proposal for existing owners, not authority to modify production or an accepted optimization. No full-combination render has run.

## Cost mechanism, not material-count guesswork

The existing Three **0.180.0** `src/renderers/WebGLRenderer.js` is fingerprinted in [compatibility-and-cost-plan.json](compatibility-and-cost-plan.json). Its transmission pass redraws visible opaque objects into the transmission target (around line 1918). Without `WEBGL_multisampled_render_to_texture`, double-sided transmissive surfaces also get a back-side draw (around line 1937), before the normal scene pass. This explains the old measured 68/70 calls and doubled submitted triangles; shared material objects alone do not batch separate meshes.

If the new skin retains two cap primitives with the old transmissive/double-sided settings and creates no additional primitives, v4 has 28 opaque primitives with crop, 29 with bun, plus two cap primitives. The same old full-body camera/pipeline therefore **projects**, but has not measured, `2×opaque + 4 = 60/62 calls`, and roughly `2×30,902 / 2×31,046 = 61,804 / 62,092` submitted triangles. Frustum culling, extensions, side/alpha settings, shadows and new materials can change these values. These estimates require replacement with actual renderer receipts when the skin packet arrives.

The <=60 call value belongs to an existing venue scene test, not an entire budget allocation for one new character. Reaching 60 in an isolated portrait/full-body preview leaves no inferred scene headroom. The <17,000 scene and <=10,000 shipped-body constraints remain separate failures for this candidate.

## Smallest first proposal: preserve surfaces and materials

The six groups below have matching complete material semantics in the previous corrected skin GLB when display names/extras are excluded. They use no textures. Their incoming v4 skin semantics must match before any grouping. Keep the producer meshes intact and perform any accepted batching only in a separate derived review artifact with a reversible source-to-vertex/face map.

| Candidate group | Opaque primitives before → after | Potential saved draws with the same two-pass optics |
| --- | ---: | ---: |
| `Shirt_fused_shoulders` + `Collar_band` | 2 → 1 | 2 |
| `Shoe_-1` + `Shoe_1` | 2 → 1 | 2 |
| `Sole_-1` + `Sole_1` | 2 → 1 | 2 |
| `Brow_Left` + `Brow_Right` | 2 → 1 | 2 |
| `Mouth_seam` + `Nostril_-1` + `Nostril_1` | 3 → 1 | 4 |
| `Pupil_Left` + `Pupil_Right` | 2 → 1 | 2 |

This is a potential **seven-primitive /14-draw reduction**, projecting 46/48 calls if every condition holds. The bun silhouette's two same-material primitives provide a further possible one-primitive /two-draw reduction, but first verify exact material/attribute semantics and morph mapping. These are targets for a proposal, not measured savings or an approved runtime representation. Geometry triangles do not disappear through batching.

Required preservation checks: compatible render flags and attribute formats; canonical transforms; union morph names with zero-filled absent deltas; exact position/normal/UV/index coverage; correct per-name morph weights after merging; vertex/face provenance; independent left/right expressions; exact neutral restoration; no stale original objects visible; identical appearance in matched views. One geometry with one retained group per old mesh still issues multiple draws and does not achieve the target. Do not hide the original shirt/trousers or relabel the envelope as an undressed body to subtract triangles.

## Skin/optics constraints for the incoming handoff

1. **Migrate bindings explicitly.** V4 Head now owns both connected lids and blink morphs; `UpperLid_*`/`LowerLid_*` nodes are removed. Preserve `corrective.height.CHANNEL = body.height × expression.CHANNEL` and `corrective.blinkArcLeft/Right = 4×blink×(1−blink)` by name. The seven changed surfaces and refitted caps need exact geometry/UV/material mapping records, not node-count assumptions. All remaining 20 meshes retain their verified scope.
2. **Separate material cleanup from geometric batching.** Deduplicate equivalent material definitions and unreachable images only after enumerating actual references, appearance variants and ownership. This may reduce retained resources but does not itself reduce draw calls. Report encoded images, dimensions/decoded bytes, reachable versus unused images and actual GPU counters separately.
3. **Do not promise an automatic skin atlas.** Current v4 has no production-clean Head atlas; 2,102 inherited overlap pairs remain. Consolidating per-part skin textures requires a separately reviewed UV/texture migration that preserves the intended variation and normals. Do not stamp old lid maps onto Head, mirror away individual variation, or remove detail to manufacture a resource pass.
4. **Keep optics until their replacement is judged.** A front-sided cap might avoid the extra back-side pass only if geometry orientation, coverage and optical appearance hold from front/profile/three-quarter, through blinks and controls. Removing transmission would change the look and requires an explicit art choice; it is not a silent optimization. `forceSinglePass` affects the separate transparent-double-sided path; it does not remove `renderTransmissionPass`. Resolution reduction can change transmission pixel cost, not the number of opaque submissions.
5. **Keep actual budgets.** No increase to 34,000 preview /3,000 combined wardrobe comparators, no new per-part allowance, no arbitrary body mask. Detailed hair needs a lower-cost version or an explicit reduction elsewhere; under the illustrative 1,200-cap cost it remains 3,118/2,310 triangles over. The existing silhouette sources are available now but do not establish close-up hair realism.

## Gate before one full combined render

Receive the exact skin commit and asset/frame hashes, complete node/material/UV migration, all added geometry counts, texture inventory and affected fit checks. Verify v4 body geometry and unaffected mesh hashes; reject accidental restoration of the removed lids/old eye meshes. Recompute complete counts with one body, one selected hairstyle, one garment and actual caps. Decide which, if any, consolidation proposal has been implemented and validated by its owner; do not execute all experiments merely because they are listed here.

Only then run the existing bounded combined review with measured calls/submitted triangles, consistent views, hairstyle/garment swap and neutral reset, followed by explicit geometry/texture/render-target cleanup. The earlier residual texture counter of one remains unresolved until an actual lifecycle check explains or clears it. A lower draw count does not satisfy realistic anatomy, rig/locomotion, game import or physical-device acceptance.
