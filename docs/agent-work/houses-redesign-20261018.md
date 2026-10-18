# Agent work record: Houses page redesign

## Identity

- **Work ID:** `houses-redesign-20261018`
- **Owner:** the Spaces in 3D thread (T3 Code, owner's Mac); follows `spaces3d-20261018`
- **Model / effort:** default / default
- **Thread:** T3 Code thread (this programme's)
- **UTC updated:** `2026-10-18T20:40:00Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** the Houses app leads with the player's house and its three everyday actions (Walk in, Arrange, Invite), explains the other six as tiles, folds the long sections, and the AI design, AI host and 3D model flows each end where the player wants to be (in the house). The picture at the top is the house Walk in 3D builds, photographed, not a drawing.
- **In scope:** `src/app/features/home/HousesApp.vue`, `src/app/features/home/homeModel.ts` (+ test), `src/ui/panels/houses.css`, `src/app/features/travel/MyHouse.vue` (a `part` prop, same markup), `src/app/features/spaces/**` (sheets, WorldScreen, a house-photo module), `src/spaces/world/engine.ts` (drag a chosen model while placing), `docs/SPACES-3D.md`, this record.
- **Out of scope:** the Desktop checkout; ports 5173, 5174, 5180; `src/scene/**`, `src/street/**`, `server/**` except nothing, `src/housing-studio/**`; the first-download and scene-host budgets; stored data shapes.
- **Exclusive file ownership:** the paths above for the life of this record.
- **Input contract:** `origin/main` at `547ebe3e` (Spaces 3D live, PR #42).
- **Output contract:** a PR to `main`, CI green, released and checked on the live site.
- **Dependencies:** none new. Walk in 3D, AI design and AI hosts stay behind their operator switches.

## Repository state

- **Repo:** JoinAllworld, clone outside the Desktop and iCloud
- **Host:** owner's Mac
- **Branch / worktree:** `claude/houses-redesign`
- **Base:** `547ebe3e`
- **Port/process ownership:** own dev server on 5210 while testing; stopped when the work ends.

## Progress

### Done and exact evidence

- Design agreed with the owner 18 Oct (mockup in the thread): house first, three actions, six tiles with a line each, folded sections with live summaries. Owner's three corrections: tiles aligned with the icon above the words (no side icon); the AI design, AI host and 3D model flows must finish (upload → drag into place); the picture must be the real house.

- Built on `claude/houses-redesign`. Typecheck clean (5 projects). Tests: `homeModel.test.ts` (new, 2 pass), `panelsA.test.ts` Houses case passes, `settleNotice`, `travelLevels`, `worldModel`, `src/spaces/*.test.ts` pass. The two Boutique failures in `panelsA.test.ts` fail on `main` `547ebe3e` too (checked in a clean worktree) and are not this work's.
- Checked in a browser at 390×844 on an open-mode server (port 5211): the house photo (front door side), the three actions, equal-height tiles, folds with live lines; My 3D models → upload `race-car.glb` → "Put race car in my house" → 3D screen with the car in front → drag moves it (also across a wall, by the model's own level) → Save ("Saved. 1 model in this space."); Walk in → Place models → "Upload a .glb" inside the screen → the same; Invite opens the Visitors fold on its first button; Design with AI and AI host sheets read right with AI off.

### Next executable step

- PR, CI, merge, release, check on joinallworld.com.
