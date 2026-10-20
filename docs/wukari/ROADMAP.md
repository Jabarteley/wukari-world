# Roadmap and gates

Phase 2 has completed real Wukari LGA acquisition/provenance and administrative rendering. The FUW data gate remains blocked, so campus walking/buildings/navigation and town expansion are not marked complete. Current actions and acceptance gaps are in [PHASE2_CAMPUS_STATUS.md](PHASE2_CAMPUS_STATUS.md); the original milestone gates below remain in force.

## Milestone 1 — geographic ingestion foundation (this branch)

Delivered: codebase/licence audit, source pins, separate extent states, checksum-gated offline importer, OSM identity/precision retention, local metre projection, tests and a development-only Vue/Three.js linework lab. Synthetic preview rendering is verified. Actual Wukari geometry remains blocked by source access. No city registration, avatar spawn or completed campus/town map is claimed.

## Milestone 2 — verified campus data

**Next executable task:** after the environment’s geographic domain settings take effect, retrieve the pinned geoBoundaries ADM2 payload and run `data/wukari/discover-fuw.overpassql`. Confirm exactly one source Wukari LGA feature and identify FUW candidates; record source URLs, retrieval times, exact response/query hashes and identities. See [GEOGRAPHY.md](GEOGRAPHY.md) for the importer command.

Then acquire a bounded campus study extract from the mapped extent, corroborate campus/gates/public access with institution information and suitable ground evidence. Preserve unknowns. If campus is a relation, implement/test multipolygon ring assembly with holes before treating it as an extent. If the dataset lacks a campus polygon, keep its status unknown rather than drawing a convenient rectangle. Do not interpret the whole LGA as the town.

Acceptance: reviewed Wukari ADM2 feature and coverage report; reviewed campus candidate/source limitations; real-file import with all integrity checks; coordinate roundtrips on recorded vertices; IDs and WGS84 retained; visible correct attribution; unresolved features explicitly identified. This is a source-data inspection milestone, still not a completed playable city.

## Milestone 3 — campus walking vertical slice

Choose a verified public spawn point and a sourced path corridor. Bridge local metres to the existing scene/movement host. Add deterministic walkability/collision from reviewed footprints/access, tests for gates/obstacles and server-authoritative multiplayer movement. Use original approximate building art only with conspicuous dimensional uncertainty; do not fabricate geography to satisfy gameplay. Test two guests, reconnect, save/reload and isolation from Lagos/other cities. Publish no private residential/sensitive detail.

## Milestone 4 — town connections

Define the town’s sourced boundary or an explicitly non-legal study/built-up area. Obtain a suitable licensed extract for larger coverage. Add real campus-to-town corridors, streamed tiles, batched geometry/LOD and bounded visibility/collision. Measure browser frame time, memory, network and loading budgets on a representative phone. No invented transit stops, working businesses or transport claims.

## Milestone 5 — playable city and release

Only after the researched `CitySpec` can meet mandatory venue, civic, housing, careers, scene and geography contracts, generate an isolated Wukari city module. Keep unfinished features unavailable rather than fictitiously sourced. Pass generator `--check`, registry-driven city/geometry/reload/never-stuck checks, server/multiplayer tests and production size/smoke checks. Preserve existing cities/save compatibility and do not raise budgets to make checks pass.

Review OSM/geoBoundaries obligations, branding, privacy/moderation, public access, exact corresponding-source publication and deployment readiness. Resolve or explicitly review upstream baseline test failures. The owner reviews a feature-branch diff/PR; no merge to main or deployment is authorized by this milestone.
