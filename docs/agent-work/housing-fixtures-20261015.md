# Housing studio fixture data

## Identity

- **Work ID:** `housing-fixtures-20261015`
- **Owner:** `/root/integration_seams`
- **Model / effort:** `gpt-6.1-sol / high`
- **Thread:** parent `/root`
- **UTC updated:** `2026-10-15T15:01:03Z`
- **Status:** `handoff-with-known-failure`
- **Work state:** `parent-assuming-door-ownership`

## Goal and boundaries

- **Goal:** provide four furnished housing-studio recipes and a bounded exterior HostScene adapter that reuse the game's existing house-plan, furniture-placement, shell and navigation contracts.
- **In scope:** fixture data and tests, exterior adapter and tests, host-level interior acceptance, internal-door adapter and tests, and this work record.
- **Out of scope:** shared runtime, home scene, first-person controls, navigation authority, save schema, existing tests, browser work, builds, commits and deployment.
- **Exclusive file ownership:** `src/housing-studio/fixtures.ts`, `src/housing-studio/fixtures.test.ts`, `src/housing-studio/exterior.ts`, `src/housing-studio/exterior.test.ts`, `src/housing-studio/interior.test.ts`, `src/housing-studio/doors.ts`, `src/housing-studio/doors.test.ts`, `docs/agent-work/housing-fixtures-20261015.md`.
- **Input contract:** `plotOf`, `planOf`, `PlacedItem`, `FURNITURE`, `checkPlacement`, `planRule`, `createWalkGrid` at `bc113b55a135c7a37592d264764407627263aafc`.
- **Output contract:** `HousingRecipe`, ordered `RECIPES`, `recipePlot`, `recipePlan`, `buildHousingExterior`, and focused validation evidence.
- **Dependencies:** parent work `housing-studio-20261015` owns all other `src/housing-studio/` paths and integration.

## Repository state

- **Repo:** JoinAllworld.
- **Host:** Anthony Mac local executor.
- **Branch / worktree:** `codex/housing-studio-20261015` at the managed housing worktree.
- **Base:** `bc113b55a135c7a37592d264764407627263aafc`.
- **Current commit:** `bc113b55a135c7a37592d264764407627263aafc`.
- **Dirty status:** parent-owned untracked `docs/agent-work/housing-studio-20261015.md`; this record is the only added owned file before fixture implementation.
- **Port/process ownership:** none.

## Progress

### Done and exact evidence

- Read root coordination and parent housing record; confirmed disjoint fixture ownership.
- Inspected the existing house-plan, placement, furniture and persisted-item contracts at the pinned source revision.
- Added ordered grid-12 Lagos duplex, grid-8 and grid-10 Lagos apartments, and grid-14 Abuja mansion recipes using catalogue furniture ids and the existing optional-floor save contract.
- Corrected the grid-10 fixture copy to two bedrooms and the Abuja copy to one upper bedroom floor plus its ground-floor BQ and roof terrace.
- Added `buildHousingExterior`: a closed exterior shell in a paved, planted and gated compound, with a simple flat entry for Lagos homes and a restrained cantilever for the Abuja mansion. It delegates walking to `createWalkGrid` and exposes the existing HostScene home-door contract.
- `node --experimental-strip-types --test src/housing-studio/fixtures.test.ts src/housing-studio/exterior.test.ts` — 5 passed, 0 failed. This proves sequential `checkPlacement` and direct `planRule` acceptance, omitted-floor ground fixtures round-trip through `fitInto`, room/stair routes, blocked house/boundary footprints, routes from every courtyard entrance to its house door, door completion and idempotent geometry cleanup.
- Added a host-level test of the real `buildHousingInterior` wrapper. `node --experimental-strip-types --test src/housing-studio/interior.test.ts` — 1 passed, 0 failed. It proves the inherited Home contract, recipe immutability, old-static suppression, camera-relative third-person facades, complete first-person enclosure, current-floor-only furnishings, furniture/wall collision, routes into every room, monotonic ascent and descent through the Home stair solver, and complete teardown.
- Direct visible-geometry probe of the duplex fallback path: third person 5,860 triangles / 29 meshes; first person 7,624 triangles / 36 meshes. Both are below the 15,000 scenery allowance. Browser acceptance separately established 16 loaded GLBs; Node intentionally exercises the procedural fallback because its loader cannot fetch bundled file URLs.
- Added `buildHousingDoors`, deriving stable labelled door records and single hinged leaves from privacy-room openings cut into adjacent room boundaries by `wallsOf`. Redundant privacy gaps receive a full-height wall split into a persistent 0.85 m overview section and a cullable upper section; social gaps remain passages. Doors start open, interact within two world units, refuse to close through the avatar, expose current-floor visibility and closed-door solids, and cache a walk-grid projection by base grid, floor and closed-door state.
- `node --experimental-strip-types --test src/housing-studio/doors.test.ts` — 2 passed, 0 failed. This proves the open state returns the exact Home grid, the close guard, safe nearby interaction, preservation of every base occupied cell, closed cross-room path rejection, cached projections, exact base-grid restoration on reopen, current-floor visibility, recipe immutability and idempotent geometry cleanup.
- Focused stubbed TypeScript for `doors.ts` and `doors.test.ts` and their `git diff --check` both exited 0 after one strict initialization correction.
- Extended the real-wrapper interior acceptance over the parent-integrated stable grid delegate. The test holds one `home.walk.grid` reference, observes a known doorway become blocked and clear across close/reopen, closes an upper-floor door without affecting the active ground grid, then observes that same reference reproject the upper blocker after ascent and the reopened ground layer after descent. Recipe placements remain unchanged.
- `node --experimental-strip-types --test src/housing-studio/interior.test.ts` — 1 passed, 0 failed after integration; focused stubbed TypeScript and `git diff --check` exited 0.
- Focused TypeScript compilation with data stubs — exit 0:
  `ALLWORLD_TYPECHECK_DATA_STUBS=1 node --experimental-strip-types --import ./scripts/typecheck-data-stubs.ts ./node_modules/typescript/bin/tsc --ignoreConfig --noEmit --skipLibCheck --moduleResolution bundler --module preserve --target es2023 --allowImportingTsExtensions --types node,vite/client src/housing-studio/fixtures.ts src/housing-studio/fixtures.test.ts src/housing-studio/exterior.ts src/housing-studio/exterior.test.ts`.
