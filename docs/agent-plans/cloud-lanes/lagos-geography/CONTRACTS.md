# Lagos geography prototype: inspected contracts

Source baseline: `81d9f599d87dfb34adf49cd9337a0b05678e5e0d`. Coordinator documents read at `6c2885d15d38b9d64501f14d467db9d5c01573b2`. Read-only fetch of main on 2026-10-13 returned the same baseline. Branch: `codex/cloud-lagos-geography-20261013`.

Continued without restarting after reading `FIRST-WAVE.md` at `844da27a549d30c5148c1cb5b5927b7d0f5bfde6`, plus the archived plan's scope, world integration contract, geospatial lane 03, placement lane 17, release safeguards and acceptance gates. Parent's canonical lane is **03**; its actual first-wave ledger confirms this branch and these two prefixes. Proposed directories/budgets do not override the assigned scope or game caps. The full plan is now available; the earlier Library-transfer blocker no longer blocks this lane.

Anthony's delegated scope owns only `experiments/cloud-lanes/lagos-geography/` and this documentation directory. Parent owns integration and further launches. WORLD retains geography and production upload; neighbourhood/scenes retain street/model placement; GRAPHICS retains body fitting; LIVING retains movement/route authority. No launch, runtime integration, deployment or Blender pipeline change is part of this lane.

| Existing source | Observed contract | Consequence |
| --- | --- | --- |
| `src/geo/frame.ts`; re-export `src/map3d/geo/frame.ts` | Spherical equirectangular, radius 6371.0088 km, standard parallel 9°N; x east, z south; 10 units/km; Lagos rounded origin `{-5052,2835}` | Import the pure functions. Subtract the rounded origin, not the exact projection of the nominal anchor |
| `src/game/cities/lagos/map.ts` | `nigeria-equirectangular-v1`, same origin and scale; geometry/scene loaded separately | Read only; no new map pack or runtime imports |
| `src/map3d/geo/projection.ts` | Equal Earth; degrees-like atlas units, y north | Explicitly outside the prototype conversion API |
| `src/map3d/cities/lagos.ts` | Hand-placed venues/homes/roads, approximate to tens or hundreds of metres; `PLACES.cchub=[3.3820,6.5075,...]`, labelled Herbert Macaulay Way, Sabo Yaba | Use this existing game anchor only to name a **proposal**. It does not establish the actual current CcHub site or a surveyed road/parcel |
| `src/street/frame.ts` | City-local map x/z multiplied by `1000/unitsPerKm`; 128 m tiles; floor for tile indices; 100 integer units/m on the wire | These are projected metres, with inherited fixed-parallel distortion; not anchor-latitude ground metres |
| `src/street/renderer.ts`, `src/street/host.ts` | Tile and avatar drawing rebased by tile origin; coordinates used directly; host avatar scale 0.72 | City-street drawing uses projected metre coordinates; do not blindly multiply it by venue avatar scale |
| `src/scene/movement.ts`, `src/scene/body/skinned.ts` | Movement reference 2.45 scene units / 1.75 human metres; body fit `2.45*sceneScale/bodyHeight` | 1.4 is a venue reference scale, not a universal geographic unit conversion. Prototype scene scale must be explicit |
| `src/scene/street/street-plan.ts`, `src/game/neighbourhood-space.ts` | Procedural row frame x along row/z toward road; pitch 12; no true-north orientation | A geographic block cannot be inserted by assuming those axes denote east/south |
| `src/scene/models/scene-models.ts` | Static `Placement` has near/far keys, x/y/z, ry in radians, scale; model anchors are local | Prototype emits a proposal compatible with these scalar fields, but no real asset keys, collider or route authority |

Actual pure calculation at `[3.382,6.5075]`: Lagos map-local `[-19.768571967337266,-63.4626251791924]`. Fixed-parallel east scale / anchor-latitude east scale = `0.9940932547076073`; a 200 local-metre east span becomes `198.81865094152147` street projected metres. This approximately 1.18 m difference must remain explicit. Round-trip numerical precision is not source accuracy.

The proposal is a 200 by 200 local-metre square about that existing approximate game anchor. It is an area of interest for future licensed acquisition, not a confirmed physical block, cadastral edge, street alignment, or chosen final pilot. Geometry fixtures will be original synthetic numbers. No screenshots, maps imagery, remote buildings, DEM, or survey geometry are acquired.

Read development guidance in `CONTRIBUTING.md`, `docs/AGENT-COORDINATION.md` (current concurrency amendment and ownership), and `docs/MAP-GEOMETRY.md`. `docs/AGENTS.md` documents player agents, not developer authority. No root AGENTS.md was present. Keep heavy=1 and heap at most 1536 MiB, use bounded slot-wrapped checks, and avoid the full npm test/pretest asset generators.
