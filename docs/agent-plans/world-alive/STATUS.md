# Status

Read this first in every session; update it after every phase and whenever you stop. Keep it short and true: what is live,
what is pushed but not live, what is next, what is blocked. Newest entries at the top of each section.

## Now

- **Every phase in PHASES.md is built and live** (release 13, `1bb55dc5`, 15 October 2026). What is left needs the owner: the
  questions below, and the speech-to-text recordings.
- **Residents are on and visible, three in every open city** (decision of 15 October: Remi approved; `residentsPerCity` 3, `residentShadow` off,
  about 852 residents, rules by default and the model only in a small share, docs/RESIDENTS.md "Residents everywhere"). House agents: two in Lagos to start (`houseAgentsBusy`).
- **Releases from GitHub work** since 14 October: `CLOUDFLARE_API_TOKEN` (secret) and `ALLWORLD_CF_ACCOUNT_ID` (variable) are set
  in the `production` environment, and the release workflow deployed `63e0f3d2` on its own.
- **Where the work happens:** the repository on the owner's Desktop is synced by iCloud and `git push`/`fetch` hang there. The work
  is done in a clean clone outside the Desktop. Phase branches are reviewed, merged into `claude/world-alive`, checked by CI, pushed
  to `main` and released.
- **Checks:** the full build needs about 5 GB of memory, so builds and download sizes are checked with
  `gh workflow run CI --ref <branch> -f full_checks=false`. The typecheck needs `NODE_OPTIONS=--max-old-space-size=3584`. Server
  tests need `npm run cities:assets` and `npm run words:assets` first (no full build), or they answer 503.
- **The first download:** `vite.config.ts` puts every file under `src/game/` into the `engine` chunk, which is in the first download,
  even when only lazy code imports it; a module that only the server or a lazy panel needs gets an exception there. To see what is in
  a chunk, push a throwaway branch whose `ci.yml` uploads `dist/assets/<chunk>-*.js`, download it, and compare with `main`.
  Room after release 5: about 2.7 KB raw at startup, about 1.5 KB gzip in the scene chunk.
