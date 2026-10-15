# Agent work record

## Identity

- **Work ID:** `worker-progression-assets-20261015`
- **Owner:** `/root/view_ui` progression asset worker
- **Model / effort:** GPT-6.1 Sol / high
- **Thread:** `/root/view_ui`
- **UTC updated:** `2026-10-15T14:26:20Z`
- **Status:** `review-ready`
- **Work state:** `Astra-approved progression asset fixture correction passes all four focused edge files`

## Goal and boundaries

- **Goal:** Remove authored progression payloads from the Cloudflare Worker graph through immutable validated assets while preserving synchronous game APIs, exact catalogue identity/order and the unchanged 3.5 MB Worker limit.
- **In scope:** package/build plumbing, progression provider and runtime facades, immutable hashed progression assets, Cloudflare startup barrier, exact source-parity probe and existing verification gates; after the progression-only bundle remained over limit, Astra approved a compact static campus navigation/shuttle data provider with exact behavior parity.
- **Out of scope:** content authoring, `src/game/content/local-tales/batch-*.ts`, gameplay changes, campus behavior changes, budget increases, new test files, browser work, Git publication and deployment.
- **Current bounded correction:** expose the home smart-object's rendered player pose to the existing first-person context without changing navigation rest semantics, camera offsets, body masking or materials. Owned source is limited to `src/scene/home-scene.ts`, `src/scene/view-extension.ts` and `src/scene/first-person/venue-context.ts`.
- **Current CI repair:** replace runtime-derived decorative-tree floats in the compact navigation payload with exact occupied grid-cell indices using the existing tree collision rules and shared fixed grid constants. Owned paths are limited to the campus navigation data/source/generated/runtime and generator plus this record. Visual trees, map geometry, navigation behavior and budgets remain unchanged.
- **Current Worker fixture repair:** preserve the mandatory progression startup barrier and exact hash validation by giving four existing Miniflare fixtures the generated progression assets they now require. Owned paths are limited to `deploy/admin-host.edge.test.ts`, `deploy/admin.edge.test.ts`, `deploy/notice.edge.test.ts`, `deploy/words.edge.test.ts` and this record. Runtime/provider code, assertions and the other five broad-Worker failures are out of scope.
- **Exclusive file ownership:** this record; proposed provider/build/runtime files after parent approves the finite contract. The retention owner keeps authored local-tale batches and final release/deployment ownership.
- **Input contract:** candidate branch `codex/first-person-release-20261015` at `a9141b12085f631b256e3088ab0753f121f576aa`; Worker gate is 5,110,078 bytes against an unchanged strict 3,500,000-byte limit.
- **Output contract:** source and generated manifest/assets that keep the Worker graph free of full authored tales/seeds, install one complete validated snapshot before Worker restore/startup/alarms, and retain all existing IDs, versions, order and save behavior.
- **Dependencies:** `first-person-release-20261015`; retention owner boundary agreement; parent/Astra contract and integration review; parent owns heavy checks and final release.

## Repository state

