# Social platform research and phased plan

## Identity

- **Work ID:** `20261018-social-platform-plan`
- **Owner:** Claude Fable 5.1 (Claude Code, T3 Code thread, the owner's Mac)
- **Model / effort:** claude-fable-5-1 / default
- **Thread:** local T3 Code thread, 2026-10-18
- **UTC updated:** see checkpoint history
- **Status:** `verified-local`
- **Work state:** `implementation` (documentation only)

## Goal and boundaries

- **Goal:** Research and plan (done), then implement the plan's phases: the feed, profiles, crews, plans, gigs, Lite (owner: "implement all", 18 Oct 2026).
- **In scope:** `docs/SOCIAL-PLATFORM-PLAN.md` (new), `docs/research/social-platform-2026-10-18/` (new), this record. No runtime source changes.
- **Out of scope:** any source, test, deployment or data change; missions, gameplay and performance work owned by other agents.
- **Exclusive file ownership:** docs above, `docs/FEED.md`, `src/feed/*`, `src/types/feed.ts`, `server/feed/*`, `server/routes/feed*.ts`, `server/feed.test.ts`, `src/app/features/feed/*`, `src/app/features/lite/*`, `src/app/state/lite*.ts`. Small additive edits in shared files: keyed specs, route registry, protocol frame and route keys, gist add hook, metrics (po, f3, northStar), erasure call, /p/ page, App.vue (Lite), PersonApp (feed card), AppArtwork aliases, startApp/startExtras (invitation links), socialClient frame case, agents call_api description, budgets (+0.3% startup).
- **Input contract:** main at the base commit below; live operator metrics read with the owner's read-only operator tool; existing design docs (FRIENDSHIP, MESSAGES, CALLS, PLACES, CHAT-PICTURES, POLITICS, AGENTS, agent-plans/world-alive/FEATURES).
- **Output contract:** the plan document; phases name the owned paths a future implementer should register before writing.
- **Dependencies:** none for the document. Implementation phases depend on the world-alive programme (AGENT.md) and on the owner's decisions listed in the plan.

## Repository state

- **Repo:** JoinAllworld, `~/Desktop/JoinAllworld`
- **Host:** the owner's Mac
- **Branch / worktree:** `claude/social-platform`, worktree `~/Documents/Allworld-notes/work/social-platform` (remove after merge)
- **Base:** `e113e7d28`
- **Current commit:** `e113e7d28`
- **Dirty status:** dirty before I started: unrelated uncommitted edits in `src/app/features/admin/{AdminShell,DashboardView,charts/Funnel}.vue` belong to another worker and are untouched.
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Live metrics read 2026-10-18 (operator read tool, `/api/mod/growth/metrics?days=14`, `/api/mod/overview`, `/api/mod/agents`): summarised in the plan's "Where we are" section (aggregates only).
- Codebase inventory and two outside-research briefs from helper agents (Sonnet), saved in `docs/research/social-platform-2026-10-18/`; findings folded into the plan.
- `docs/SOCIAL-PLATFORM-PLAN.md` written: data, inventory, outside lessons, first principles (a post is a place; Lite), nine phases with paths, gates and effort, held-back ideas, owner decisions.

### In progress / blockers

- None. Implementation of any phase is a new work record by its owner.

### Immediate resume steps

1. Read `docs/SOCIAL-PLATFORM-PLAN.md`; the phases are ordered and each names its owned paths.
2. An implementer registers a new work record per phase before touching source.

## Release state

- **Local implementation:** `verified-local` (docs only; no source changed)
- **Deployment:** `not-requested`
- **Release gate:** none; a document.
- **References:** `docs/SOCIAL-PLATFORM-PLAN.md`, `docs/FRIENDSHIP.md`, `docs/PLACES.md`, `docs/MESSAGES.md`, `docs/agent-plans/world-alive/FEATURES.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-18T07:32:00Z | active | Record created; research under way | this file | write the plan |
| 2026-10-18T08:05:00Z | complete (plan) | Plan and research folder written; no source touched | `docs/SOCIAL-PLATFORM-PLAN.md`, `docs/research/social-platform-2026-10-18/` | owner reads the plan; Phase 0 can start |
| 2026-10-18T18:00:00Z | verified-local | Phases 0-8 implemented as far as this lane owns (see the status table in docs/SOCIAL-PLATFORM-PLAN.md) | `server/feed.test.ts` 12/12; typecheck clean; download budgets ok; full suite: every failure also fails on main (same names, file by file); browser pass 14/14 on Lite at 390, 1280 and 320 px | PR, merge, release |
