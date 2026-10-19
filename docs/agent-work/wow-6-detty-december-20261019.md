# Agent work record

## Identity

- **Work ID:** `2026-10-19-wow-6-detty-december`
- **Owner:** Claude (Opus 5.5) sub-agent for Phase 6 of the wow plan
- **Model / effort:** `claude-opus-5-5 / default`
- **Thread:** `local`
- **UTC updated:** `2026-10-19T12:00:00Z`
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Phase 6 of `docs/WOW-PLAN.md` (Detty December): a 1–31 December (WAT) season in Lagos, Accra and Abuja that switches itself on, with an admin preview switch.
- **In scope:** the season rules and lists, the lazy December city skin, nightly events and owambe Saturdays, the Returnee badge (server-checked), the daily drop, the December entry words for `/visit/<city>` and the `/detty` address, the season card, tests and docs.
- **Out of scope:** pushing, deploying, `wrangler.jsonc`, the release guard, new city venues (Labadi Beach is not an Accra venue yet: the beach day uses the city's recreation park until one is added), share-card server kinds (Phase 4 owns `server/growth/share.ts`).
- **Exclusive file ownership:** `src/festivals/detty*.ts`, `src/app/features/detty/`, `server/routes/detty.ts`, `server/detty/`, `server/detty.test.ts`, `docs/DETTY-DECEMBER.md`, this record.
- **Shared files, lines added only:** `src/festivals/calendar.ts` (the old `ng-detty-december` row), `src/entry-variants.ts`, `server/path-meta.ts`, `src/paths.ts`, `src/app/features/paths/routing.ts`, `src/scene/venue-scenes.ts` (one hook), `src/app/features/growth/EventsApp.vue`, `server/routes/index.ts`, `server/keyed.ts`, `server/admin/erasure-data.ts`, `docs/FESTIVALS.md`, `docs/ENTRY.md`.
- **Input contract:** main at `3010cc17e`.
- **Output contract:** one commit on this branch; the integrator merges and deploys.
- **Dependencies:** none. Phase 2 (weekly world events) and Phase 4 (share loops) work in parallel; overlap expected only in `EventsApp.vue` and the route index (added lines).

## Repository state

- **Repo:** Allworld (this repository)
- **Host:** owner's Mac, agent worktree
- **Branch / worktree:** `worktree-agent-ad512e3a8244ef2d4` in `.claude/worktrees/agent-ad512e3a8244ef2d4`
- **Base:** `3010cc17e7efe02fd4ffff70409ff1a0e4bf1c0b`
- **Current commit:** see checkpoint history
- **Dirty status:** dirty (own work in progress)
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Season rules, lists, skin, client hook, routes, store, Events-app part, entry words, `/detty`, Returnee on the profile, export and erasure — see `docs/DETTY-DECEMBER.md`.
- `npm run -s typecheck` — clean.
- `node --experimental-strip-types --test src/festivals/detty.test.ts src/app/features/detty/dettyEvents.test.ts server/detty.test.ts src/festivals/calendar.test.ts` — 11 + 4 + 6 + 14 pass.
- Related suites unchanged against base `3010cc17e` (same pass/fail counts on a clean base checkout): entryModel 10/0, paths 14/0, path-meta 13/0, client paths 18/0, feed 17/0, keyed 20/0, sqlite-release 14/0, sqlite-migration 12/0, store 17/0; pre-existing environment failures identical on base: admin/festivals 11/11, admin/links 9/12, feed-located 5/2, registry 6/7, protocol 3/2, scenes 15/10.
- `npx vite build && npm run -s size:download` — pass, overBudget 0; startup raw +9 B (the `detty` entry word), gzip/brotli flat or lower; first paint raw unchanged.

### In progress / blockers

- None. Not visually checked on a device yet (see the next steps).

### Immediate resume steps

1. Read `docs/DETTY-DECEMBER.md` and `src/festivals/detty.ts`.
2. `npm run -s typecheck`; `node --experimental-strip-types --test src/festivals/detty.test.ts src/app/features/detty/dettyEvents.test.ts server/detty.test.ts`.
3. Integrator: merge, then try it on a test server with Admin → World → Settings → Detty December preview, and turn the preview off again.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** typecheck, targeted tests, `npx vite build && npm run -s size:download`
- **References:** `docs/WOW-PLAN.md` (Phase 6), `docs/FESTIVALS.md`, `docs/ENTRY.md`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-19T12:00Z | active | Registered | this file | implement |
| 2026-10-19T15:30Z | verified-local | Phase 6 implemented and tested; committed on the branch | see Done | integrator merges |
