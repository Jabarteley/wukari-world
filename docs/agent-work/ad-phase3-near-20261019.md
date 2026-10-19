# Agent work record

## Identity

- **Work ID:** `2026-10-19-ad-phase3-near`
- **Owner:** `Claude (sub-agent of the integration owner)`
- **Model / effort:** `Claude / standard`
- **Thread:** `local`
- **UTC updated:** `2026-10-19T02:45:00Z`
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Phase 3 of `docs/AD-READY-PLAN.md`: "Near you", the hyperlocal feed (badge local government, `near` tab, counts, Plans/Work ranking, lga-scoped communities).
- **In scope:** `src/feed/model.ts`, `src/types/feed.ts`, `server/feed/{service,data}.ts`, `server/routes/feed.ts`, `src/app/features/feed/{FeedApp,LocatedCard,CrewsApp,PostCard,FeedPersonCard,MeApp}.vue`, `src/app/features/feed/locateCity.ts`, tests `server/feed-located.test.ts`, `src/app/features/feed/locateCity.test.ts`, new `src/feed/near.test.ts`, `docs/FEED.md`. (PlansApp/WorkApp needed no change: the near-first order is in the existing server reads.)
- **Out of scope:** push, deploy, wrangler.jsonc, other phases.
- **Exclusive file ownership:** the in-scope files above, on this branch only.
- **Input contract:** main at `c61b1a2bf` (location badge).
- **Output contract:** one commit on this branch; integration owner merges and deploys.
- **Dependencies:** location badge (`0b8815728`).

## Repository state

- **Repo:** Allworld, repo root
- **Host:** owner's Mac
- **Branch / worktree:** `worktree-agent-a375218efe07d6063` in `.claude/worktrees/agent-a375218efe07d6063`
- **Base:** `c61b1a2bf`
- **Current commit:** `c61b1a2bf`
- **Dirty status:** clean after the branch commit
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Registered.
- Badge local government (device-side, `sure` only), `POST /api/feed/located { city, lga? }` validated against the city's units (route loads rules), `located.lga` stored; `near` tab with NEAR bonus (lga x3, city x1.6), month counts at `feed.here`, Plans/Work near-first, `lga` locals scope with `place.lga`; FeedApp opens on Near you for badge holders.
- Tests: `node --experimental-strip-types --test server/feed-located.test.ts` 6/6, `server/feed.test.ts` 16/16, `src/app/features/feed/locateCity.test.ts` + `src/app/features/locate/locate.test.ts` 10/10, `src/feed/*.test.ts` 5/5.
- `npm run -s typecheck` clean. `npm run build` stops at cities:assets in a worktree ("resolves outside the repository"); `npx vite build` passes and `npm run -s size:download` is within every budget (STARTUP_BROTLI 195,736 of 196,300).

### In progress / blockers

- None. Integration owner: merge, run the usual gates, deploy.

### Immediate resume steps

1. Show the working-tree diff stat in the worktree.
2. Run the targeted tests listed in the task.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** integration owner review
- **References:** `docs/AD-READY-PLAN.md`, `docs/FEED.md`, `docs/LOCATION.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-19` | active | registered | this file | implement |
| `2026-10-19T02:45Z` | verified-local | Phase 3 built; targeted tests, typecheck, vite build and size pass | commands above | integration owner merges |
