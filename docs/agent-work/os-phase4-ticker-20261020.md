# Agent work record

## Identity

- **Work ID:** `os-phase4-ticker-20261020`
- **Owner:** Claude (Fable 5.1 brief, run by a Sonnet 5.5 agent)
- **Model / effort:** Sonnet 5.5 / default
- **Thread:** local
- **UTC updated:** 2026-10-20T00:00:00Z
- **Status:** active
- **Work state:** implementation

## Goal and boundaries

- **Goal:** Phase 4 of docs/OPEN-SOURCE-PLAN.md, narrowed: a city news ticker (Square, HUD notice slot, danfo radio) and a one-day client-side memory of people you greeted or bought a drink for.
- **In scope:** `src/news/` (new, lazy only), `src/app/features/gist/Ticker.vue`, small hooks in `PlacePanel.vue`, `NoticeHost.vue`, `DanfoRun.vue`, `NpcCard.vue`, a wave and a bark in `src/scene/ambient/layer.ts`, tests, docs.
- **Out of scope:** any server table, the "splashed" and "lift" kinds, a radio voice, `src/scene/venue-scenes.ts` and `src/venue-world.ts` (pinned host files), `vite.config.ts`, `src/budgets.ts`.
- **Exclusive file ownership:** `src/news/**`, `src/app/features/gist/Ticker.vue`.
- **Input contract:** main at 53a738808.
- **Output contract:** branch `claude/os-p4-ticker`, CI budget lines all ok.
- **Dependencies:** none.

## Repository state

- **Repo:** joinallworld, worktree `Documents/Allworld-notes/work/os-p4-ticker`
- **Host:** the owner's Mac
- **Branch / worktree:** `claude/os-p4-ticker`
- **Base:** 53a738808dbbdb7a3eba39b6c798931b0084c8ad
- **Current commit:** see git log
- **Dirty status:** owned changes only
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Read the plan, the reference ideas, the gist, notice, danfo, crowd and ambient code.

### In progress / blockers

- Building.

### Immediate resume steps

1. `git log --oneline` on the branch, then continue from the list in the checkpoint table.

## Release state

- **Local implementation:** active
- **Deployment:** not-requested
- **Release gate:** CI budget lines all ok; integrator review
- **References:** docs/OPEN-SOURCE-PLAN.md Phase 4, docs/GIST.md

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-20 | active | Design settled. Findings: `src/scene/venue-scenes.ts` and `src/venue-world.ts` are pinned host files, so a `memory` field on `CrowdEntry` cannot reach the layer without touching them; the layer reads the store by id instead. Stalls are player-run (no regular to remember), so "bought" comes from the NPC card's drink. | host-scenery.json | write src/news |
