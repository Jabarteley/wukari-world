# Status

Read this first in every session; update it after every phase and whenever you stop. Keep it short and true: what is live,
what is pushed but not live, what is next, what is blocked. Newest entries at the top of each section.

## Now

- **Live:** Phases 1 to 6, 8 and 9, and the first part of 19 (release 4, see the Log).
- **Waiting for room in the scene chunk:** Phases 7 (light mode) and 16 (festivals) are merged on `claude/world-alive` and pass
  their tests, but together they put `SCENE_HOST_GZIP` 229 bytes over its limit; `claude/alive-scene-room` is freeing space.
- **Where the work happens:** the repository on the owner's Desktop is synced by iCloud and `git push`/`fetch` hang there. The work
  is done in a clean clone outside the Desktop. Phase branches are reviewed, merged into `claude/world-alive`, checked by CI, pushed
  to `main` and released.
- **Checks:** the full build needs about 5 GB of memory, so builds and download sizes are checked with
  `gh workflow run CI --ref <branch> -f full_checks=false`. The typecheck needs `NODE_OPTIONS=--max-old-space-size=3584`. Server
  tests need `npm run cities:assets` and `npm run words:assets` first (no full build), or they answer 503.
- **The first download:** `vite.config.ts` puts every file under `src/game/` into the `engine` chunk, which is in the first download,
  even when only lazy code imports it; a module that only the server or a lazy panel needs gets an exception there. To see what is in
  a chunk, push a throwaway branch whose `ci.yml` uploads `dist/assets/<chunk>-*.js`, download it, and compare with `main`.
  Room after release 4: about 4 KB raw at startup, 30 bytes gzip in the scene chunk.
- **Next step:** release Phases 7 and 16 once the scene chunk has room; then Phase 10 (house agents), 11, 12, 13a.

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
| 7 Data-light mode | merged, not yet live | | Data meter, Light mode switch (lowest tier, 30 fps cap, no background downloads, music off), no drawing under a full-screen panel, a kind message before the 3D download on browsers that cannot draw it (docs/DATA-LIGHT.md). Waiting for scene-chunk room. Not yet measured on a throttled phone (docs/DATA-LIGHT.md section 6 lists what to measure). |
| 8 Gist and the world ledger | live | `95e03aa9` | Public lines from six systems (records, stalls, arrests, busy places, events, announcements), adults named only, hidden players never; Gist app on the phone, "Gist:" line in the Square, share cards, `check_gist` agent tool (docs/GIST.md). Friendships are not a source (private). |
| 9 Model router and budget | live | `95e03aa9` | One door for every model call, two providers, free first, paid-only for players' words, US$2 a day hard stop, per-player caps, weekly model report, companion moved onto it (docs/MODELS-ROUTER.md). Free gateway cap of 500 a day is a guess (question 7). |
| 10 House agents and action library | not started | | |
| 11 Missions from agents | not started | | |
| 12 Talking, memory, relationships | not started | | |
| 13a One resident in shadow | not started | | |
| 13b Thirty residents | not started | | |
| 13c Ideas, assembly, president, letter | not started | | |
| 14 Prayers and acts | not started | | |
| 15 Calls with agents | not started | | |
| 16 Festivals, owambe, match nights | merged, not yet live | | Multi-day festival calendar (NG, GH, KE, ZA, global; Eid and Ramadan dates to 2028), festive Square light, owambe parties with MC/DJ/spray (no money), match-night slots and an empty admin fixture list (docs/FESTIVALS.md). Waiting for scene-chunk room. |
| 17 City texture packs | not started | | |
| 18 Real price levels | not started | | |
| 19 Smaller features | in progress | REL | Live: "while you were away" sheet and the ask for notifications after a good moment; jail you can play (jobs, community service, visits, parole; docs/JAIL.md). Next: city projects, group gift packets, sticker pack, home-city pin, life stages. |
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
7. **Free gateway cap.** Phase 9 limits free models on the Vercel AI Gateway to 500 requests a day; that is our guess, not a
   provider limit.

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

- 2026-10-14, release 4 (Phases 8, 9, first part of 19), `95e03aa9`, live: city gist, model router with the US$2 stop, "while you
  were away", jail you can play, and 4.4 KB taken out of the first download. Checks: typecheck clean; 275 of 276 tests of the merged
  phases passed, the last (the route registry's list of namespaces) was updated; CI build and limits ok (startup 610,965 raw);
  release workflow checks passed; `SMOKE_CITIES=lagos` smoke PASS. The gist was empty for the first minutes (it fills from public
  events as they happen).
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
