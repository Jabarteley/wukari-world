# Cloud production interface and pilot acceptance checklist

Proposal against `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`, 13 October 2026. This checklist records requirements, not completed pilot acceptance. It must be reconciled with the parent's full production plan before launch. See [COORDINATOR.md](COORDINATOR.md) for executed setup evidence and blockers.

## Ownership and launch gate

- [ ] Parent plan version 0 is available and has been fully read; changed versions are explicitly reconciled.
- [ ] Parent assigns each specialist a unique branch and exact owned paths, including a unique owner for every `.blend` and every shared manifest.
- [ ] Existing character task `01a13520-8d89-70f1-a722-786459524996`, GRAPHICS, WORLD and LIVING claims are reconciled. Nothing is stopped or declared obsolete by this plan.
- [ ] Original Blender background/mobile production continues independently. Its 330+ reported bases are not counted as proof of the new realism target.
- [ ] Parent names the runtime integrator and independent acceptance reviewer. No source or asset promotion changes WORLD's release authority.

## Candidate delivery packet

For every block, building, road, terrain, human part, rig, clip, garment, hair module, texture and exported tier, require these fields in a versioned sidecar. These are proposed field groups; no new production schema is created here.

| Field group | Required facts |
| --- | --- |
| Identity | Stable asset/feature ID; kind; schema version; owning lane; branch/base commit; packet version; immutable dependency IDs/hashes |
| Provenance | Original author; source page/download URL; license identifier and retained text; permission/attribution record; acquisition date; source hash; derivative operations and operator |
| Geography | Named Lagos block; bounded footprint; source CRS; `[longitude, latitude]` order; altitude convention; survey/estimate/fiction labels; geographic/local/scene transforms and inverse |
| Geometry | Units; up/forward axes; origin and ground pivot; dimensions/AABB; transform application; topology/material/UV/normal facts; near/far relationship |
| Attachments | Named doors, seats, lights, hands/head/hair/garment sockets; local transforms; bounds; collision/support and interaction roles |
| Human | Skeleton ID/version, bone names/hierarchy, rest/bind matrices, weight limits, topology IDs, morph/part IDs/ranges, expression channels, required clips |
| Runtime | Exact intended consumer API; lazy-loading/fallback policy; cache keys; geometry/material/texture ownership; idempotent cleanup; error behavior |
| Costs | Raw/gzip/Brotli bytes; texture resolutions/formats; vertices/triangles; material/call counts; actual whole-scene costs; measurements identified as CPU, software WebGL, hardware or phone |
| Evidence | Editable `.blend`; export command/tool versions; GLB and source hashes; validation result; exact screenshots/video/test receipt; unresolved issues and acceptance owner |

## Source and geography acceptance

- [ ] Select exactly one real Lagos block and a bounded pedestrian journey before mass acquisition or modelling.
- [ ] Verify rights for the particular input, including derived geometry, textures and redistributable game outputs. Library/tool code licenses do not grant asset or motion rights.
- [ ] Never extract or trace Google Maps imagery or 3D tiles into redistributable assets. No such source is used by this setup pass.
- [ ] Missing provenance blocks promotion. Licensed open data, original photography/survey and original modelling still require per-input records; do not presume a whole source family is approved.
- [ ] Distinguish observed geometry from estimated building height, inferred facade, authored support, or fictional detail in both packet and acceptance evidence.
- [ ] Keep atlas Equal Earth coordinates, Lagos `nigeria-equirectangular-v1` city coordinates (10 units/km), block local metres, and neighbourhood scene units distinct. Record the complete transform chain and numerical round-trip checks at several landmarks.
- [ ] Road width, kerbs, gutters, elevation, crossings, entrances and building footprints line up visibly and numerically; tile borders have no unexplained gaps/overlaps. Compare against authorized references.
- [ ] Colliders and walk/support surfaces match the rendered block and declared tolerances. A road mesh, map outline or foot sample alone cannot authorize a route.

## Blender and static model interface

- [ ] Editable source includes organized objects/collections, named materials, retained attachments, source metadata and a reproducible export recipe.
- [ ] One owner edits each blend. Lanes exchange linked/versioned source modules or immutable exports; they never independently modify the same binary.
- [ ] Export with declared units/axes and validated scale, transforms, normals, UVs, bounds and pivots; account explicitly for Blender-to-glTF conversion.
- [ ] Near/far variants retain asset identity, world size, ground pivot, door/seat anchor positions, collision footprint and recognizable silhouette. Background/mobile quality is evaluated separately from near realism.
- [ ] `ModelData` supplies parts and named local anchors; `Placement` specifies near/far keys, x/y/z, yaw, scale, priority, optional labels and merge/instance mode.
- [ ] `createGltfSource` node-transform baking, normalized attributes, atlas transforms, atlas reuse and instance handling preserve the intended output. Do not flatten skeletal humans through this static scenery path.
- [ ] Stand-ins remain usable on gated devices, during loading and on failed fetch. Model swaps do not move entrances or break walkability.
- [ ] Choose and verify a Linux-compatible export/texture/compression path. Existing `scripts/body/build-body.ts` depends on macOS `sips` and an offline gltfpack cache; the cloud setup has not repaired or run it.
- [ ] Use the intended validator on the actual exported bytes. Blender's successful uncompressed cube export does not certify Draco, Meshopt, human rigging or a production pipeline.

