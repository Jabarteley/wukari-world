# Agent work record

## Identity

- **Work ID:** `20261018-fullworld-realism`
- **Owner:** Claude (Allworld main session)
- **Model / effort:** Claude Opus 5.5
- **Thread:** local
- **UTC updated:** 2026-10-18T06:10:00Z
- **Status:** `active`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Make the walkable 3D world as realistic as possible, Streets GL-like and beyond, with no licence or compute constraint (owner, 18 Oct 2026).
- **In scope:** street host rendering (lighting, shadows, post-processing, sky), materials and textures, building/roof/facade geometry, ground, vegetation, street dressing; before/after screenshots for each step.
- **Out of scope:** game rules, UI panels, server economy; deploying to production without the owner seeing the screenshots.
- **Exclusive file ownership:** to be listed per change (src/street/**, src/scene/street-life/**, new src/street/realism/**).
- **Input contract:** origin/main 377300fab.
- **Output contract:** `fullworld` branch with measured, screenshotted steps.
- **Dependencies:** none.

## Repository state

- **Repo:** JoinAllworld
- **Host:** owner's Mac
- **Branch / worktree:** `fullworld` / ~/Documents/Allworld-notes/work/fullworld (host path)
- **Base:** 377300fab
- **Current commit:** 377300fab
- **Dirty status:** this record only
- **Port/process ownership:** dev server on 127.0.0.1:5192 (scripts/dev.ts --open); stop when the work pauses.

## Progress

### Done and exact evidence

- Desktop checkout cleared at the owner's instruction (backup in the notes folder, backups/desktop-uncommitted-20261018).

- Realworld prototype (realworld.html, src/realworld/): Lagos Island core from real data — OSM/Overture footprints, Open Buildings measured heights,
  imagery roof colours, tree crowns, shoreline and ground photo (Maxar 2019, CC BY-NC); PBR textures (ambientCG CC0, fetched by script);
  procedural weathered facades, zinc roofs, merged asphalt with pavements and kerbs, viaducts, real business signboards (Overture places),
  utility poles and cables, procedural traffic; physical sky, cascaded shadows, GTAO, bloom, Neutral tone mapping, SMAA.

### In progress / blockers

- Next: people on the pavements (reuse the game's characters), roof clutter (water tanks, AC units), balconies and setbacks, night look,
  frame-rate pass, then a plan to feed real data into the game's street tiles (server walk masks).

### Immediate resume steps

1. Start `node --experimental-strip-types scripts/dev.ts --open --port 5192` in the worktree.
2. Read the checkpoint table below for the step in progress.

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested`
- **Release gate:** owner reviews before/after screenshots.
- **References:** docs/research/polish-plan-2026-10-17.md

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-18T04:20Z | active | branch created from fresh main | git log | baseline screenshots |
| 2026-10-18T06:10Z | active | prototype renders Lagos Island core with traffic, signs, poles | realworld.html, commits f00c4e89b..HEAD | people, roof clutter, night |
