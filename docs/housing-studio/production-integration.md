# Actual Home integration

The production candidate enhances the existing saved Home. It does not install studio fixture layouts into a player save. The standalone preview remains a separate review tool.

## Ownership

Housing owns the additive production adapter and the agreed canonical Home render-hook hunks in its isolated worktree. The first-person owner released those hunks for review. The integration owner owns the production lazy loader, shared camera refresh, canonical main, hosted checks and deployment. Current release QA remains separate until its cleanup finishes.

## Preservation contract

- Build canonical Home with its original options. Visitor, story, rented, starter, unsupported and constrained-device cases retain the original renderer.
- Supported owned housing derives plan, items and style from authoritative current state. No `createLife`, fixture persistence, inventory grants or save schema changes.
- Keep Home movement, stairs, avatar, guest presence, furniture actions, Buy selection/ghost/floor handling, achievements, mementos and native TV screens.
- Preserve the plinth render callback that binds the camera, click picking and body startup. Replaced geometry retains the canonical interaction projection.
- Switch atomically to canonical visuals during customization or if enrichment cannot fit the fixed render budget. Async loads must ignore disposed generations.
- Keep the existing neighbourhood and its neighbour/street gates. The existing home-door command remains the sole travel authority.
- Door solids have stable array identity until the geometry, floor or door state changes; the existing frame notification requests redraw. Shared camera refresh is owned by the integration lane.

## Acceptance matrix

| Journey | Required evidence | State |
| --- | --- | --- |
| Supported owned home uses saved item IDs and layout | Real canonical versus adapter contracts | Pending |
| Bought/moved/stored furniture and house style update | Saved state unchanged except authorized game command | Pending |
| Buy mode selection, ghost and floor | Existing controls and click targets preserved | Pending |
| Furniture action and native television | Same canonical event/target/screen contracts | Pending |
| Achievement/memento display and customized avatar | Retained visible batches and player lifecycle | Pending |
| Door open/close, blocked leaf, stairs, exterior return | Actual game browser journey in FP and TP | Pending |
| Visitor/story/rental/starter/unsupported cases | Original canonical behavior | Pending |
| Constrained device or dense/invalid layout | Canonical fallback, no partial geometry | Pending |
| Production budgets and hosted source | Existing unchanged gates on integrated candidate | Pending |
| Ready game link and refresh | Deployed artifact and actual journey verified | Pending |

The local studio acceptance in verification.md does not prove any pending production row above.

## Local component checkpoint

The candidate now exports `buildProductionHomeScene` from `src/housing-studio/production.ts`, using canonical `buildHomeScene` without a visit projection for the player. The integration owner still needs to wire that export in the existing lazy loader. Supported owned tiers derive their grid from `HOUSE_TIERS`; the four source fixture layouts are used only in tests. Saved wall style drives the new shell colour. Visitors, running authored scenes, rented/starter homes, other cities and constrained devices retain canonical Home.

All 27 housing and Home-lighting checks pass in about 2.08 seconds after merging current main (candidate merge `0c921da4`). Scoped TypeScript also passes. A separate disposable full-game server on localhost:4441 has a real open-dev owned bq save with 13 original items; the adapter accepts that saved layout without door-clearance failures. The production lazy loader remains unwired there. The preservation checks bind the real plinth render callback, raycast a saved sofa, emit the canonical pick event, change a saved layout, exercise Buy ghosts on another floor, retain achievement/memento tags, and compare canonical fallback geometry. Actual GLTFLoader/Meshopt model mounting succeeds for all four owned fixture-shaped saves. These are component checks, not full-game browser acceptance.

The production-only template compactor preserves positions, normals, transforms, base/vertex colours, material side and per-vertex roughness while combining static primitives into one draw. Its roughness shader composes after the existing ghost patch. Textures, transparency, emissive colour, metalness and unsupported animated features reject; a load/compatibility failure restores canonical Home. The production budget check reserves 16 draw calls for the existing player/guests/action props and three for the host, within the unchanged 60-call cap, and checks scenery against 15,000 triangles. Actual loaded model checks cover all floors. Whole-game builds, renderer counters and WebGL shader/visual acceptance remain required.

## Routing proposal requiring integration-owner review

Canonical `WalkGrid.path` deliberately returns a partial path when the goal cannot be reached. That is useful for ordinary walking, but the Home scripted stair/action route treats remaining waypoints as hops. With new closed doors, blindly keeping those waypoints can cross a barrier. The default-identity navigation projection now checks that projected routes actually reach the nearest goal, and stops producing partial stair routes when they fail. When an owned enhanced scene cannot reach a furniture action, its avatar waits standing at its current location; the server action and timer are unchanged. Opening the door allows the existing approach presentation to resume. This view-only behavior is an explicit product tradeoff for the integration owner to review, not a server action cancellation or completed production acceptance.

Home adds `homeDoor.blocked: true` when the full initial approach, stair approach or same-floor exit route cannot be completed. The integration owner must consume this blocked request as handled (`true`) with feedback and no traversal or command. Returning `false` from `walkHomeDoor` is unsafe: HomeChip and NeighbourhoodPanel then fall back to the authoritative home-door command. Canonical homes retain the original field shape and route behavior. The shared TP camera also needs to refresh static occluders when the cached `walk.solids` identity changes. Those shared host changes are not owned by the housing lane.

The first-person owner released these specific Home render/navigation hook hunks for an isolated proposal; that ownership release is not acceptance of the route behavior or deployment. Keep all source out of the ongoing Phase 6 release/cleanup until the integration owner creates a separate combined candidate.

Final scoped TypeScript (`scripts/housing/tsconfig.json`) passes with exit 0; cached diff checks pass. The production loader is not wired by this source checkpoint. No full-game build, hosted CI, actual WebGL material compile or deployed acceptance is implied.

## Review corrections

Astra source review identified two P1 issues, corrected in the adapter lane: final draw estimates now count compact model and procedural furnishing calls as well as retained/fallback geometry; blocked exit detection now includes the initial approach and same-floor exit. A legal dense 36-rug layout verifies canonical fallback at the unchanged draw cap. Actual stair and ground-floor closed-door approaches verify blocked exits. Astra accepted the source corrections; host consumption and actual full-game browser acceptance remain pending.

## Combined wiring checkpoint

The isolated candidate now wires the production builder through the existing lazy Home loader. The host consumes blocked exits as handled with feedback and refreshes third-person static occluders when the stable solids identity changes. Astra accepted the combined source after wall-item backing, entrance precedence, balcony spans and terrace mirror clearance corrections. Four shell geometry tests and two host behavior tests pass. The earlier combined 72-check run and full build/download qualification passed before these final shell corrections; final combined verification remains required.

Initial fixed-budget figures: startup 609,092/615,000 raw and 220,834/223,000 gzip bytes; shared scene host 186,608/192,000 raw and 70,551/71,000 gzip. These are the initial candidate figures, not final-source or hosted acceptance. Actual game browser, WebGL, owner adoption and deployed link remain open.