## Modular human interface

- [ ] Show a convincing full human at the current game's camera distances and a useful close-up. Require reviewed front/side/back/three-quarter views in neutral game lighting, not only a flattering standalone render.
- [ ] Ear and nose options visibly change the requested anatomy. Include eye/eyelid, mouth/lip, jaw/face and head proportions with stable IDs and limits; avoid nominal options that only recolour an unchanged shape.
- [ ] Height, torso/limb proportions, shoulder/hip/build changes remain coherent with skeleton, feet, seats and garment fit. Preserve identity while switching pose or distance tier.
- [ ] Saved customisation extends existing `Look`/`AvatarAppearance` deliberately. Current categorical height/build/age, face and expression contracts do not store independent nose/ear controls. One owner implements additive normalization, server sanitization, persistence and backwards defaults if needed.
- [ ] Keep `normalizeLook` deterministic and preserve existing saves, appearance, wearables and ownership. Validate reload and rejection of unknown/out-of-range values.
- [ ] Declare whether the new asset follows the existing 23-bone rig or uses an explicit tested retarget map. Preserve binding, joint names, vertex weights and clip compatibility; no hidden rig substitution.
- [ ] Neutral, smile/grin and planned additional expressions are readable; blink/eye closure, mouth/jaw movement and combinations do not fold into the head or expose unintended holes. Keep neutral restoration deterministic.
- [ ] Hair fits the scalp across selected heads, shows eyes/ears appropriately, retains silhouette and avoids obvious intersections. Clothing/accessories respect body masks, slots and proportion/pose extremes.
- [ ] Implement or adapt the existing `SkinnedBody` placement, fit/wear, pose, stride, step/settle, seat/use anchors, contacts and disposal interface. Runtime integration goes through the existing character owner.
- [ ] Both skinned and procedural fallback paths remain supported. `src/models/people` workshop and `src/scene/characters`/body paths must not silently diverge into competing player identities.

## Motion, contact and lifecycle

- [ ] The host supplies time and requests frames. Static poses settle; no asset introduces its own perpetual RAF loop or interval.
- [ ] Walk/jog/stairs phase is tied to traveled distance as required by the existing host. Start/stop, turns, transitions, emotes and interruption are exercised in the intended scene.
- [ ] Animation checkpoint restore happens before successive clip sampling/contact correction, with no accumulating bone/root offsets.
- [ ] Test both relevant body variants, minimum/default/maximum supported proportions and affected wardrobes at rest, walk, reach, sit and recover. Define tolerances for foot slip, penetration, seam opening and garment intersection before reviewing results.
- [ ] Ground/kerb/stair contacts use the intended support frame. Stand-in and production geometry are checked, including parent transforms and scaled actors.
- [ ] Sampled foot/actor geometry is not swept collision or boarding proof. Doorway/seat/vehicle transitions remain under LIVING's accepted authority contract.
- [ ] Lazy load, abort/failure, swap, rebuild and dispose release owned geometry/material/texture resources without releasing another actor's shared cache or materials.

## Combined current-game pilot gate

- [ ] Pin the current integration commit plus the exact block/human/export manifests. A workshop or motion preview alone is insufficient.
- [ ] Enter the Lagos block through the normal game flow; identify real entrances/roads/buildings against licensed references. Walk the bounded journey with the custom human in the same scene.
- [ ] Demonstrate facial parts, proportions, expressions, hair and clothing changes on the character; verify persistence/reload, movement and scene transitions.
- [ ] Capture independently reviewed stills and continuous motion with actual loader, lights, camera, controls, collision and runtime state. Keep failed captures/results and exact source pins.
- [ ] Exercise keyboard and touch, slow/cold loading, reduced-motion/data/device gates and fallback. Confirm no broken controls, API authority changes or saved-state regressions.
- [ ] Measure actual visible triangles/calls, request/download bytes, texture use, idle/moving frame behavior, input latency and repeated load/dispose stability on a named hardware target. Software SwiftShader results are labeled separately.
- [ ] Reconcile the current vs provisional budgets in `src/budgets.ts`. The existing 300,000-byte base-body and 60,000-byte street-tile Brotli limits, 25,000 street-tile triangles and 60 phone-scene calls are marked provisional; this plan does not promote or increase them.
- [ ] Resolve the full compiler failure at the preserved heap cap through an owner-approved bounded plan. Run relevant compiler/tests/build/download checks on the exact integration candidate; setup's 45 focused passes are not release verification.
- [ ] A named physical-phone pass and owner visual acceptance support the intended mobile tier. No mass-production claim from asset counts, numerical proxies, standalone renders, or smoke tests.
- [ ] Parent signs off the integrated pilot before scaling production; WORLD separately controls any later release. This coordinator phase includes no deployment.
