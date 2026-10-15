# First-person control in More menu

## Identity

- **Work ID:** `first-person-menu-20261015`
- **Owner:** `/root/studio_types`
- **Model / effort:** `gpt-6-luna / medium`
- **Thread:** `/root/studio_types`
- **UTC updated:** `2026-10-15T13:18:05Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** move first-person view selection from the floating scene control into the existing More menu while preserving its single controller lifecycle and retry behavior.
- **In scope:** `src/app/state/app.ts`, `src/app/features/hud/HudSidebar.vue`, `src/app/scene/SceneViewToggle.vue`, and this record.
- **Out of scope:** `src/ui/shell.css`, ScenePane lifecycle changes, controller/preferences/retry redesign, tests, browser/build/commit/push.
- **Exclusive file ownership:** this record and the three assigned source paths only. Existing dirty provider/first-person changes in other files are preserved.
- **Input contract:** candidate source at `a9141b12085f631b256e3088ab0753f121f576aa` with dirty release integration; current `SceneViewToggle` contains the accepted `Reload to retry` fix.
- **Output contract:** `scene.viewChoice` display contract `{label,title,text,pressed,busy,error,toggle:()=>void}|null`, published by the existing SceneViewToggle lifecycle and consumed by a 44px More-menu row visible only while venue mode and choice are available. Keep the menu open through async loading.
- **Dependencies:** Astra-reviewed interaction design from `/root/first_person_review`; parent owns integration and verification.

## Repository state

- **Repo:** JoinAllworld release worktree.
- **Host:** local Codex worktree `/Users/anthonyakpan/.codex/worktrees/first-person-release-20261015/JoinAllworld`.
- **Branch / worktree:** `codex/first-person-release-20261015`.
- **Base / current commit:** `a9141b12085f631b256e3088ab0753f121f576aa`.
- **Dirty status:** pre-existing parent-owned provider/progression changes and accepted first-person retry/pose changes exist; only the three specified paths and this record are owned for this unit.
- **Port/process ownership:** no server or browser owned; no browser/build requested.

## Progress

### Done and exact evidence

- Read root `AGENTS.md`, current coordination section, template, parent release record, browser record, and final gate record.
- Confirmed `SceneViewToggle` owns lazy first-person setup and contains the existing full-page `Reload to retry` action. `ScenePane.vue` mounts it only while the pane is ready; `HudSidebar.vue` owns the existing More menu.
- Astra confirmed the final display callback shape and requested that HUD call only `choice.toggle()` without duplicate preferences/retry logic.
- Added the per-app shallow ref and `SceneViewChoice` contract. `SceneViewToggle` publishes display state with `watchEffect` and clears it when its host is unavailable or the component unmounts. The floating control and its scoped style are removed; `FirstPersonJourney` and the existing reload-on-failure fix remain.
- Added a 44px+ row near the top of the existing More menu, only for venue mode while the choice exists. It calls the supplied scene-owned callback, keeps the menu open, reflects active/busy state, and exposes campus/error status. HUD imports no controller or preference/retry logic.
- `git diff --check -- src/app/state/app.ts src/app/features/hud/HudSidebar.vue src/app/scene/SceneViewToggle.vue` passed.

### In progress / blockers

- Full typecheck and browser review remain with the parent/Astra; no typecheck was run because the project-wide five-project check is a shared heavy-slot job rather than a lightweight focused check.

### Immediate resume steps

1. Parent reviews the finite three-file diff and runs the candidate full typecheck.
2. Astra verifies the More-menu position, venue-only visibility, campus paused status, menu persistence during loading, and retry behavior on the served candidate.

## Release state

- **Local implementation:** `active`
- **Deployment:** `not-requested` for this unit
- **Release gate:** parent integration, exact-source checks, and Astra browser replay remain separate.
- **References:** `docs/agent-work/first-person-release-20261015.md`; `docs/agent-work/first-person-browser-release-20261015.md`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T13:18:05Z | active | Registered the scoped menu relocation; dirty first-person retry fix is preserved. | HEAD, targeted diff, relevant records, Astra design reply | Implement display contract and menu row |
| 2026-10-15T13:18:05Z | ready-for-review | Added scene-owned menu display state and More row; removed floating button and scoped styles. | Three-file diff; `git diff --check` passed | Parent full typecheck and Astra served UI review |
