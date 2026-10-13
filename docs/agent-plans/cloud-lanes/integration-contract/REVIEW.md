# First-wave bounded integration review

The four isolated packages have been combined without changing their original bytes or any production source. The coordinator ran 12 new cross-contract tests successfully and sealed one deterministic, hash-addressed planning packet. This is an interface checkpoint for tangible prototype work, not a realistic human, a surveyed Lagos block, or current-game acceptance.

## Immutable handoff

Branch: `codex/cloud-first-wave-integration-20261013`. Production baseline: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. Coordinator planning baseline: `844da27a549d30c5148c1cb5b5927b7d0f5bfde6`. Initial imported checkpoint: `cea28c2c7e5c684cb0ae069176ec83d51a3d3358`, pushed and remote-verified. The final response supplies the eventual final commit; verify it against the remote rather than treating a moving branch name as an immutable input.

| Component | Exact commit | Imported files |
| --- | --- | ---: |
| Source/provenance | `1f89cdd91e8300a341ca65f17030a22f929eb5dd` | 17 |
| Lagos geography | `21b0850a996b4444d2e0c16626771671e191ddcd` | 15 |
| Asset export/portability | `f00b42be76b3ed22f053233f0d82bd559c73810a` | 55 |
| Human design contract | `71d6b5ad391754b0f30fc5364e993208299640ed` | 30 |

Each source commit changes only additions under its assigned documentation/experiment prefixes relative to the baseline. The input index pins all 117 imported files plus 38 read-only baseline dependencies: **155 files, 2,746,358 bytes**, checked against both Git objects and working files. No source package was edited to make the bridge pass.

- [Input index](../../../../experiments/cloud-lanes/integration-contract/input-index.json)
- [Packet lock](../../../../experiments/cloud-lanes/integration-contract/packet-lock.json)
- [Sealed packet](../../../../experiments/cloud-lanes/integration-contract/packets/9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb.json): **14,085 bytes**, SHA-256 `9c15f10e6c82bbf31aa74e9dbcf2c9d3e4aef67ef3789d255c7c2e608623e7cb`
- [Bridge and checks](../../../../experiments/cloud-lanes/integration-contract/bridge.mjs), [test source](../../../../experiments/cloud-lanes/integration-contract/bridge.test.mjs), [sealer](../../../../experiments/cloud-lanes/integration-contract/seal.mjs)

The packet records schema versions, source SHAs, original beacon assets and three authored placements, human preset serialization hashes, explicit units/axes, uncertainty, and unpassed acceptance gates. It also hashes the four coordinator executable sources. `seal.mjs --write` refuses to overwrite a lock; `--check` reconstructs and compares the complete deterministic bytes. A future change requires a separately reviewed packet version. `validatePlanningPacket` provides focused semantic guards; it is not a general-purpose validator for arbitrary untrusted manifests. Exact input hashes and complete regeneration are the authority for this packet.

## Adopted Yaba planning assumption

Parent authorized adopting the geography lane's proposed 200 × 200 m area as a reversible planning assumption. Pilot ID: `yaba-game-anchor-200m-planning-v1`; centre longitude **3.382**, latitude **6.5075**, inherited from the repository's approximate `PLACES.cchub` game anchor. The local square spans east/north −100 to +100 metres. Its full generated geographic ring is in the packet; approximate west/east bounds are 3.38109485/3.38290515 and south/north 6.50660068/6.50839932.

This adopts a prototype working area, not an actual parcel, survey, site location or road alignment. All new footprint/height/elevation/layout choices remain **authored-synthetic** until separately evidenced. Horizontal and vertical real-world error bounds are `null`, and local zero height has no verified real vertical datum. Replacing this assumption later must version the area/placements and state the change.

Default local-to-scene contract is one scene unit/metre, yaw zero, translation zero, Y up, with the geography adapter resolving north and heading conventions. It is explicit, not a claim that every existing game scene has this scale. The bridge also checks a rotated, translated 1.4-unit/metre scene. At this anchor 200 local east metres become approximately **198.81865094 projected street metres** through the existing city/street frame: scale **0.9940932547076073**. Directly substituting local coordinates for projected coordinates is invalid. Static assets have +Z forward and a ground pivot; geospatial headings must use the adapter, including its heading-zero rotation.

## Interface findings and acceptance checklist