- `git diff --check -- src/housing-studio/fixtures.ts src/housing-studio/fixtures.test.ts src/housing-studio/exterior.ts src/housing-studio/exterior.test.ts docs/agent-work/housing-fixtures-20261015.md` — exit 0.

### In progress / blockers

- Frozen handoff counts are Lagos duplex 10 rooms / 4 doors / 4 sealed privacy gaps; Lagos two-room apartment 3 / 2 / 1; Lagos two-bedroom apartment 6 / 4 / 3; Abuja mansion 12 / 5 / 4.
- Focused TypeScript exits 0 and two of three door tests pass. The furnished reachability case still fails for `abuja-mansion/floor 1/Master bedroom`; parent requested immediate source freeze and assumed ownership before a second selection correction.

### Immediate resume steps

1. Parent must adjust the Abuja upper-floor retained privacy-edge selection so the stair landing still reaches the master bedroom after redundant gaps are sealed.
2. Rerun `node --experimental-strip-types --test src/housing-studio/doors.test.ts`, then parent build/browser acceptance and commit.

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested`
- **Release gate:** parent review and commit after focused tests pass.
- **References:** `docs/agent-work/housing-studio-20261015.md`, `src/game/home-layout.ts`, `src/game/home-plan.ts`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T13:39:50Z | active | Registered disjoint fixture ownership at pinned base. | Worktree status and source contract inspection. | Implement recipe fixtures and focused validation. |
| 2026-10-15T13:42:37Z | ready-for-integration | Four furnished recipes and focused contract proofs complete. | 3 focused tests passed; focused TypeScript and diff checks exited 0. | Parent review, visual acceptance and commit. |
| 2026-10-15T13:43:30Z | active | Accepted disjoint ownership of exterior adapter and test; corrected fixture copy for the grid-10 two-bedroom apartment and Abuja floor description. | Parent shell and HostScene contracts inspected. | Implement exterior and focused proofs. |
| 2026-10-15T13:46:53Z | ready-for-integration | Exterior HostScene and its navigation, door and cleanup proofs complete. | 5 focused tests passed; focused TypeScript and diff checks exited 0. | Parent integration and browser acceptance. |
| 2026-10-15T13:53:00Z | active | Accepted disjoint ownership of host-level interior acceptance test. | Parent interior, shell and Home movement contracts inspected. | Add and run real-wrapper acceptance cases. |
| 2026-10-15T13:57:00Z | ready-for-integration | Real interior wrapper acceptance complete. | 1 host-level test passed; focused TypeScript and diff checks exited 0; visible duplex fallback stayed at 5,860/7,624 triangles. | Parent integration review and commit. |
| 2026-10-15T14:00:00Z | active | Accepted disjoint ownership of internal-door adapter and focused tests. | Existing plan, wall-gap and walk-grid contracts. | Implement door derivation, interaction and grid projection. |
| 2026-10-15T14:01:33Z | ready-for-integration | Internal-door geometry, interaction, collision projection and focused tests complete. | 2 tests passed; focused TypeScript and diff checks exited 0. | Parent integration and browser acceptance. |
| 2026-10-15T14:06:00Z | active | Accepted bounded wrapper-grid acceptance after parent integrated internal doors. | Parent `interior.ts` stable delegate and existing real-wrapper test. | Add door and floor reprojection assertions. |
| 2026-10-15T14:10:49Z | ready-for-integration | Stable wrapper-grid close, reopen and floor reprojection acceptance complete. | Real-wrapper test, focused TypeScript and diff checks exited 0. | Parent browser acceptance and commit. |
| 2026-10-15T14:25:00Z | active | User requested fewer internal doors; accepted disjoint ownership of door source/tests only. | Current `5d932f12`; latest parent and coordination records read. | Select and verify one privacy entrance per private room. |
| 2026-10-15T15:01:03Z | handoff-with-known-failure | Reduced doors to privacy boundaries, sealed redundant gaps, added interaction labels and preserved overview low walls. Parent requested immediate source freeze and assumed door ownership. | Focused TypeScript passed; focused tests 2/3 passed. Abuja upper master furnished route remains disconnected. | Parent corrects Abuja retained edge, reruns focused test, then build/browser gates. |