- **Next step:** a cache-first pass (show what was last seen at once, refresh in the
  background: the owner asked for it on 14 October), then Phases 11, 12, 13a.

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
| 7 Data-light mode | live | `8ac05891` | | Data meter, Light mode switch (lowest tier, 30 fps cap, no background downloads, music off), no drawing under a full-screen panel, a kind message before the 3D download on browsers that cannot draw it (docs/DATA-LIGHT.md). Not yet measured on a throttled phone (docs/DATA-LIGHT.md section 6 lists what to measure). |
| 8 Gist and the world ledger | live | `95e03aa9` | Public lines from six systems (records, stalls, arrests, busy places, events, announcements), adults named only, hidden players never; Gist app on the phone, "Gist:" line in the Square, share cards, `check_gist` agent tool (docs/GIST.md). Friendships are not a source (private). |
| 9 Model router and budget | live | `95e03aa9` | One door for every model call, two providers, free first, paid-only for players' words, US$2 a day hard stop, per-player caps, weekly model report, companion moved onto it (docs/MODELS-ROUTER.md). Free gateway cap of 500 a day is a guess (question 7). |
| 10 House agents and action library | live | `84917cdc` | Rule-run cast in venues with hours (Lagos: a cloth seller and a guide to start; other cities 0, admin settings `houseAgents*`), action library, wake on a person's line, haggling with a floor in code (max discount 15%, never over 30%), model only phrases (paid list, 220 tokens), written lines otherwise (docs/HOUSE-AGENTS.md). No DMs to house agents yet; a deal is a held quote until Phase 11. |
| 11 Missions from agents | live | `ac94fca0` | Tasks a house agent gives in person from templates filled in from the person's life, shown in Missions with the agent and where to find it; new triggers talk to an agent, hand an item, bring a friend, play with another person; the hand-over completes a haggled price (docs/AGENT-MISSIONS.md). The model only rephrases the brief (cached per template and agent). Rewards inside the daily (₦250) and weekly (₦1,000) figures, checked by the life. |
| 12 Talking, memory, relationships | live | `ac94fca0` | House agents remember up to five facts per person (never contacts or money), the person sees, deletes or turns it off (Settings), closeness, partners for confirmed adults, and flirting with a partner or an adult's own yes (docs/AGENT-MEMORY.md). No DMs to house agents yet. |
| 13a One resident in shadow | live | `ac94fca0` | Remi, a Lagos bookseller: life story, sleep, a model chosen at birth, thoughts as validated choices, nightly summary, shadow (nobody sees her), her day on the admin page (docs/RESIDENTS.md). On by default on the live hosts, in shadow. |
| 13b Thirty residents | live; **15 Oct: three in every open city, visible (branch `claude/alive-residents-everywhere`)** | `ea9f5ddd` | Thirty authored residents (Remi + 29: Lagos, Abuja, Ibadan, Accra, Nairobi, Cape Town, London, New York; Johannesburg and Houston are not open cities), setting `residentCount` (default 1; **retired 15 October**), models spread at birth, agent-to-agent talk (4 turns, grounded in a real ledger line, repetition check), replies to people when visible (no trading, paid models only), `residentDailyCents` budget (default 100), admin comparison of models and the experiment's measures (docs/RESIDENTS.md). Day-1/day-7 return split not built (needs a growth-metrics bit); the page counts people who spoke and who spoke again. **15 October (owner's decision, Remi approved):** `residentsPerCity` (default 3, about 852 residents in the 284 open cities: the authored first, the rest generated from the city and a seed, the same every restart), `residentShadow` off, personality changes routines, outings, talk, prayer, friendship and quarrels by rules; the model only for people who speak to a resident, a rotating quota of deep thoughts (`residentDeepPerDay` 240) and the night of those who met a person; at most 48 residents stepped a beat; 476 KB for the world in 16 small collections; when the budget is spent they carry on by rules (docs/RESIDENTS.md). |
| 13c Ideas, assembly, president, letter | live | `1bb55dc5` | Each night a resident may file one wish and one need (checked, merged by word overlap, top five a day); a weekly residents' assembly elects a president with the people's election code (it holds no people's seat); the president's Sunday letter "to the Founders" on the admin Residents page; the owner's reply becomes a gist line and "news from the Founders" in residents' thoughts, never a message to a person (docs/RESIDENTS.md, docs/POLITICS.md). |
| 14 Prayers and acts | live | `545caabb` | Remi prays once a day; players pray at a church, mosque or shrine after the notice that prayers are read; admin Prayers page and eight acts (heal, illness at most weekly and never on a minor, give/take game money, bless a stall, weather for 1 to 6 hours, dream, cross paths, silence), all logged, shown as gist lines, never as messages from the owner (docs/PRAYERS.md). |
| 15 Calls with agents | live | `ea9f5ddd` | Call a house agent from Settings → AI characters: push-to-talk, the AI mark, its reply spoken on the phone in its own voice (text only crosses the network); speech to text by the browser or by the gateway's transcription model (WAV, budgeted, never stored); 20 minutes a day each, 300 in all, a break reminder every 10 minutes; agents' lines spoken in room voice (docs/CALLS.md). Words-right per accent NOT YET MEASURED: needs recordings (scripts/stt-bench, collect.html). |
| 16 Festivals, owambe, match nights | live | `8ac05891` | Multi-day festival calendar (NG, GH, KE, ZA, global; Eid and Ramadan dates to 2028), festive Square light, owambe parties with MC/DJ/spray (no money), match-night slots and an empty admin fixture list (docs/FESTIVALS.md). |
| 17 City texture packs | live | `abec6f54` | Ride banter packs (Lagos danfo, okada, keke, cab; Accra, Nairobi, South Africa starters; no lyrics, no danger or scam words), the district's published light plan and cut notices with generator/inverter (docs/CITY-TEXTURE.md). Haggle-to-purchase comes with Phase 11. No solar item (scene chunk room). |
| 18 Real price levels | live | `7c084ca6` | World Bank price levels (2021, the last surveyed year: 2025's figures put Accra at 3× Lagos after the naira float), Nigeria = 1, clamped 0.5 to 4: rent, pay, activity and shop prices scaled per country; Nigerian cities unchanged (docs/PRICE-LEVELS.md). Not scaled yet: the starting purse, family loan, goal targets, intercity fares, wardrobe, the launch bonus. |
| 19 Smaller features | live | `7c084ca6` | Away sheet, notification ask, jail you can play (release 4); city works funded together, group gift packets (game money), 30 text stickers, a home-city pin (on the device), opt-in birthdays (docs/SMALLER-FEATURES.md). Not built: passing property to a next character (needs its own design: no rollback). |
| 20 Agents' relationships and world events | live | `1bb55dc5` | Residents' closeness, quarrels (a silence that ends or fades), marriage after 21 days of closeness and both choosing it, weddings on a Saturday at a public place announced in the gist with the wedding share card, friends and spouses on profiles, admin-only gentle farewells; all on paper in shadow; nothing with one resident (docs/RESIDENTS.md). No children (the cast does not grow). |

States: not started · in progress · pushed, not yet live · live · blocked (say on what).

## Questions for the owner

Ask these in your chat as well; record the answer here when you have it.

1. **MET Norway agreement.** Their terms ask heavy commercial users to agree with them; ask once the game has real traffic.

2. **The friend gift needs earned money.** ₦5,000 is the most one gift may be, and a gift must come from money earned at work,
   so a new player cannot send it yet (the card says so). Offer a smaller gift to them?
3. **House agents to start:** two in Lagos, none elsewhere. More?

4. **Speech-to-text recordings (Phase 15).** Words-right per accent is not measured: record short samples of Nigerian, Ghanaian,
   Kenyan and British English and Pidgin with `scripts/stt-bench/collect.html` on phones (with each speaker's permission), then run
   `scripts/stt-bench.ts --gateway` and set the default way (`agentCallStt`) from the results.
5. **Residents:** decided on 15 October (Remi approved, three in every city, visible). To watch: the cost per day on the Residents page,
   reports about residents, and what the generated lives read like (`residentsPerCity` 0 turns them all off).
6. **Price levels:** a new player abroad starts with the same naira against higher prices (the starting purse, the family loan,
   goal targets, intercity fares, wardrobe and the launch bonus are not scaled yet). Scale them too?
7. **Home-city pin:** keep it on the device, or store it with the account so it follows the player?
8. **Passing property to a next character** (Phase 19) needs its own design (no rollback); build it?

Answered on 14 and 15 October 2026:
- OpenRouter: US$15 of credit was bought, so its free models get 1,000 requests a day (the default since release 7).
- Releases from GitHub: the token was given and set (see Now).
- AI characters and romance: confirmed adults may flirt with AI characters in private and, with the person's own yes (or a Bae),
  in public; the agent may ask in private first. Sexual content stays blocked.
- The friendship card's gift: ₦5,000.
- Keep the last rates on the phone: yes, and cache much more of what the game shows, updated in the background.
- The Vercel AI Gateway free cap: no fixed number is published (https://vercel.com/docs/ai-gateway/rate-limits); honour its 429s
  and `retry-after` instead of a cap of our own.

## Failing on `main` before us

Checked on 14 October 2026 (Node 22, one file at a time; the full `npm test` needs a build and was not run here):
- `src/game/economy.test.ts` (15 October): `scripts/economy-sim.ts` cannot complete the city stories' local missions
  (`missionRun` throws "value is missing"); came with the local missions, not from the world-alive work.
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
  **The first thirty residents are an experiment; success is (decided before launch, Phase 13b):** (1) cost per day under `residentDailyCents`
  (US$1 default) and never reaching the US$2 stop; (2) reports about residents at or below the rate for people, and no report of a rule break
  (money, details, a meeting, romance with a minor); (3) people who spoke to a resident come back at least as often as those who did not (day 1
  and day 7; today the admin page shows the number of people who spoke to a resident and who spoke again on a later day, the split against the
  growth return cells is by hand until a resident bit is added to the life record); (4) per model, slips and out-of-character retries stay a small
  share of thoughts (a model that slips more than about 1 in 20 leaves the `resident` list). Read these on the admin page group "Residents" after a
  week live.
- Speech to text: words right and delay, per accent, for each way. Not yet measured: record samples with
  `scripts/stt-bench/collect.html` on phones, then run `scripts/stt-bench.ts --gateway` (scripts/stt-bench/README.md).

## Log

Newest first. One entry per release: date, phase, commit, what a player gains, checks (typecheck, build, sizes, tests, CI,
smoke), anything left.

- 2026-10-16, release 14 (residents everywhere), `9321b79e`: three residents in every open city (~852), generated distinct personalities that
  change their behaviour, visible with the AI mark; rule-driven, the model only when a person speaks to one or from a daily quota.
- 2026-10-15, release 13 (Phases 13c and 20), `1bb55dc5`: the residents' assembly, president and Sunday letter; residents' friendships,
  marriages and weddings. With these, every phase in PHASES.md has been built.
- 2026-10-15, release 12 (Phases 18 and the rest of 19), `7c084ca6`: real price levels; city works, gift packets, stickers, home-city
  pin, birthdays.
- 2026-10-15, release 11 (Phases 13b, 15), `ea9f5ddd`, live. Main had become unreleasable (the Worker test could not complete the
  city stories' new local missions); a test-only fix let it release.
- 2026-10-15, release 11 (Phases 13b and 15), `ea9f5ddd`: thirty authored residents (only Remi runs until `residentCount` is raised),
  calls with house agents and agents' lines in room voice. Speech-to-text accuracy not yet measured (no recordings).
- 2026-10-15, release 10 (Phase 14), `545caabb`: prayers and acts. Checks: typecheck clean; 112 tests of the touched areas pass
  (the route registry's namespace list was updated); CI build and limits ok.
- 2026-10-15, release 9 (Phases 11, 12, 13a, and 6 KB more first-download room), `ac94fca0`: agents give tasks in person and sell a
  haggled item on hand-over; agents remember a little about you (yours to see, delete or turn off); partners and adults who said
  yes can flirt; Remi, the first resident, lives in shadow. Checks: typecheck clean; 182 tests of the touched areas pass; CI
  build and limits ok (startup 598,857 raw).
- 2026-10-15, release 8 (Phase 17, with release 7's cache-first pass and OpenRouter 1,000 a day), `abec6f54`, live: ride banter,
  the light plan and cut notices. The deploy was refused twice because `main` moved during the build; the third run went out.
  `SMOKE_CITIES=lagos` smoke PASS.
- 2026-10-15, release 7 (`b8e4f8f0`) was refused twice at deploy because `main` moved during the build; it went out inside release 8.
- 2026-10-15, release 7 (cache-first pass, OpenRouter 1,000 a day): the online count, gist, local-government directory and Hall
  of Records show what was last seen at once and refresh in the background (docs/PERFORMANCE.md); never money or inventory.
  Release 6 went live as `84917cdc` (a first try was refused because `main` moved during the release: rerun on the new tip).
- 2026-10-15, release 6 (Phase 10 and the owner's answers), `84917cdc`: house agents in Lagos; ₦5,000 friend gift; the phone keeps
  the last rates; flirting with AI characters in public with the person's own yes; the router follows Vercel's 429s. Checks:
  typecheck clean; 180 tests of the touched areas pass; CI build and limits ok; deployed by the GitHub release workflow.
- 2026-10-14, release 5 (Phases 7 and 16, scene-chunk room), `8ac05891`, live: light mode and the data meter; festivals, owambe
  parties, match nights. Deployed by the GitHub release workflow alone (the first release without this machine).
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