| Interface | Verified now | Still required for adoption |
| --- | --- | --- |
| Source registry → pilot | Fixture packet validates; all original registry/schema/receipt bytes pinned | `eligibleForProduction=false`. No external real-world source has been admitted. Beacon's original-source declaration is separate from the registry's `original-synthetic` fixture identity; one cannot confer admission on the other |
| Export → geography | Four actual raw/Meshopt near/far GLBs decoded through installed Three.js. One metre height, anchors, 332/108 triangles and placement transforms pass | Replace three demonstration beacons with accepted art and manifests. No real roads/buildings are inferred from the beacon |
| Export → static runtime seam | Actual baseline `createGltfSource` retains geometry counts but omits roughness/metalness fields; raw GLTFLoader keeps them within the existing 1e-6 material tolerance | Runtime owner must choose/review a material-preserving route or an explicit loss policy before PBR art acceptance. Skinned humans/morphs must never use this static flattening route |
| Human save → controls/expressions | Seven fictional v2 parameter presets; 38 scalar controls and 16 expression channels. Ear/nose identity edits serialize while retaining expression and legacy wardrobe data | Actual geometry, shape targets, rig/skin binding, compatible clips, LODs, hair/clothing fitting, UI/persistence, and game integration. Parameter presets are not rendered human presets |
| Existing human → new family | Both shipped bodies have 23 joints but different vertex counts and no morph targets; pinned lane audit records this | No shared vertex-index, jaw/eye-bone or retarget compatibility assumption. Freeze a distinct original prototype family and reconcile character ownership before any replacement/shared runtime work |
| Placement → walking | Explicit placement frames, real asset paths and `routeAuthorized=false` throughout | WORLD/LIVING-approved colliders, nav/walk-grid/boarding integration. Drawn surfaces do not grant movement authority |
| Combined pilot → realism/performance | Only isolated geometry/serialization/contract evidence | One convincing legally sourced real block plus one expressive modular human in actual gameplay, original editable sources, six-plus rendered presets, loading/fallback/disposal, and named device evidence |

Google imagery/3D tiles were not used by this review. The prohibition on extracting/tracing them into redistributed geometry, materials, collisions or navigation remains. No external license research or new source admission occurred here; an original authored prototype is not labelled a faithful reconstruction of Lagos.

## Observed checks and limits

Executed here on Node 24.19.0 / Python 3.12.14:

1. [Cross-contract smoke](receipts/cross-smoke.txt): **12 passed**, zero failed/skipped, Node duration **293.304089 ms**. Heavy slot 1, 256 MiB Node heap, 60-second timeout. Checks cover committed input identity/tamper, actual GLB decode/static seam/placement, deterministic output, coordinate separation, human save semantics and rejection of unsupported admission claims.
2. [Input check](receipts/input-check.txt): all 155 inputs match the four source commits/baseline byte for byte.
3. [Seal creation](receipts/seal-write.json) and independent [seal check](receipts/seal-check.json): same 14,085-byte packet/hash. Each bounded by heavy slot 1, 256 MiB heap and 30-second timeout.
4. Export lane packet verifier passed 28 input/7 output pins; source lane validator returned `ok=true`, `eligibleForProduction=false`. Those were observed during import; the 155-file verification now encompasses their retained files.

The lane-reported 49 source, 17 geography, 20 export (18 Node + 2 Python), and 15 human tests are imported evidence, **not rerun or claimed as coordinator executions**. The earlier coordinator's 45 focused tests passed; its full serial typecheck exhausted the 1,536 MiB heap cap and remains unresolved. Nothing in this review turns that into a full build/test pass.

Two initial attempts are retained honestly. [Initial smoke](receipts/cross-smoke-initial.txt) failed during module initialization before its 12 subtests loaded (Node reports one failed file), on strict equality for Meshopt's float representation of roughness (`0.36000001430511475` vs `0.36`); the bridge now uses the export fixture's already declared `1e-6` material tolerance. [Wrapper attempt](receipts/cross-smoke-wrapper-rejected.txt) rejected an integration receipt path because the export lane's supervisor only permits its own directory. No tests ran in that attempt; the final direct command retained the repository heavy slot, timeout and smaller Node heap. No peak-RSS measurement is claimed.

Coordinator visually inspected the pinned export six-view PNG and human topology diagram. The PNG shows the meter fixture in raw, Meshopt and static-adapter columns; the human drawing is a diagram only. Neither is new coordinator rendering, anatomy evidence or current-game/physical-device evidence. No server, browser or Blender process was launched in this integration review; final slots are free. No production, shared dependency, CI/deploy, paid service, credentials or main mutation occurred. The imported human `definitions.mjs` contains a pre-existing blank line at EOF reported by whitespace checking; it was preserved to retain exact upstream bytes. New coordinator files pass scoped whitespace checking.

## Ownership and next decision

Parent owns launches and further integration. WORLD retains releases, GRAPHICS body/material/wardrobe integration, and LIVING movement authority. Task `01a13520-8d89-70f1-a722-786459524996` remains unknown after the parent-reported lookup failure; this is not abandonment or permission to replace it. The original Blender background/mobile production continues separately.

Priority update received during final review: parent resumed the **same human-design-contract task `01a13667-6b47-7763-b71a-7d06139ed03f`** to build original tangible Blender human geometry, first nose/ears/body controls and expressions with renders/turntable, in its existing exclusive prefixes and branch. That task can proceed independently; unknown existing production-character ownership does not block this separate original prototype. Do not create a duplicate base/face/expression lane. This packet remains pinned to its earlier contract-only commit `71d6b5ad...`; no claim about unseen newer geometry is made. Review its next immutable art checkpoint separately without overwriting this packet.

Use [NEXT-WAVE.md](NEXT-WAVE.md) for six complementary tangible assignments: skin/eyes, hair, wardrobe, ground/street, buildings, and props/vegetation. Parent selects capacity; dependent fit checks consume the existing human task's exact mesh checkpoint. These are recommendations, not workers launched by this coordinator. Keep the 20-lane researched plan as the wider map; expansion toward 100 waits on proven assets and the actual-game pilot.
