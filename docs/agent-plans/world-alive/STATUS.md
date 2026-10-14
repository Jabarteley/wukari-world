# Status

Read this first in every session; update it after every phase and whenever you stop. Keep it short and true: what is live,
what is pushed but not live, what is next, what is blocked. Newest entries at the top of each section.

## Now

- **Live:** Phases 1 to 6 (release 3, `e031c6e5`, 14 October 2026).
- **In progress on branches** (merged into `main` only once reviewed and checked): Phase 7
  (`claude/alive-p7-light`: built, but over the first-download limit and being trimmed), Phase 8 (`claude/alive-p8-gist`),
  Phase 9 (`claude/alive-p9-router`).
- **How the work is run:** each phase is built on its own branch, reviewed, merged into the integration branch
  `claude/world-alive`, checked there, then pushed to `main` and released. The full build needs about 5 GB of memory, so builds and
  download sizes are checked by dispatching the `CI` workflow on a branch (`gh workflow run CI --ref <branch> -f full_checks=false`).
  The typecheck needs `NODE_OPTIONS=--max-old-space-size=3584`.
- **The first download is nearly full.** `vite.config.ts` puts every file under `src/game/` into the `engine` chunk, which is in
  the first download, even when only lazy code imports it. A new module under `src/game/` that only the server or a lazy panel needs
  gets an exception there (as the weather modules have). Room after release 3: 134 bytes raw at startup (a branch `claude/alive-startup-room` is freeing space), 24 bytes gzip in the
  scene chunk.
- **Next step:** finish, merge and release Phases 5, 7, 8 and 9, then Phase 10.

## Phases

| Phase | State | Live commit | Notes |
| --- | --- | --- | --- |
| 0 Baseline | live | `5322f585` | Baseline below. |
| 1 Online count with agents | live | `9130449f` | Count includes agents; the sheet splits people and agents, with See who's here and Invite. There is no separate list of agents yet: People marks every AI agent. |
| 2 Safety around AI characters | live | `b6d2eaab` | Word filter on every AI line to a person (docs/AI-SAFETY.md), no money asks, "are you an AI?" and crisis answers by the game, under-18 rules, two new report reasons. Memory controls wait for Phase 12; break reminders and voice limits for Phase 15. Not covered yet: group chats that include an agent; a request split over two lines. |
| 3 Friendship after shared play | live | `b6d2eaab` | Card after table games and after 5 minutes together in voice, thanks-and-gifts record, day 1/7/30 return split on the dashboard (docs/FRIENDSHIP.md). No gate was tightened, because that would lock people out of what they use; the ladder is shown as information. Agents do not sit at tables yet, so only voice offers can show an agent. |
| 4 World feed | live | `b6d2eaab` | MET Norway weather and daily rates kept by the server, `GET /api/world/feed?id=<city>`, credits in Help (docs/WORLD-FEED.md). |
| 5 Money in the city's currency | live | `e031c6e5` | `money(amount, city)` at the day's rate, frozen per feed day; Nigerian cities unchanged byte for byte; "≈ ₦" on the main amounts (docs/CURRENCY.md). Amounts show ₦ for about 1.5 s until the feed answers; text built on the server and typed-amount inputs stay in ₦. |
| 6 Shareable moment cards | live | `b6d2eaab` | Cards for table wins and Hall of Records entries (docs/SHARE-CARDS.md). The wedding card is ready, but the game has no marriages yet. A real WhatsApp share still needs checking by hand. |
| 7 Data-light mode | in progress | | Built (docs/DATA-LIGHT.md); being trimmed to fit the first download. |
| 8 Gist and the world ledger | in progress | | |
| 9 Model router and budget | in progress | | |
| 10 House agents and action library | not started | | |
| 11 Missions from agents | not started | | |
| 12 Talking, memory, relationships | not started | | |
| 13a One resident in shadow | not started | | |
| 13b Thirty residents | not started | | |
| 13c Ideas, assembly, president, letter | not started | | |
| 14 Prayers and acts | not started | | |
| 15 Calls with agents | not started | | |
| 16 Festivals, owambe, match nights | not started | | |
| 17 City texture packs | not started | | |
| 18 Real price levels | not started | | |
| 19 Smaller features | not started | | |
| 20 Agents' relationships and world events | not started | | |

States: not started · in progress · pushed, not yet live · live · blocked (say on what).

## Questions for the owner

Ask these in your chat as well; record the answer here when you have it.

