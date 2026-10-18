# Agent work record

## Identity

- **Work ID:** `20261018-admin-test-data`
- **Owner:** Claude Fable 5.1 (T3 Code thread, owner's Mac)
- **Model / effort:** `claude-fable-5-1 / default`
- **Thread:** local
- **UTC updated:** `2026-10-18T05:40:00Z`
- **Status:** `verified-local`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Keep the release check's "Zz City N" guest sessions out of the admin's numbers and lists for good, let the root admin remove the ones already stored, and tidy the admin Players and Dashboard screens.
- **In scope:** `probe` sessions (flag, short lifetime, exclusion from growth, pulse visits, admin lists and economy snapshot), the admin count/remove routes and UI, the smoke script sending the flag, the Players table polish (city names, kind chips, numeric alignment, hidden-count hint), the funnel "over 100%" label.
- **Out of scope:** deleting archived lives the old probes left behind (they only feed the one-off pulse seed), other load scripts (they run against local servers), a redesign of the admin shell.
- **Exclusive file ownership:** `server/admin/probes.ts`, `server/admin/players.ts`, `server/admin/stats.ts`, `server/routes/admin.ts` (two routes), `server/protocol.ts` (probe helpers, `renewSession`), `server/routes/core.ts` (session creation/renewal lines), `server/routes/growth.ts` (hello guard), `server/pulse.ts` (see), `server/types.ts` (`probe`), `src/types/admin.ts`, `src/types/protocol.ts` (route keys), `src/app/features/admin/{PlayersView.vue,DashboardView.vue,AdminShell.vue,adminUi.ts,admin.css,charts/Funnel.vue}`, `scripts/smoke.ts`, `docs/ADMIN.md`.
- **Input contract:** main `377300fab`.
- **Output contract:** source + test (`server/admin/admin.test.ts`, "release-check probe sessions …") + this record.
- **Dependencies:** none.

## Repository state

- **Repo:** JoinAllworld, main checkout `~/Desktop/JoinAllworld`
- **Host:** owner's Mac
- **Branch / worktree:** `main`
- **Base:** `377300fab`
- **Current commit:** uncommitted on top of `377300fab`
- **Dirty status:** only the owned paths above plus this record
- **Port/process ownership:** `npm run dev -- --open --port 5190` (open mode, `.data-open`), started by this thread for screenshots; stop rule: this thread stops it when done.

## Progress

### Done and exact evidence

- Probe sessions: `probe: true` on `POST /api/session` → `SessionRecord.probe`, lifetime `PROBE_TTL_MS` (15 min) on creation and every renewal (`protocol.ts ttlFor`, `renewSession`); legacy probes recognised by name (`PROBE_NAME`). — `server/protocol.ts`, `server/routes/core.ts`
- Counted nowhere: growth hello answers `not_counted`; pulse `see` adds no visit; Players filters leave them out and return `hidden`; economy snapshot skips them and reports `probes`. — `server/routes/growth.ts`, `server/pulse.ts`, `server/admin/players.ts`, `server/admin/stats.ts`
- Removal: `GET /api/admin/test-sessions`, `POST /api/admin/test-sessions/remove` (root, batches of 500, audit `test-sessions`). — `server/admin/probes.ts`, `server/routes/admin.ts`
- UI: Players "Test sessions" chip with the removal card, hint line with the hidden count, city names, kind chips, right-aligned numbers; Dashboard subtracts probes from guests and links to removal; funnel shows "all" instead of >100%. — `src/app/features/admin/*`
- Test: `node --experimental-strip-types --test --test-name-pattern='probe sessions' server/admin/admin.test.ts` → pass 1. Related suites (`admin, auth, pulse, growth, server, limiter, protocol, release`): 123/124 pass; the one failure (`release.test.ts` "JavaScript is limited to …") lists local ignored `.cache/` and `src/models/.cache/vite` files and predates this work.
- Typecheck: `npm run typecheck` → clean (5 projects, 0 errors).
- Screenshots (host-local): `/tmp/adm-players.png`, `/tmp/adm-tests.png`, `/tmp/adm-dash.png` from the open-mode dev server at 1400×900.

### In progress / blockers

- none

### Immediate resume steps

1. `npm run check:fast`, then commit and deploy per `relay/DEPLOY.md` (standing permission).
2. On the live admin: Players → Test sessions → Remove all (root); expect ~8,800 removals in batches of 500.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** `check:fast` + smoke against the deployed build (the smoke now sends `probe: true`; its sessions should show under Test sessions and expire in 15 min).
- **References:** `docs/ADMIN.md` (Test sessions), `scripts/smoke.ts`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-18T05:40:00Z | verified-local | Probe sessions, removal tool, admin UI polish | admin.test.ts probe test pass; typecheck clean; screenshots | check:fast, commit, deploy |
