# Agent work record

## Identity

- **Work ID:** `2026-10-15-progression-loading`
- **Owner:** `/root/phase0_mission_rewards`
- **Model / effort:** `GPT-6 Sol / high`
- **Thread:** `/root/phase0_mission_rewards`
- **UTC updated:** `2026-10-14T23:08:20Z`
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Remove the achievements, episodes and projects rules/content from the browser startup closure without losing saved progression or changing server behaviour.
- **In scope:** Browser progression stand-ins, retryable dynamic registration, pre-rebuild client gating, Passport loading, registry order, source checks and a host-local runtime diagnostic.
- **Out of scope:** System/content behaviour, shared contracts, tests, startup budget changes, broad build, browser QA, deployment and publication.
- **Exclusive file ownership:** `src/game/systems/base.ts`, `src/game/systems/browser.ts`, `src/game/systems/index.ts`, `src/game/progression-slices.ts`, `src/game/progression-gate.ts`, `src/game/systems/progression-register.ts`, `src/client.ts`, `src/app/state/panelBodies.ts`, `docs/agent-work/progression-loading-20261015.md`.
- **Input contract:** Detached worktree at `8ac05891c117ed32f1629757d60893f0e543095e`; real progression systems stay ordered after business and before living-world, market and campus; browser stand-ins may rebuild only absent or exact-empty slices.
- **Output contract:** A lazy browser progression pack that preserves nonfresh state, exposes safe empty pre-load views, retries failed imports, and loads before Passport or any rebuild of nonfresh state.
- **Dependencies:** Parent integration owner `/root` owns whole-tree typecheck, build and download-budget verification; retention contracts and real progression systems remain owned by `retention-20261014`.

## Repository state

- **Repo:** `JoinAllworld`, isolated retention worktree.
- **Host:** `Local`.
- **Branch / worktree:** Detached `HEAD` at `.codex/worktrees/retention-phase-zero/JoinAllworld`.
- **Base:** `8ac05891c117ed32f1629757d60893f0e543095e`.
- **Current commit:** `8ac05891c117ed32f1629757d60893f0e543095e`.
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
- Diff hygiene passed: `git diff --check`.

### In progress / blockers

- Whole-tree typecheck, production build and download-budget measurement are intentionally left to the parent integration owner. Two direct `vue-tsc` project attempts emitted no diagnostics before both exited `134` at the default 4 GB heap when run concurrently; they are not recorded as passes.
- No production browser artifact was built here, so the diagnosed startup-byte reduction remains unverified until the parent's build and budget run.

### Immediate resume steps

1. Run the repository's normal serialized typecheck from the integration owner session and inspect diagnostics in the owned loading files.
2. Run one production build and `npm run size:download`; confirm the three authored progression systems are absent from the startup engine closure and the startup budgets pass.
3. If the budget still fails, inspect the new startup closure before changing the stand-in contract or budgets.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** Parent whole-tree typecheck plus production build/download-budget evidence.
- **References:** `docs/agent-work/retention-20261014.md`, `src/game/campus-gate.ts`, `src/campus/unilag/slices.ts`, `src/game/registry.ts`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-14T23:08:20Z` | `verified-local` | Lazy progression pack implemented with conservative state gating and retry | Host-local progression probe, source imports, `git diff --check` | Parent runs serialized typecheck, build and download budget |
