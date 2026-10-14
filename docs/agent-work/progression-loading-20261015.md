# Agent work record

## Identity

- **Work ID:** `2026-10-15-progression-loading`
- **Owner:** `/root/phase0_mission_rewards`
- **Model / effort:** `GPT-6 Sol / high`
- **Thread:** `/root/phase0_mission_rewards`
- **UTC updated:** `2026-10-14T23:41:00Z`
- **Status:** `verified-local`
- **Work state:** `completed bounded implementation`

## Goal and boundaries

- **Goal:** Remove the achievements, episodes and projects rules/content from the browser startup closure without losing saved progression or changing server behaviour.
- **In scope:** Browser progression stand-ins, retryable dynamic registration, pre-rebuild client gating, Passport loading, registry order, the affected browser-profile fixture, source checks, a host-local runtime diagnostic and the production chunk boundary for the lazy pack.
- **Out of scope:** System/content behaviour, shared contracts, new tests, startup budget changes, broad build, browser QA, deployment and publication.
- **Exclusive file ownership:** Current integration repair is limited to `vite.config.ts` and `docs/agent-work/progression-loading-20261015.md`; the earlier source implementation covered `src/game/systems/base.ts`, `src/game/systems/browser.ts`, `src/game/systems/index.ts`, `src/game/progression-slices.ts`, `src/game/progression-gate.ts`, `src/game/systems/progression-register.ts`, `src/client.ts`, `src/app/state/panelBodies.ts` and `src/game/browser-profile.test.ts`.
- **Input contract:** Canonical synced worktree at `899c60439022b2cb7082a1e88c930a3e4c41db36`; real progression systems stay ordered after business and before living-world, market and campus; browser stand-ins may rebuild only absent or exact-empty slices.
- **Output contract:** A lazy browser progression pack that preserves nonfresh state, exposes safe empty pre-load views, retries failed imports, and loads before Passport or any rebuild of nonfresh state.
- **Dependencies:** Parent integration owner `/root` owns whole-tree typecheck, build and download-budget verification; retention contracts and real progression systems remain owned by `retention-20261014`.

## Repository state

- **Repo:** `JoinAllworld`, canonical retention-main-sync worktree.
- **Host:** `Local`.
- **Branch / worktree:** `codex/retention-main-sync` at `.codex/worktrees/retention-main-sync/JoinAllworld`.
- **Base:** `899c60439022b2cb7082a1e88c930a3e4c41db36`.
- **Accepted retention commit:** `bcbfd549cb5d4e28b57003ae0eb741708bf81a77`; see the parent record for subsequent main integration.
- **Source state:** Loading repair is committed with retention. This record retains the original diagnostic history; the parent record owns current integration/publication status.
- **Port/process ownership:** None. The diagnostic exited normally; two focused Vue compiler processes exited with heap exhaustion and left no running process.

## Progress

### Done and exact evidence

- Removed the three real progression systems from `BASE_SYSTEMS`; full server/Worker registration in `systems/index.ts` retains `business -> achievements -> episodes -> projects -> livingWorld -> market -> campus` order.
- Added exact-fresh stand-ins with empty views. Any malformed, nonempty or future-field slice throws until the full pack loads; valid `trackingSince` values survive an empty rebuild.
- Added one cached, retryable dynamic progression loader and a registration module using `completeSystem`; existing `onSystemsCompleted` view invalidation remains authoritative.
- Added `progressionFor(snapshot)` to the client's generation-fenced `featureRules` before cached and server snapshots reach `createLife`; Passport always awaits `loadProgression()`.
- Host-local diagnostic passed fresh/no-load, preserved tracking time, nonfresh refusal, injected first-import failure, retry, completed registration and saved achievement progress: `ALLWORLD_FAIL_PROGRESSION_ONCE=1 node --experimental-strip-types --no-warnings --experimental-loader=/tmp/allworld-progression-loader.mjs /tmp/allworld-progression-probe.mts` -> `progression-pack-ok`.
- Source entry imports passed: `panel-bodies-import-ok` and `client-import-ok` using Node's TypeScript stripping.
- Existing client suite passed: `node --experimental-strip-types --test --test-concurrency=1 src/client.test.ts` -> 44 passed, 0 failed.
- Existing browser-profile suite passed after its PROBE began awaiting the progression pack before direct `createLife`: `node --experimental-strip-types --test --test-concurrency=1 src/game/browser-profile.test.ts` -> 3 passed, 0 failed.
- Added a `progression-rules` manual chunk before the broad `src/game/* -> engine` fallback. It contains the three complete systems, registration module, authored catalogues, journey/memento helpers, and cadence/season rules; `progression-gate.ts`, `progression-slices.ts` and `registry.ts` remain eager.
- Diff hygiene passed: `git diff --check`.

### Accepted result and next step

The parent integrated the loader with host-only mission listener construction, a small eager atlas lookup and a lazy calendar formatter. The complete retention build passes the unchanged startup limits across 284 cities: 614255 raw JS / 221428 gzip JS / 194142 Brotli overall. Five-project typecheck and 17 smoke checks pass. Current upstream-cache integration is tracked in the parent record.

Earlier direct parallel Vue compiler attempts exhausted the default heap; those attempts are not passes. The subsequent serialized five-project typecheck passed. No worker remains editing source.

On a future change, verify the emitted import graph before moving action constants or raising any budget. Do not replay already applied work. Parent owns publication and release decisions.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** Local typecheck/build/size/smoke evidence accepted; production and rollout remain separate parent-owned gates.
- **References:** `docs/agent-work/retention-20261014.md`, `src/game/campus-gate.ts`, `src/campus/unilag/slices.ts`, `src/game/registry.ts`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-14T23:08:20Z` | `verified-local` | Lazy progression pack implemented with conservative state gating and retry | Host-local progression probe, source imports, `git diff --check` | Update the affected browser-profile fixture |
| `2026-10-14T23:10:26Z` | `verified-local` | Browser fixture awaits progression before direct rebuilds; focused client and browser-profile suites pass | `src/client.test.ts` 44/44; `src/game/browser-profile.test.ts` 3/3 | Parent runs serialized typecheck, build and download budget |
| `2026-10-14T23:14:58Z` | `build-verification-pending` | Manual chunk precedence repaired so the lazy progression pack and retention helpers no longer fall into eager engine | Source import graph review; config classifier check; `git diff --check` | Parent rebuilds once and measures startup budget |

## Parent integration checkpoint — 15 October

- The parent removed runtime action-type constants from `progression-rules`: `types/actions.ts` imports them eagerly, so grouping them with the pack would pull its rules into startup. They stay in a small automatically shared chunk.
- The first corrected pack build measured 621865 raw startup JS. A source-backed audit found an unguarded mission listener table retaining the host mutation graph. Guarding construction with the existing `PLAYS` flag removes 4542 raw bytes without changing sanitize/view or host behavior; 11 focused mission/browser-profile checks pass.
- The remaining source split moves the tiny map-entry-code lookup out of atlas metadata and calendar export formatting out of the eager calendar. Public host exports remain compatible; the lazy Events screen imports the formatter directly. A pure annotation removes unused legacy travel-option construction.
- Current production build passes. Startup is 614255 raw JS / 221428 gzip JS / 194142 brotli overall, within unchanged limits. All-city size, five-project typecheck and 17 smoke checks pass; artifacts are in the retention evidence folder.
- Mission/event checks pass 10/10. Atlas/registry checks pass 19/20; the sole Antarctica placeholder mismatch reproduces on clean `94bd77d4` (3/4 map-entry tests). It is not represented as a green suite.
- All source ownership is released to the parent; no worker remains editing files.
