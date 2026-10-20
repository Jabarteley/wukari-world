# Agent work record

## Identity

- **Work ID:** `20261020-os-phase12-docs`
- **Owner:** Claude (open-source plan, Phases 12 and 13)
- **Model / effort:** Sonnet 5.5 / default
- **Thread:** local
- **UTC updated:** 2026-10-20T03:30:00Z
- **Status:** `active`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Art direction page, provenance for the shipped models that did not come through `scripts/assets/`, a local image-to-3D runbook, and the three measurable growth deltas (cost model, first-load check, peers list).
- **In scope:** `docs/ART-DIRECTION.md`, one-line links in `docs/ASSET-PIPELINE.md` and `docs/ASSETS.md`, the runbook section in `docs/ASSET-PIPELINE.md`, `scripts/assets/provenance/meshy.json` with its small checker and test, a "viral week" section in `docs/CAPACITY.md`, `scripts/evidence/first-load.ts` (+ test, + a line in `docs/EVIDENCE.md`), a "Peers to watch" section in `docs/OPEN-SOURCE-LEARNINGS.md`.
- **Out of scope:** game features, `scripts/body/retarget.ts` (the plan names it; it is not asked for here), any server or browser run, any install.
- **Exclusive file ownership:** the files above.
- **Dependencies:** none.

## Repository state

- **Repo:** joinallworld, worktree `Allworld-notes/work/os-p12-docs`
- **Branch / worktree:** `claude/os-p12-docs`
- **Base:** `b004c4e78`
- **Port/process ownership:** none.

## Progress

### Done and exact evidence

- Provenance survey: every tracked `.glb` was read (JSON chunk) and grouped; see the manifest notes.

### In progress / blockers

- See checkpoint history.

### Immediate resume steps

1. `git log --oneline origin/main..claude/os-p12-docs` to see what is committed.

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested`
- **Release gate:** CI `release-policy` green; integrator merges.
- **References:** `docs/OPEN-SOURCE-PLAN.md` Phases 12 and 13.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-20T03:30:00Z | active | Worktree made; survey done | this file | write the provenance manifest |