1. **Releases from GitHub need a Cloudflare token.** The release workflow in `kromate/joinallworld` builds, but its deploy step
   needs `CLOUDFLARE_API_TOKEN` in the repository's `production` environment. (`CLOUDFLARE_ACCOUNT_ID` was added on 14 October
   2026.) The owner creates a Cloudflare API token from the "Edit Cloudflare Workers" template for the account, and adds it at
   GitHub → kromate/joinallworld → Settings → Environments → production → Add secret. Still missing on 14 October; meanwhile the
   release workflow seals the package and it is deployed with the owner's own signed-in deploy tool, after checking the archive and
   package digests the workflow printed.
2. **OpenRouter credit.** The OpenRouter account was on the free tier on 14 October 2026 (50 free requests a day). A one-time
   US$10 credit lifts free models to 1,000 a day.
3. **MET Norway agreement.** Their terms ask heavy commercial users to agree with them; ask once the game has real traffic.
4. **Should AI characters flirt with confirmed adults?** Phase 2 allows it in a direct chat with a player who said they are 18
   or older, and never in public places. Say if it should wait for the opt-in partner feature of Phase 12.
5. **The friendship card's gift** is a fixed ₦200. Is that the amount you want?
6. **Keep the last rates on the phone?** Amounts show ₦ for about 1.5 s on load until the feed answers; caching the last rates
   would show the local currency at once (a small first-download cost).

## Failing on `main` before us

Checked on 14 October 2026 (Node 22, one file at a time; the full `npm test` needs a build and was not run here):
- `server/pulse.test.ts` (8 of 14), `server/registry.test.ts` (7 of 12), `server/social.test.ts`, `server/admin/history.test.ts`,
  `server/growth.test.ts`, `server/money-request.test.ts`, `src/types/protocol.test.ts`: the server answers 503 because the city
  content is not built. `npm run cities:assets` and `npm run words:assets` first (no full build needed), and most pass.
- `src/map3d/geo/atlas.test.ts`: "open versus coming soon is derived from the additive city catalogue".
- Reported before us and not re-checked: `src/game/cities/allCities.test.ts`, `legacyLife.test.ts`, `liveBuildLife.test.ts`,
  `mapEntries.test.ts`, `src/scene/scenes-fct.test.ts`, `src/game/living-world/vehicle-boarding.test.ts`,
  `vehicle-clearance.test.ts`, `src/ui/phone/phone.test.ts`, `server/new-player.test.ts`.

## Measures to keep (Phases 3, 13, 15)

- Return on day 1, 7 and 30, split by ad source and by "has a friend" (the admin dashboard's "Coming back" table, from Phase 3).
- Residents: model spend per day, thoughts per resident per day, rule slips, out-of-character retries, talk with strangers,
  businesses started, friendships kept.
- Speech to text: words right and delay, per accent, for each way.

## Log

Newest first. One entry per release: date, phase, commit, what a player gains, checks (typecheck, build, sizes, tests, CI,
smoke), anything left.

- 2026-10-14, release 3 (Phase 5), `e031c6e5`, live: money shows in the city's own currency. Checks: typecheck clean; money,
  feed and pill tests pass; CI build and limits ok (startup 614,866 of 615,000 raw); release workflow checks passed; live
  `/api/world/feed?id=accra` answers GHS; `SMOKE_CITIES=lagos` smoke PASS.
- 2026-10-14, release 2 (Phases 2, 3, 4, 6), `b6d2eaab`, live: AI characters' words are checked before people see them; friend
  offers after table games and voice; real weather and exchange rates; share cards for wins and the Hall of Records. Checks:
  typecheck clean; CI build, download limits and smoke passed on the merged branch; the release workflow's Worker checks passed
  after one stale expectation was updated (the table card's picture); live `/api/health` shows the commit; `SMOKE_CITIES=lagos`
  smoke PASS; `/api/world/feed?id=lagos` answered real weather and the day's NGN rate within ten minutes of going live.
- 2026-10-14, release 1 (Phase 1), `9130449f`, live: the top bar counts people and AI agents together and opens a sheet with the
  split. Checks: typecheck clean; CI build, download limits and smoke passed; the touched tests pass (`onlinePill`, agents);
  release workflow sealed the package; live `/api/health` shows the commit; `SMOKE_CITIES=lagos` smoke PASS (12 checks).
- 2026-10-14, Phase 0: baseline `5322f585`, live `913eecb4`. The release token is missing (question 1).
- 2026-10-14: brief tidied: removed a stale duplicate draft from DESIGN.md (its defaults were superseded by the owner's decisions); added voice cost, break limits and the residents experiment.
- 2026-10-14: brief written (this folder). Nothing implemented yet.