- **Repo:** JoinAllworld isolated release candidate
- **Host:** local Codex worktree
- **Branch / worktree:** `codex/first-person-release-20261015`
- **Base:** `a9141b12085f631b256e3088ab0753f121f576aa`
- **Current commit:** `f1d0a7d2790f9785c33a7867756aba1f6f078a47`
- **Dirty status:** parent-owned `docs/agent-work/first-person-release-20261015.md` was already dirty before this fixture correction; preserve it. This record is the only owned dirty file before the fixture edits.
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Read the current coordination record and the prior Worker gate audit.
- Mapped the Worker import paths through `systems/index.ts`, episode/mission/journey catalogues and the retention route.
- Confirmed the existing immutable city asset pattern provides bounded byte/hash/UTF-8/JSON/envelope validation and retryable failed reads.
- Confirmed the Worker startup barrier currently waits `context.startup` before socket restore, expiry storage transaction and alarm scheduling.
- Traced four hosted Worker 500s to Miniflare fixtures that did not serve the newly mandatory generated progression assets. Three fixtures now bind the existing full `dist`; the bespoke admin-host fixture copies only `dist/assets/progression`, preserving its hand-built pages and route assertions. Runtime/provider code, the startup barrier and hash validation are unchanged.
- Focused serial edge command passed 9/9 in 7.07 seconds: `node --experimental-strip-types --test --test-concurrency=1 deploy/admin-host.edge.test.ts deploy/admin.edge.test.ts deploy/notice.edge.test.ts deploy/words.edge.test.ts`. Log: `/tmp/allworld-worker-progression-fixtures.log`. `git diff --check` passes the four fixtures and this record.
- Ownership agreed with the retention lane: this lane owns provider/package/build/startup work; the retention lane retains authored batches and final deployment.
- Captured the exact pre-mutation progression snapshot: 10,886,582 bytes, SHA-256 `dda3cd76196e3a20d542a00b821c7d284cf1d740119b55b0cc847795bbfa4520`; 1,138 episodes, 1,055 journeys, 284 accepted cities, 243 accepted countries and 3,428 mission definitions.
- Moved authored progression construction behind the Node/browser source provider and preserved the original episode, journey and accepted-ID public paths as synchronous provider facades. Direct facade import verifies 1,138 episodes, 1,055 journeys and hostel/memento lookups without systems initialization.
- Generated four immutable hashed progression assets, each below 5 MB, with byte length, SHA-256, UTF-8/JSON/envelope/count and complete-snapshot validation. A corrupt first read fails closed; a later valid read retries and reconstructs the exact canonical snapshot.
- Worker startup now loads and atomically validates the complete progression snapshot and installs mission indices before socket restore, stored lifecycle work and alarms. Existing lookup maps/sets are built once at install.
- Progression extraction reduced the Worker from 5,110,078 to 3,629,352 bytes, proving the authored tales/seeds left the graph but leaving the unchanged 3.5 MB gate 129,353 bytes over.
- After Astra approved the residual boundary, captured exact pre-change campus navigation behavior at `/tmp/campus-nav-baseline-a9141b12.json`: 3,566,557 bytes, SHA-256 `b9ef8e6053afdeef3c1294316c77bc6d12bcb776c0f56ad6ce1bb4d01830110f`, including every occupancy byte, 35 anchors/routes, all zones, entrance and an extra-footprint case.
- Added a generated 208,181-byte campus provider containing exact navigation data plus the shuttle's exact roads and building-ring prefix. Node/source and Worker/generated probes both reproduce the baseline byte-for-byte. The Worker graph contains no `map.generated.ts`, `layout.ts` or `landscape.ts`.
- Delayed Worker facades preserve reflection after asset install: `Object.keys(EPISODES)` returns 1,138 indices, `Object.keys(JOURNEYS)` returns 1,055, and the hostel episode serializes with all 13 fields. Before install they fail closed.
- Astra approved one existing boundary repair for release headroom: the server-imported companion registry now imports the underlying pure game money formatter directly instead of pulling the reactive Vue UI wrapper. Focused registry tests pass 3/3.
- Strict Worker gate passes at 3,422,076 bytes, 77,924 bytes below the unchanged limit. Maximum compiled city reference is 332 bytes. The final metafile contains no Vue runtime, authored progression source, or campus map/layout/landscape modules.
- Fresh serial typecheck passes all five projects with zero errors. Focused campus/progression suite passes 52/52, including full stop-pair safe road routing, deterministic shuttle pose, campus walkability, extra footprints, missions and engine contracts.
- Generator drift checks pass for progression assets and campus navigation data. `git diff --check` passes.
- Browser integration at `11936921` exposed a Vite classification regression: moved source-provider/content files fell through to the broad eager `engine` chunk while their authored dependencies remained in `progression-rules`, creating a static engine/progression cycle. The served build fetched both chunks and failed before its first API request.
- Astra approved the minimal classification-only correction. `progression/source-provider.ts`, `content/episode-validation.ts`, `episodes-source.ts`, `journeys-source.ts` and `local-tales-source.ts` now stay in the existing lazy `progression-rules` chunk; no bootstrap API or runtime behavior changed.
- In-memory and emitted-build startup closures contain no `progression-rules` file. The emitted Lagos closure is 608,139 raw JS, 220,411 gzip JS and 193,476 brotli including non-JS assets, within the unchanged 615,000 / 223,000 / 195,600 caps. The engine chunk is 249.1 kB. Full build completed in 46.95 seconds; the full multi-city size scan was intentionally left to the final combined retention build.
- Astra reloaded the emitted served build and accepted the repaired browser boot. The correction is committed and pushed as `73f66122` (`fix: retain lazy browser progression source boundary`).

### In progress / blockers

