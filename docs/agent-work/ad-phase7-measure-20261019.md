# Agent work record

## Identity

- **Work ID:** `ad-phase7-measure-20261019`
- **Owner:** Claude (Fable 5.1 brief, Sonnet 5.5 worker)
- **Model / effort:** Sonnet 5.5 / low
- **Thread:** local worktree agent
- **UTC updated:** `2026-10-19T00:00:00Z`
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Two measures on the Admin dashboard for the Phase 7 adverts (docs/AD-READY-PLAN.md): activation per source/campaign (activated / landed) and day-7 return per campaign with sample size.
- **In scope:** `server/growth/metrics.ts` (activation note, report), `server/routes/feed.ts` and `server/routes/growth.ts` (the hooks), `server/ws/rooms.ts` (one in-process event on a player's first real step), `server/types.ts`, `src/types/growth.ts`, `server/routes/admin.ts` (history answer carries the new rows), `src/app/features/admin/{DashboardView.vue,dashboardModel.ts,dashboardModel.test.ts}`, growth, feed and position tests.
- **Out of scope:** push, deploy, wrangler.jsonc, env files; device split; acquisition cost.
- **Exclusive file ownership:** the files above, for this branch only.
- **Input contract:** `origin/main` at `c61b1a2bf`.
- **Output contract:** one commit on this branch; the integration owner merges and deploys.
- **Dependencies:** none.

## Repository state

- **Repo:** Allworld, worktree `.claude/worktrees/agent-a28bcc8374b94b50c`
- **Host:** Mac
- **Branch / worktree:** `worktree-agent-a28bcc8374b94b50c`
- **Base:** `c61b1a2bf`
- **Current commit:** the branch tip (see the commit log)
- **Dirty status:** only this work's files
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Activation (`noteActivated`, `activation` aggregate, `activationReport`) in `server/growth/metrics.ts`. Hooks: feed post, community made or joined, RSVP going (`server/routes/feed.ts`), first real step (`player-walked` from `server/ws/rooms.ts`, listened to in `server/routes/growth.ts`). An AI agent's request is never counted.
- `activation` in the operator metrics answer and in `GET /api/admin/history`; dashboard card "Adverts: activation and day-7 return, by campaign".
- `node --experimental-strip-types --test server/growth.test.ts server/feed.test.ts server/position.test.ts src/app/features/admin/dashboardModel.test.ts src/types/protocol.test.ts`: all pass. `npm run -s typecheck`: clean.
- `npm run build` stops in cities:assets ("resolves outside the repository"); `npx vite build` built, `npm run -s size:download`: errors 0, overBudget 0.

### In progress / blockers

- None. The integration owner merges and deploys.

### Immediate resume steps

1. Read the branch's last commit; the integration owner merges it.

## Release state

- **Local implementation:** verified-local
- **Deployment:** not-requested
- **Release gate:** integration owner
- **References:** docs/AD-READY-PLAN.md Phase 7, docs/research/allworld-differentiation-and-marketing-2026-10-14.md "Measure"

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | registered | this file | implement |
| 2026-10-19 | verified-local | built and tested | tests and size named above | merge |
