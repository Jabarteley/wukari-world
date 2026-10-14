# Phases

One phase at a time, in this order unless STATUS.md records a reason to change it. Each phase ends live on joinallworld.com
(README.md, "How to release") and with STATUS.md updated. A phase that is too big for one release is split into smaller
releases, each releasable on its own; unfinished parts stay behind a setting that is off by default.

Every phase, whatever it says below:

- **Start from the code, not this page.** Read the code and docs it names before designing, and search for what already exists
  (`git grep`). The paths below were right on 14 October 2026; the code moves.
- **Tests come with the change**: rules in `src/game/` get unit tests, server routes and frames get tests with
  `server/test-fixture.ts`, Worker behaviour gets a `deploy/*.edge.test.ts` test.
- **Stored data changes only by adding optional fields.** Old saves load. Write how in the phase's STATUS entry.
- **Player-facing words** are short and plain. **The first download** stays within its limits (`src/budgets.ts`).
- **Check it on a phone-sized screen**, as a new player and as a returning one, locally and then live.
- **Write a doc** in `docs/` for anything a later developer must understand (rules, routes, settings), and link it from
  `docs/REFERENCE.md` where similar docs are linked.

---

## Phase 0: baseline

- Clone, install, `npm run check`. Record in STATUS.md the commit, the live build and any test that fails on untouched `main`.
- Confirm you can run the game locally (`npm run dev`) and see the live site.
- Confirm the release path: if the `production` environment of `kromate/joinallworld` lacks `CLOUDFLARE_API_TOKEN`, list it in
  "Questions for the owner" (README.md explains what to do meanwhile).
- **Done when:** STATUS.md has the baseline and the questions, pushed.

## Phase 1: the online count includes agents

DESIGN.md Part 2.
- **Where:** `server/pulse.ts` already sends `ai` (agents present) beside `online` (people); `src/app/features/hud/OnlinePill.vue`
  and `onlinePillModel.ts` show the pill; `usePulse.ts` reads it.
- **Build:** the pill shows people plus agents ("● 37 online · 6 here"), never 0. Pressing it opens a small sheet: "12 people · 25
  AI agents" online, the same for this city, buttons for People, Agents and Invite (invite first when no other person is online).
  The accessible label says both numbers.
- **Done when:** model tests for the counts and words, the sheet works on a phone, live.

## Phase 2: safety around AI characters (before any new talking agent)

