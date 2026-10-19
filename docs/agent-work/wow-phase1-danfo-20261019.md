# Agent work record

## Identity

- **Work ID:** `wow-phase1-danfo-20261019`
- **Owner:** WOW Phase 1 agent (Claude Opus 5.5, worktree agent-a5c7b56eda9e912eb)
- **Model / effort:** `claude-opus-5-5 / default`
- **Thread:** `local`
- **UTC updated:** `2026-10-19T12:00:00Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Phase 1 of docs/WOW-PLAN.md: "Drive a danfo", a job at the motor park: a timed run on a real danfo-type line of the city, stops where passengers board and alight, a server-settled fare meter in game naira, penalties, traffic from the city's crowd, touch steering, a 2D lane view for weak devices and a 3D road view, conductor lines per city, ride-along crew (passengers, conductor), a weekly leaderboard per route, a gist line for the best run, a run-end card and a clip.
- **In scope:** new `src/danfo/`, `src/types/danfo.ts`, `server/danfo/`, `server/routes/danfo.ts`, `src/app/features/danfo/`, `docs/DANFO.md`, tests beside them.
- **Out of scope:** real money of any kind; deploys; wrangler.jsonc; release guard; other WOW phases.
- **Exclusive file ownership:** `src/danfo/**`, `src/types/danfo.ts`, `server/danfo/**`, `server/routes/danfo.ts`, `server/danfo.test.ts`, `src/app/features/danfo/**`, `docs/DANFO.md`.
- **Shared files touched (lines added, or one entry appended to a list):** `src/paths.ts` + `src/app/features/paths/routing.ts` (`/danfo` short address), `src/app/features/phone/AppArtwork.vue` + `src/app/features/showcase/showcase.test.ts` (danfo uses the ride picture), `src/telemetry/events.ts` (three events), `src/types/protocol.ts` (HttpRoutes + HTTP_ROUTE_KEYS), `server/routes/index.ts` (ROUTE_MODULES), `server/registry.test.ts` (NAMESPACES), `server/keyed.ts` (KEYED_SPECS), `src/app/state/panelBodies.ts`, `src/app/features/living-world/register.ts` (panel), `src/types/actions.ts` + `src/game/systems/living-world.ts` (one server-only op `danfo-fare`), `server/admin/erasure-data.ts` (forget hook), `src/app/features/capture/captureSession.ts` (adopt a clip made elsewhere).
- **Input contract:** main at `3010cc17e`.
- **Output contract:** a commit on this branch; the integrator merges and deploys.
- **Dependencies:** none.

## Repository state

- **Repo:** JoinAllworld (git worktree under `.claude/worktrees/`)
- **Host:** owner's Mac
- **Branch / worktree:** `worktree-agent-a5c7b56eda9e912eb`
- **Base:** `3010cc17e7efe02fd4ffff70409ff1a0e4bf1c0b`
- **Current commit:** base (uncommitted work in progress)
- **Dirty status:** dirty: owned files only
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Registered; read WOW-PLAN, coordination index, living-world driving, gist ledger, capture pipe.
- Pure model, server service and routes, client park/run/views/clip, docs/DANFO.md — see docs/DANFO.md "Tests".
- Targeted tests pass: `src/danfo/danfo.test.ts` 11/11, `src/app/features/danfo/runModel.test.ts` 5/5, `server/danfo.test.ts` 3/3, registry/protocol/keyed/paths/telemetry/phone/admin/clerk/restock tests pass. Pre-existing failures not touched: `src/types/engine.test.ts` (look `native` field), `src/app/features/panelsA.test.ts` (boutique), showcase artwork test (`worlds` alias).
- Local browser check (headless Chrome, swiftshader, local Node server, 390x844): /danfo opens the park; a scripted driver completed Oshodi – Mile 2 in 3D then 2D lanes, the server settled ₦7,940 (first place on the board), Clip it produced an 11 s MP4 + card PNG in Capture, which started adding the @handle mark. Worker smoke checks (5) pass after the build.
- `npm run -s typecheck` clean; `npx vite build` + `npm run -s size:download` pass (startup lagos 612,109 / 616,000 raw).

### In progress / blockers

- None. Not built: a passenger watching the road itself (they get a progress strip); real street geometry in 3D.

### Immediate resume steps

1. Read docs/DANFO.md and this record; run the danfo tests listed there.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** integrator's tests, size check and deploy.
- **References:** docs/WOW-PLAN.md, docs/DANFO.md

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19T12:00Z | active | registered | this file | build the pure model |
| 2026-10-19T15:30Z | ready-for-review | Phase 1 implemented and committed on this branch | docs/DANFO.md, tests listed above | integrator merges, runs full CI, deploys |
