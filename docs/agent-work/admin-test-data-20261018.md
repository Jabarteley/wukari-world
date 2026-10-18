# Agent work record

## Identity

- **Work ID:** `20261018-admin-test-data`
- **Owner:** Claude Fable 5.1 (T3 Code thread, owner's Mac)
- **Model / effort:** `claude-fable-5-1 / default`
- **Thread:** local
- **UTC updated:** `2026-10-18T08:06:00Z`
- **Status:** `complete`
- **Work state:** `deployment`

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
- **Current commit:** `2fc749b20`, merged with main `21a34d8d6` as `7d219e3f4` (public main)
- **Dirty status:** only the owned paths above plus this record
- **Port/process ownership:** none (the open-mode dev server used for screenshots was stopped).

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

1. On the live admin: Players → Test sessions → Remove all (root); expect ~8,800 removals in batches of 500.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `verified` — live build `joinallworld-7d219e3f4fa4a5bac8423ce2af5` (CI 39104401505 success; wrangler deploy; release-continuity after ok; live smoke PASS 15 checks with `SMOKE_CITIES=abuja,ibadan,nairobi`).
- **Release gate:** full `npm test` on the pre-merge commit: 6174/6274 pass; the 96 failures (scene/street rendering, story state ordering, onboarding look fields, local cache files) were sampled on base `377300fab` and fail there too. Edge admin tests pass on the merged commit.
- **References:** `docs/ADMIN.md` (Test sessions), `scripts/smoke.ts`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-18T05:40:00Z | verified-local | Probe sessions, removal tool, admin UI polish | admin.test.ts probe test pass; typecheck clean; screenshots | check:fast, commit, deploy |
| 2026-10-18T07:15:00Z | complete | Merged main 21a34d8d6, pushed 7d219e3f4, deployed | CI 39104401505; live health; smoke PASS | owner presses Remove all once |
| 2026-10-18T07:50:00Z | active | Dashboard redesign after the owner asked for design-skill guidance: overview as one stats slab (2/3/6 columns), h2 section headings, table captions and scopes, meters with words not colour alone, cities capped at 12 with Show all, skip link, tabular numerals, columns dropped on narrow screens so no table scrolls sideways | typecheck clean; admin unit tests 19/19; CDP screenshots at 1400/820/390 (host-local /tmp/adm-dash2-*.png, /tmp/adm-dash3-phone.png); overflow probe at 390: scrollWidth 390 | check:fast, push, CI, deploy |
| 2026-10-18T08:06:00Z | complete | Dashboard redesign live as 251438a1e (reached main via PR #39's merge; deployed by wrangler, and by GitHub run 39109081984) | CI 39109079541 success; live health 251438a1e; smoke PASS 15 | owner presses Remove all once |