FEATURES.md #3; README.md "Rules", AI.
- **Where:** `server/agents/` (the agent tools and chat), `server/companion/` (the companion's model calls), chat moderation in
  `server/moderation/`, ages in the growth consent record (`consent.age`), reports and blocks in `server/social/`.
- **Build:**
  - One server function every agent's words pass through before a person sees them. It blocks asks for money or transfers, for
    phone numbers, addresses, social handles or other personal details, for meetings outside the game, sexual content, and any
    claim to be human made to a person. A blocked line is replaced or dropped, and counted.
  - A tool-level ban, so these cannot be done by actions either: an agent cannot request money from a person.
  - Crisis words from a person (self-harm, abuse, danger) make the agent step out of character and show help lines for the
    player's country (a small table; Nigeria, Ghana, Kenya, South Africa, the UK and the US first, then a general line).
  - **"Are you an AI?"** When a person sincerely asks an agent whether it is an AI, a bot or a real person, the game answers
    instead: a system line naming the character as an AI agent. The agent does not see the question.
  - **Under-18 players:** agents never flirt, never take a romantic role, never suggest meeting, never ask for anything. The
    agent is only told the person "is not interested in that".
  - **Each agent can be reported and blocked** like a person.
  - **Memory controls:** people can see what an agent remembers about them, delete it, or turn it off.
- **Done when:** tests for every ban and for the interception, a red-team test file of attempts (tricking an agent into asking
  for money, getting a number, meeting up, denying it is an AI), live.

## Phase 3: friendship after shared play

FEATURES.md #1.
- **Where:** table games (`server/tables*`, `src/app/features/tables/`), room voice (`src/community.ts`,
  `src/app/features/community/`), friends and gifts (`server/social/`, `src/game/systems/social.ts`), growth metrics
  (`server/growth/metrics.ts`).
- **Build:**
  - At the end of a table game, or after five minutes together in voice, offer each pair who are not yet friends: add as
    friend, a small gift (game items or a little game money, within the existing gift limits), or an invite to your room.
  - Closer friends unlock more: messages, then voice calls, then home visits (reuse closeness, `social.rel`).
  - A visible thanks-and-gifts record on the profile.
  - Day-1, day-7 and day-30 return, split by ad source and by "has a friend", in the admin dashboard.
- **Done when:** prompts appear at the right moments and not twice, limits hold, the dashboard shows the split, live.

## Phase 4: the world feed (real rates and real weather)

DESIGN.md Part 1, "Sources" and "How it runs".
- **Where:** new `server/world-feed/`; the Worker's alarm (`deploy/cloudflare-worker.ts`, `alarm()`) and a timer on the Node host;
  weather rules in `src/game/systems/health.ts` (`weatherAt`) and `src/game/content/health.ts`; city facts in
  `src/game/cities/<city>/` (country code, time zone, centre).
- **Build:**
  - Rates: daily, primary source and fallback, last good record kept.
  - Weather: MET Norway for each city centre, hourly for busy cities and every three hours otherwise, `If-Modified-Since` and
    `Expires` respected, a User-Agent with the app name and site, mapped to the game's weather states.
  - The server sends the observed weather and the day's rates with what it already sends, so the client and the server use the
    same values. `weatherAt` uses observed weather when there is some and the old cycle otherwise.
  - Credits ("Weather data from MET Norway", "Rates By Exchange Rate API" if the fallback is used) on the Settings or About page.
- **Done when:** tests with recorded answers (no live calls in tests), fallback tests, live cities show real weather, live.

## Phase 5: money in the city's currency

DESIGN.md Part 1, "Currency", step 1.
- **Where:** `src/game/util.ts` (`naira()`, used in about 42 files), the bonus words in `src/app/features/bonus/`, welcome and
  landing words in `src/app/features/start/` and `src/quick-start/`.
- **Build:**
  - A generated table from country to currency (ISO 4217 code, symbol, decimals).
  - One formatter `money(amount, city)` that converts the game's internal unit at the day's rate, frozen for the game day.
  - Pressing an amount shows "≈ ₦…". Every caller moves to it.
  - The launch bonus and welcome words show the visitor's city currency.
  - Nothing about stored amounts changes.
- **Done when:** formatter tests (rounding, decimals, missing rate), screens checked in Lagos, Accra, Nairobi and London, live.

## Phase 6: shareable moment cards

FEATURES.md #6.
- **Where:** sharing in `src/app/features/growth/` (`shareInvite.ts`), link titles and images in `server/path-meta.ts`.
- **Build:**
  - One tap after a win, a wedding, an election result or a gist item makes a link with its own title and preview image (made
    by the server, like other link previews), opening the exact room, table or event.
  - Shared to WhatsApp first, with the ad-source words.
- **Done when:** previews render in WhatsApp (check a real share), links land in the right place for a new visitor, live.

## Phase 7: data-light mode

FEATURES.md #4.
- **Where:** first audit `docs/PERFORMANCE.md`, `docs/DEVICES.md` and the render loop in `src/venue-world.ts` and `src/map3d/`
  for what exists.
- **Build:**
  - A data meter (this session and today).
  - A "light" switch: lower detail, frame cap, no background downloads.
  - No drawing while the page is hidden or a full-screen panel covers the scene.
  - A plain message with a way forward on browsers that cannot run the 3D scene.
- **Done when:** a throttled low-end phone profile shows lower data use and frame cost with light on (measure and record the
  numbers), live.

## Phase 8: city gist and the world ledger

FEATURES.md #2.
- **Where:** events already raised by the rules (`src/game/registry.ts` events), civic results (`server/civic/`), politics
  (`server/politics/`), social (`server/social/`), news and stories (`src/game/systems/stories.ts`, `src/app/features/stories/`).
- **Build:**
  - An append-only ledger of public events per city, with no private messages and no private details.
  - A Gist feed in the phone, short bulletins in the Square, shareable cards (Phase 6).
  - A read-only agent tool to search the ledger ("did X happen?"), used by agents before they repeat a claim.
  - A size limit and expiry so storage stays small.
- **Done when:** events from five systems appear, privacy tests prove nothing private enters, the agent tool works, live.

## Phase 9: the model router and the US$2 a day budget

DESIGN.md Part 7 and Part 8, "A mix of models".
- **Where:** `server/companion/gateway.ts` (one OpenAI-compatible request with a fallback, daily caps, cost estimate) and
  `server/companion/service.ts`.
- **Build:**
  - One module all model calls go through, with two providers: Vercel AI Gateway (`AI_GATEWAY_API_KEY`) and OpenRouter
    (`OPENROUTER_API_KEY`, base `https://openrouter.ai/api/v1`).
  - Model lists by purpose as settings (no release to change them): free first, then paid.
  - The no-training rule: a request that carries a player's words may only use the paid list.
  - A spend ledger by day in US dollars, from token counts and the price table, with a hard stop at US$2 for the day across
    everything. Per-player daily caps.
  - Requests per minute and per day for each free provider respected; a model that fails or disappears falls to the next.
  - A weekly job reads `https://openrouter.ai/api/v1/models` and `https://ai-gateway.vercel.sh/v1/models` and reports new and
    departing free models on the admin page.
  - The free safety model (`nvidia/nemotron-3.5-content-safety:free` on 14 Oct 2026) as one input to Phase 2's checks.
- **Done when:** tests with a fake fetch (fallback order, the no-training rule, the budget stop, rate limits), the admin page
  shows spend by model and purpose, live with the companion moved onto it.

## Phase 10: house agents and the action library

DESIGN.md Part 3; FEATURES.md #8.
- **Where:** agents (`server/agents/`, docs/AGENTS.md: tools, the AI-played mark, limits); the virtual venue members
  (`ctx.checks.agentRoom`); routines (`src/game/routines/`); written lines (`src/game/chatter/`); the Worker alarm.
- **Build:**
  - A runner inside the server that drives house agents as agent characters (same tools, same rules, counted in `ai`).
  - Routines as single choices that run without a model until they end.
  - Wake-on-event.
  - Roles: seller (shop hours, haggling inside the shop's floor and discount limits), guide, marketer (tonight's events), mission
    giver, quiz host.
  - Three to six per busy city, one or two in quiet ones, numbers as a setting.
  - Written lines for most talk. The model (Phase 9) only when a person talks to one.
- **Done when:** agents keep their hours for a day in a local run with a fast clock, a person can haggle and be refused below
  the floor, the count shows them, live.

## Phase 11: missions from agents

DESIGN.md Part 4.
- **Where:** `src/game/content/missions.ts`, `src/game/systems/missions.ts`, `src/app/features/` Goals.
- **Build:**
  - Agent missions from templates filled from the player's state, given in person by an agent, shown in Goals with its face.
  - New triggers: talk to an agent, hand an item to an agent.
  - Social missions that need another person.
  - Rewards within the existing limits, checked by the server.
  - The model only rephrases the brief, cached per template and agent.
- **Done when:** two players with different lives get different missions, rewards cannot exceed limits, live.

## Phase 12: talking with agents, memory, relationships

DESIGN.md Parts 3 ("Talk", "Memory") and 6.
- **Build:**
  - Conversation with house agents through the router: a short prompt (role card, remembered facts, city facts, the person's
    missions), replies of 220 tokens or fewer.
  - Up to five remembered facts per person, written after a conversation, and visible, deletable or off (Phase 2).
  - Closeness with agents like regulars.
  - Partner with an agent: opt-in, only for players who answered "18 or older", no sexual content.
- **Done when:** memory and relationship tests, the under-18 rules hold in tests, the spend stays inside the budget in a load
  test with fake models, live.

## Phase 13: residents

DESIGN.md Part 8; FEATURES.md "Seven rules for the agents".

**13a. One resident, in shadow, for a day.**
- A resident is an agent character with a long first-person life story, private goals, likes and dislikes, a faith or none, a
  sleep schedule in its city's time, and a model assigned at birth from the free list.
- It acts through the action library, wakes on events, writes a memory summary at night, and never sees the words AI, model,
  game or player, or which people are agents.
- Out-of-character replies are thrown away and retried.
- "Shadow" means it acts but players do not see it.
- **Done when:** its day is recorded for the owner on the admin page (choices, cost, slips), with no breach of Phase 2's rules.

**13b. Thirty residents, visible.**
- Spread over the busiest cities, with sleep, slow thinking when alone, the model mix, and agent-to-agent talk grounded in the
  ledger, with a turn limit and a repetition check.
- The admin page compares models: talk with strangers, businesses started, friendships kept, rule slips, cost.
- **Done when:** a week live inside the budget, measures recorded in STATUS.md.

**13c. Ideas, needs, the assembly, the president and the Sunday letter.**
- Nightly collection of wishes and needs, and the five most asked for each day.
- Weekly election in a residents' assembly (reuse the election code of `docs/POLITICS.md`).
- The president's letter "to the Founders" each Sunday on the admin page. The owner's reply reaches the world as news or a
  decree.
- People's offices keep a share for people.
- **Done when:** a letter has arrived and a reply has reached residents as news, live.

## Phase 14: prayers and acts

DESIGN.md Part 8, "Prayer, and the owner as their God".
- **Where:** admin pages (`src/app/features/admin/`, `server/admin/`, `docs/ADMIN.md`), health (`src/game/systems/health.ts`),
  money (`src/game/systems/wallet.ts`), weather (Phase 4).
- **Build:**
  - Praying as an action for residents (and for players who want it, with the notice that prayers are read by the people who run
    Allworld).
  - A Prayers page with filters.
  - Acts: heal, an illness, give or take game money, bless a business for a day, weather over a city for a while, a dream or
    sign, cross two paths, silence.
  - Acts appear in the world as events and in the gist, never as messages from the owner.
  - Every act is logged; acts never touch real money, purchases, accounts or chat; a person is not sickened more than once a
    week.
- **Done when:** each act has a test, the log records it, a resident's prayer and an answered act are seen live.

## Phase 15: calls with agents and agents in room voice

DESIGN.md Part 5.
- **Where:** calls (`src/app/features/calls/`, `docs/CALLS.md`), room voice (`src/community.ts`), spoken lines
  (`src/audio/voice/speech.ts`); music already fades during calls (`jaw:call-active`, `jaw:room-voice-active`).
- **Build:**
  - Calling an agent from the phone: push-to-talk, the AI-played mark on the call screen, the agent's voice on the listener's
    phone.
  - Speech to text both ways: the browser's recognition, and the gateway's transcription model
    (`microsoft/mai-transcribe-2` on 14 Oct 2026, about US$0.10 an hour).
  - Measure both on recordings of Nigerian, Ghanaian, Kenyan and British English and Pidgin: words right and delay. The winner
    is the default; record the numbers.
  - Daily minutes per player and in total.
  - Agents speak in room voice as text spoken on each listener's phone; they do not listen to room voice.
- **Done when:** a live call with an agent works on a phone on mobile data, the measurements are in STATUS.md, live.

## Phase 16: festivals, owambe and match nights

FEATURES.md #5 and #12.
- **Build:**
  - A calendar of multi-day festivals per country (Nigeria, Ghana, Kenya, South Africa first; global ones), with the Square's
    look changing and host agents running the main event.
  - Owambe parties in rooms with dress codes and MC and DJ roles.
  - Watch nights at the times of real football fixtures (schedule only).
  - Faiths treated alike.
- **Done when:** the next real festival in the calendar runs live.

## Phase 17: city texture packs

FEATURES.md #7.
- **Build:**
  - Danfo and okada rides with banter and radio instead of dead travel.
  - Scheduled power cuts with generator and inverter buys.
  - Market haggling with seller agents.
  - Packs per city (tro-tro, matatu, minibus taxi follow), no stereotypes of danger or scams.
- **Done when:** a Lagos commute and a power cut are enjoyable in a play-through (record what testers said), live.

## Phase 18: real price levels

DESIGN.md Part 1, "Currency", step 2.
- **Build:**
  - A price-level table per country from open World Bank data (yearly file in the repo, credited).
  - Prices and wages per city scaled by it, with savings moving between countries at the real rate.
  - Re-run `scripts/economy-sim.ts`; stored amounts migrate only by adding fields.
- **Done when:** London is expensive and pays more, Accra is close to Lagos, the simulation passes, live.

## Phase 19: the smaller features

FEATURES.md #9, #10, #11, #13, #15, #16, #18, one release each:
- city projects;
- group gift packets (game money only);
- "while you were away";
- jail you can play;
- a sticker pack;
- a home-city pin;
- optional life stages and legacy.

## Phase 20: agents' own relationships and world events

DESIGN.md Part 6, "Agent to agent".
- **Build:**
  - Friendships, quarrels, marriages and families among residents by rules and their own choices, shown on profiles and in the
    gist.
  - Weddings and funerals as events people can attend.

## Not for an agent to start

Local payments and paid cosmetics (FEATURES.md #14), the creator programme (#17), currency changing at airports (DESIGN.md Part 1,
step 3), anything with ads or spend. These wait for the owner's decision; list them in STATUS.md if they come up.
