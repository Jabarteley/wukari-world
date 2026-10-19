# Agent work record

## Identity

- **Work ID:** `os-phase1-weather-20261019`
- **Owner:** Claude (open-source plan, phase 1)
- **Model / effort:** Sonnet 5.5 / default
- **Thread:** local (spawned by the coordinator)
- **UTC updated:** 2026-10-19T00:00:00Z
- **Status:** active
- **Work state:** implementation

## Goal and boundaries

- **Goal:** Phase 1 "Weather you can see": GPU rain with a cover test and splashes; grill and generator smoke from one small own emitter.
- **In scope:** `src/scene/fx/{rain-plan,rain,cover,smoke-plan,smoke,weather}.ts` and their tests; hook lines in `src/scene/venue-scenes.ts`, `src/scene/neighbourhood-scene.ts` (the street host; `street-life/street-scene.ts` is pure and has no scene), `src/scene/home-scene.ts`; rain sound recipe in `src/audio/data.ts`.
- **Scope narrowing from the coordinator (owner rule: only what clearly outweighs its drawbacks):** rain is the deliverable. three-nebula is NOT used. Smoke only if the own emitter stays near 150 lines and at most two draw calls per scene; grill and generator smoke only, no per-vehicle exhaust, no harmattan dust. `burst()` only if free from the same emitter. Sound: rain recipe only (wind and generator drone only if one recipe each with no director change). Rain must cost under 1.5 ms at the phone count in my own timing, or say it was not measured.
- **Out of scope:** post stack, light map (phase 2; `lightmap` is an optional uniform), vehicle exhaust, harmattan dust.
- **Exclusive file ownership:** the files above.
- **Dependencies:** phase 0b defines the `fx` chunk; my lazy `import('./fx/weather.ts')` lands there once merged. `src/scene/fx/index.ts` is left alone.

## Repository state

- **Repo:** Allworld worktree
- **Host:** this Mac
- **Branch / worktree:** `claude/os-p1-weather` in `Allworld-notes/work/os-p1-weather`
- **Base:** 090f1e97b
- **Current commit:** see git log
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- (updated as work lands)

### Immediate resume steps

1. `git log --oneline -10` and read the checkpoint table.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | Record created; scope narrowed by the coordinator | this file | rain-plan.ts first |