- Worker assets intentionally install accepted city/country ID sets, not the full source-only `ACCEPTED_LOCAL_CITIES` / `ACCEPTED_LOCAL_COUNTRIES` object maps. No current Worker runtime consumer uses those maps; retention profiles use episode/journey lookups. Do not describe the full local-tales maps as Worker-parity without expanding the approved payload contract.
- Astra approved the first-person bed-pose correction: home navigation continues to report `restAt.pose`, while a new optional scene presentation getter reports `stand` during object approach/alignment and the actual object pose during enter/use/rest/exit. The view context prefers that presentation pose when present.
- The bounded three-file correction is implemented and accepted by Astra. Existing first-person controller/context tests pass 7/7 and `git diff --check` passes; no build or browser acceptance was claimed by this lane.
- Fresh heavy-slot build passes. The emitted Lagos startup is 608,139 raw JS / 220,420 gzip JS / 193,436 brotli including assets, with no progression-rules chunk in its 19-file closure. The shared scene host is 186,322 raw / 70,426 gzip. All remain under the unchanged limits. The source is committed and pushed as `8061dc2c`; Astra retains the final served Stay in Bed replay.
- Combined CI at `82237708` fails the campus generator check on hosted Linux Node 24.21 because the compact payload serializes decorative tree coordinates produced by amplified `Math.sin` values. The logged assertion truncates both 208 KB strings, so the exact first coordinate, differing-tree count and maximum numeric delta are unavailable. Astra approved encoding sorted unique in-range occupied tree grid-cell indices instead, derived from the unchanged circle painting and mandatory containing-cell rules with shared `CELL=2` / `RADIUS=.4` constants. Hosted CI remains the cross-platform proof.
- The repair replaces 808 raw decorative-tree triples with 808 sorted occupied cell indices. Full before/after normal navigation snapshots are byte-identical at `/tmp/campus-nav-cells-before-normal.json` and `/tmp/campus-nav-cells-after-normal.json` (SHA-256 `df98a168c29a9edbbb2a8931514e21c0a5ac27641b8e40f92808e258aefa221c`). Extra-footprint snapshots are byte-identical at `/tmp/campus-nav-cells-before-extra.json` and `/tmp/campus-nav-cells-after-extra.json` (SHA-256 `b899516ea41903974e610c2aa7f1e02ea2d2aa0a0f6eae30b0010903b103d44a`). Each receipt covers all 1,312,150 occupancy bytes, 35 adjusted anchors and routes, 81 zones, zone-at-anchor classifications and the entrance; `cmp` passes both pairs.
- Existing campus walk/shuttle tests pass 11/11. Local generator write/check and a macOS Node 24.21 check pass; `git diff --check` passes. The generated payload falls from 208,181 to 167,130 bytes. The focused Worker gate passes at 3,382,393 bytes against the unchanged 3,500,000-byte cap, with 117,607 bytes headroom and a 332-byte maximum compiled city reference. Astra accepted the actual source diff; hosted Linux CI is still required before claiming cross-platform determinism.

### Immediate resume steps

1. Parent completes the remaining first-person UI integration.
2. Retention owner runs the final combined multi-city size and release gates.

## Release state

- **Local implementation:** `accepted; focused checks and served browser boot pass`
- **Deployment:** `not-requested`
- **Release gate:** Parent/retention owner final combined multi-city size, package and release checks.
- **References:** `docs/agent-work/nigeria-worker-gate-audit-20261015.md`; `docs/agent-work/first-person-release-20261015.md`; `docs/AGENT-COORDINATION.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T12:47:03Z | active | Read-only graph inspection complete; exact Worker size is 5,110,078 bytes and the ownership boundary is agreed. | existing strict gate and source import trace | Submit finite contract before implementation. |
| 2026-10-15T13:09:58Z | review-ready | Progression assets and the approved compact campus provider preserve exact payload/navigation behavior; unchanged Worker gate now passes. | 3,496,918-byte Worker; exact progression/campus hashes; typecheck 5/5; focused tests 52/52 | Astra reviews, then parent integrates and runs release/package gates. |
| 2026-10-15T13:16:46Z | source-frozen | Astra-approved pure companion money import removes the unintended Vue Worker edge and restores release headroom without changing formatting. | 3,422,076-byte Worker; 77,924-byte headroom; registry 3/3; typecheck 5/5; final metafile exclusions clean | Parent integrates retention/profile changes and owns broad release gates. |
| 2026-10-15T13:34:38Z | browser-proof-pending | Minimal Vite classification repair removes the source-provider cycle from startup without changing provider runtime behavior. | full build 46.95s; Lagos 608,139 raw / 220,411 gzip / 193,476 brotli; progression-rules absent from startup | Astra reloads served build; retention owner later runs final combined full scan. |
| 2026-10-15T13:36:02Z | complete | Astra accepted the actual served browser boot; the minimal correction is committed and pushed. | `73f66122`; served boot PASS; startup closure remains within all three unchanged caps | Parent and retention owner complete their final combined gates. |
| 2026-10-15T13:41:40Z | review-accepted | The home scene now reports the smart-object presentation pose separately from navigation rest state, and first-person interpretation prefers it. Astra accepted the exact three-file diff. | existing controller/context tests 7/7; `git diff --check` | Freeze source; parent builds and Astra replays Stay in Bed in the served browser. |
| 2026-10-15T13:43:40Z | browser-replay-pending | Fresh build and targeted startup/shared-host gates pass for the accepted pose correction; source is committed and pushed. | `8061dc2c`; startup 608,139 / 220,420 / 193,436; scene host 186,322 / 70,426 | Astra performs the final served Stay in Bed replay; parent/retention lane owns combined gates. |
| 2026-10-15T13:56:30Z | review-accepted | Compact navigation stores exact occupied tree-cell indices derived by the unchanged collision rules and shared grid constants. Astra accepted the source; complete normal and extra-footprint navigation snapshots remain byte-identical. | normal SHA `df98a168…`; extra SHA `b899516e…`; walk/shuttle 11/11; Worker 3,382,393 bytes; generator check pass | Commit the four campus files and this record, then rerun hosted Linux Node 24.21 CI as the final determinism gate. |
| 2026-10-15T14:26:20Z | review-ready | Four existing Miniflare fixtures now serve the exact generated progression assets required by the mandatory Worker startup barrier; no runtime fallback or validation change. | focused edge files 9/9; 7.07s; `/tmp/allworld-worker-progression-fixtures.log`; diff check clean | Astra reviews the exact fixture diff, then parent integrates it into the combined release candidate. |
