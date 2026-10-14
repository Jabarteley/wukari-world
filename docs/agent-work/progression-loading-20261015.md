# Agent work record

## Identity

- **Work ID:** `2026-10-15-progression-loading`
- **Owner:** `/root/phase0_mission_rewards`
- **Model / effort:** `GPT-6 Sol / high`
- **Thread:** `/root/phase0_mission_rewards`
- **UTC updated:** `2026-10-14T23:14:58Z`
- **Status:** `build-verification-pending`
- **Work state:** `implementation`

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
- **Branch / worktree:** Detached `HEAD` at `.codex/worktrees/retention-main-sync/JoinAllworld`.
- **Base:** `899c60439022b2cb7082a1e88c930a3e4c41db36`.
- **Current commit:** `899c60439022b2cb7082a1e88c930a3e4c41db36`.
- **Dirty status:** Dirty. Owned loading changes coexist with the retention programme's many pre-existing modified and untracked files; unrelated work was preserved.
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

### In progress / blockers

- Parent's serialized five-project typecheck passed before this config-only repair. Two earlier direct `vue-tsc` project attempts emitted no diagnostics before both exited `134` at the default 4 GB heap when run concurrently; they are not recorded as passes.
- The pre-repair production build still measured `660320` raw / `234838` gzip startup JS and `205431` total Brotli because the broad manual chunk rule overrode the dynamic source boundary. The parent's next production build and download-budget run must verify the repaired chunk graph.

### Immediate resume steps

1. Run one production build and `npm run size:download`; confirm `progression-rules` is lazy, the authored progression systems/content are absent from the startup engine closure and the startup budgets pass.
2. If the budget still fails, inspect the new startup closure before changing the stand-in contract or budgets.

## Release state

- **Local implementation:** `build-verification-pending`
- **Deployment:** `not-requested`
- **Release gate:** Parent whole-tree typecheck plus production build/download-budget evidence.
- **References:** `docs/agent-work/retention-20261014.md`, `src/game/campus-gate.ts`, `src/campus/unilag/slices.ts`, `src/game/registry.ts`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-14T23:08:20Z` | `verified-local` | Lazy progression pack implemented with conservative state gating and retry | Host-local progression probe, source imports, `git diff --check` | Update the affected browser-profile fixture |
| `2026-10-14T23:10:26Z` | `verified-local` | Browser fixture awaits progression before direct rebuilds; focused client and browser-profile suites pass | `src/client.test.ts` 44/44; `src/game/browser-profile.test.ts` 3/3 | Parent runs serialized typecheck, build and download budget |
| `2026-10-14T23:14:58Z` | `build-verification-pending` | Manual chunk precedence repaired so the lazy progression pack and retention helpers no longer fall into eager engine | Source import graph review; config classifier check; `git diff --check` | Parent rebuilds once and measures startup budget |
