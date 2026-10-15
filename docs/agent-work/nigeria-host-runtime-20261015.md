# Nigeria host runtime integration

- Owner: /root/host_runtime; delegated by integration owner /root.
- Status: active implementation, cloud Linux execution only.
- Checkout: /workspace/joinallworld, branch codex/nigeria-runtime-release-20261015, base/current 60c3dff925fc9a2f5a5d995b1f6ab92997e36f7e.
- Exclusive ownership: src/scene/types.ts, src/scene/venue-scenes.ts, this record. No commit/push authorization within delegated lane.
- Goal: optional dedicated runtime SceneDef integrates lazy PBR scenery while retaining fixed sidecar navigation, game actors/actions/weather/lighting, fallback and disposal.
- Inputs: root owns runtime-module.ts, dedicated scene definitions/registration; asset_contract owns navigation helper. Contract agreed directly with root.
- Bounds: 17k triangles/60 submitted draws whole venue; imported layer 11.5k/20; scale 1.4; near indoors; distance-only far.
- Prior context: read root AGENTS.md, current AGENT-COORDINATION.md, relevant integration work record, AGENT.md and world-alive rules. No overlapping ownership on delegated files in current index; root assigned them explicitly.
- Dirty status at start: root-owned runtime-module.ts/test.ts and root work record. Preserved.
- Resources: no browser/server/compiler; no paid service or credentials.
- Next: implement agreed interface and lifecycle, report root for whole-game verification. No production claim.

## Implementation checkpoint

- Optional SceneDef.runtime and camera bounds implemented; asynchronous owner preserves fixed nav, transformed solids/support, separate fallback scenery/markers, PBR importer lifecycle and status diagnostics.
- Actual imported geometry is transformed into venue-local coordinates for horizontal support indexing; transient CPU geometry is disposed immediately.
- Whole-scene admission and subsequent guards count visible triangle instances/material group/double-sided passes. Ambient allowance reserves imported maximum 11.5k/20 before its base snapshot, preventing fallback-driven over-allocation.
- Client project check completed: no diagnostics in owned client paths. Raw compiler exits 2 on eight unrelated server crypto typings imported transitively; supported repository filtering belongs to root's full typecheck gate. Log /tmp/nigeria-host-client-types.log.
- Existing contact tests pass 3/3 with explicit loadCityScenes('lagos') preload (/tmp/nigeria-host-contact-preload.tap). Their former implicit Lagos readiness assumption is being handled by root after registration of the new lazy scene chunk.
- Actual host browser acceptance is running in separate host_acceptance lane; no publication or release claim. This lane owns no running process.

## Host budget correction

Actual browser host with eight network players correctly tripped whole-scene guard and unloaded the imported layer. Added runtime-only actor admission: retain crowd input, rebuild a bounded visible subset until actual visible cost plus imported maximum 11.5k/20 fits17k/60. Existing player appearance remains untouched. Parent/browser acceptance agent notified to rerun; this is not acceptance evidence yet.

Explicit parametric designs bypass runtime replacement and preserve the existing configurable procedural scene. Latest contact preloaded regression3/3 passes, diff whitespace check clean. No running processes, commits or deployment in this lane.

## Host overhead contract

Added optional SceneEntry.setHostBudget with the remaining triangle/draw allowance after external host geometry. Root injects this in sceneFor before ambient setup; runtime admission, actor trimming, later guards and ambient reservation use the supplied allowance. This avoids describing entry-local counts as whole-renderer certification. Root owns exact ground/background overhead measurement and browser acceptance.

## Actual host acceptance blocker and body audit

Browser lane measured canonical female body9002 + wardrobe1076 + Lagos near7618 =17696 triangles before overhead. Guard correctly rejects; crowd removal alone cannot solve. Late body admission now first retrims network crowd before unloading scenery, permitting cheaper Abuja candidate to be tested.

Read-only body audit: body/gate.ts requires skinned hero for capable devices; stand-in BodyLoader and loadBody have no approved hero LOD setting. createCrowdBodies in body/skinned.ts uses2430 triangle indices only for near crowd; crowd-lod.test.ts enforces its sole consumer. No body source edited, fallback forced, or budget raised. Root advised to request/review a smaller Lagos near asset, or separately authorize and verify a new hero LOD contract; no existing supported hero LOD can be claimed.

Source work ready for root integration review; actual game acceptance remains incomplete and Lagos activation blocked by measured budget incompatibility. No commit, deployment, or owned running process.

## Per-module reservation refinement

At root request, SceneDef.runtime now declares readonly reservation {triangles,drawCalls}. Host validates positive integer caps <=11500/20, then reserves the pinned module maximum in ambient and network crowd admission instead of the generic maximum. Root definitions pin Lagos7618/2 and Abuja4942/8. Actual placement and whole-host guards remain measured and unchanged. This preserves fitting Abuja crowd without weakening acceptance.

Focused contact regressions3/3 pass after change (/tmp/nigeria-host-reservation-contact.tap); diff whitespace clean. Host source frozen at acceptance agent request during its next browser capture. No commit or running process. Parent informed of completion and freeze; acceptance receipt remains outstanding.
