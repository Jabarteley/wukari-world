# Agent work record

## Identity

- **Work ID:** `2026-10-19-ad-phase1-street`
- **Owner:** `Claude subagent (worktree agent-a62b3b3a354e1d1c1)`
- **Model / effort:** `Claude Opus / standard`
- **Thread:** `local`
- **UTC updated:** `2026-10-19T04:00:00Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Ad-ready plan Phase 1 ("Zoom to your street") and the Phase 7 entry variants (`/politics`, diaspora `/visit`).
- **In scope:** `/street/<city>/<lga>` and `/visit/<city>` addresses (path table, link preview on both hosts), the timed dive backdrop behind the entry card, "Find my street" on the entry card (on-device only), arrival in the city/neighbourhood, a `street` share card, the `/politics` entry variant and diaspora wording.
- **Out of scope:** pushing, deploying, wrangler.jsonc, Phases 2-6, any budget raise.
- **Exclusive file ownership:** `src/paths.ts`, `src/entry-variants.ts`, `server/path-meta.ts`, `src/app/features/paths/*`, `src/app/features/start/EntryPage.vue`, `src/map3d/dive*.ts`, `server/growth/share.ts`, `src/game/share-model.ts` (street kind only), tests beside them, this record.
- **Input contract:** main `d87b4d89f`.
- **Output contract:** one commit on branch `worktree-agent-a62b3b3a354e1d1c1`; integrator merges and deploys.
- **Dependencies:** none.

## Repository state

- **Repo:** JoinAllworld
- **Host:** owner's Mac
- **Branch / worktree:** `worktree-agent-a62b3b3a354e1d1c1` / `.claude/worktrees/agent-a62b3b3a354e1d1c1`
- **Base:** `d87b4d89f`
- **Current commit:** `d87b4d89f`
- **Dirty status:** clean after the commit
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Setup: `npm run -s pretest` passed. node_modules in this worktree is a directory of links to the main checkout's, with `three` and
  `meshoptimizer` copied: the scene factory's host-scenery pins refuse a symlinked real path ("resolves outside the repository").
- Addresses `/street/<city>/<place>`, `/visit/<city>` (PathIntent `street`, PLACE_WORDS in FIXED_WORDS, `streetPlace`), `/politics`,
  `/street`, `/visit` entry variants; link preview on both hosts (`preparePathMeta` reads the city's rules first; the Worker installs the
  city asset reader in the page path) — `src/paths.test.ts`, `server/path-meta.test.ts`, `src/app/features/start/entryModel.test.ts`,
  Worker: `deploy/cloudflare.test.ts` "a street: the Worker reads the city's rules…" (with JOINALLWORLD_TOOLS=<main>/deploy/tooling).
- Timed dive behind the entry card (`src/map3d/dive.ts` entryBackdrop/entryDivePlan, `src/map3d/entry-dive.ts`,
  `src/app/features/start/streetEntry.ts`, EntryPage.vue) — `src/map3d/entry-dive.test.ts` (plan, driver on fakes, Play-never-blocked scan).
- Arrival: city map on the place's local unit; travel card from another city — `src/app/features/paths/paths.test.ts`.
- Find my street (findCity returns the local unit's id and name) — `findCity.test.ts`, `locate.test.ts` unchanged list.
- `street` share card, LGA panel "Share <unit>", CrewsApp "Share place" — `server/share-cards.test.ts`, `worldComponents.test.ts`.
- Typecheck clean; component tests `startComponents.test.ts` pass.
- `npm run -s build && npm run -s size:download`: all budgets ok, no budget changed (startup brotli 195,650 / 196,100; first paint
  35,391 / 36,800; startup raw 611,880 / 616,000). New lazy chunks `streetEntry`, `entry-dive`.

### In progress / blockers

- None. Known pre-existing failure, not from this work: `deploy/cloudflare.test.ts` "short addresses…" expects a head on `/cities`,
  which the Worker serves as the scene catalogue page (server/scene-catalogue.ts).

### Immediate resume steps

1. Integrator: merge the branch, run the release steps (tests, upgrade check, smoke).
2. By hand on a phone: open `/street/lagos/yaba` and `/visit/lagos` (the dive behind the card, Play, the map on the unit), and share a
   street card to WhatsApp to check its preview.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** targeted tests, typecheck, build + size:download; integrator's release steps.
- **References:** `docs/AD-READY-PLAN.md` (main checkout), `docs/ENTRY.md`, `docs/MAP-ZOOM.md`, `docs/SHARE-CARDS.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19 | active | Registered | this file | implement |
| 2026-10-19 | ready-for-review | Phase 1 and Phase 7 entry variants implemented, committed on the branch | targeted tests, typecheck, build + size:download | integrator merges |
