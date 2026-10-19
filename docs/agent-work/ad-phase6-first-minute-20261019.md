# Agent work record

## Identity

- **Work ID:** `2026-10-19-ad-phase6-first-minute`
- **Owner:** `Claude (sub-agent of the integration owner)`
- **Model / effort:** `Claude / standard`
- **Thread:** `local`
- **UTC updated:** `2026-10-19T07:00:00Z`
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Phase 6 of `docs/AD-READY-PLAN.md`: "The first sixty seconds" (a first-screen strip after Play with one social next action, a new-player path that ends in that action, Feed first on the phone for badge holders).
- **In scope:** new `src/app/features/firstminute/` (chooser, its test, the strip, its starter), `src/app/startExtras.ts` (one lazy call), `src/app/features/tour/{tourState.ts,TourDecider.vue}` (hand the new player's first minute to the strip), `src/app/features/start/StepReady.vue` (one line), `src/app/features/phone/{phoneHomeModel.ts,PhoneDevice.vue}` (Feed first in the dock for badge holders), `src/app/features/feed/{FeedApp,MeApp}.vue` (remember the badge on the device), `docs/FEED.md` ("First minute").
- **Out of scope:** push, deploy, wrangler.jsonc, server counters (activation is already counted server-side), other phases.
- **Exclusive file ownership:** the in-scope files above, on this branch only.
- **Input contract:** `claude/ad-ready` (Phases 1-5 and 7 integrated), merged into this branch at `ae9dafd78`.
- **Output contract:** one commit on this branch; the integration owner merges and deploys.
- **Dependencies:** Phase 3 (Near you read `GET /api/feed/list?tab=near`, `FeedPage.near`).

## Repository state

- **Repo:** Allworld, repo root
- **Host:** owner's Mac
- **Branch / worktree:** `worktree-agent-a0f07a43c1ad7595d` in `.claude/worktrees/agent-a0f07a43c1ad7595d`
- **Base:** `ae9dafd78` (merge of `claude/ad-ready`)
- **Current commit:** `ae9dafd78`
- **Dirty status:** clean after the branch commit
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Registered.
- First-minute strip (`src/app/features/firstminute/`): pure chooser `firstMinuteModel.ts`, `FirstMinute.vue`, `startFirstMinute.ts` (mounted at the top of the bottom stack's guest slot, 3D and Lite, once per session); fetched from `startExtras.ts` `startAfterReady`.
- New player: `TourDecider.vue` hands its automatic turn to the strip (`handOff`, marks the tour seen, strip gets "Show me around"); a failed fetch falls back to the walkthrough. `StepReady.vue` says what comes next.
- Return visit: `src/app/features/feed/badgeMark.ts` keeps yes/no of the badge (FeedApp, MeApp, strip); `PhoneDevice.vue` uses `BADGE_DOCK` (Feed first) for badge holders.
- `docs/FEED.md` "First minute"; `src/app/entry.test.ts` forbids `features/firstminute/` in the first download.
- Tests: `firstMinuteModel.test.ts` 5/5, `models.test.ts` 14/14, `lite.test.ts` 2/2, tour tests 22/22, `startComponents.test.ts` 24/24, `near.test.ts` 4/4, `entry.test.ts` 8/8 (after `npx vite build`). `src/budgets.test.ts` 5/7: the two failures are pre-existing (the table gained entries the test does not list; budgets files untouched here).
- `npm run -s typecheck` clean. `npx vite build` passes; `npm run -s size:download` pass, overBudget 0: FIRST_PAINT_BROTLI 35,397 (base 35,411), STARTUP_RAW 612,007 (base 611,998), STARTUP_BROTLI 195,771 of 196,300 (base 195,762). No new code in startup chunks (grep of dist); the +9 bytes is chunk-name drift. Full `npm run build` not run (fails at scenes:check in symlinked worktrees).

### In progress / blockers

- None. Integration owner: merge, browser smoke (new player in 3D and Lite; return visit with badge), deploy.

### Immediate resume steps

1. `git diff --stat` in the worktree.
2. Run the targeted tests listed in the checkpoint below.

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested`
- **Release gate:** integration owner review
- **References:** `docs/AD-READY-PLAN.md`, `docs/FEED.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19T06:00Z | active | registered | this file | implement |
| 2026-10-19T07:00Z | verified-local | strip, hand-off, dock, docs | tests and size above | integration owner merges |
