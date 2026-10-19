# Residents (Phase 13a: one resident in shadow; Phase 13b: thirty; 15 October: three in every open city, visible)

> **15 October 2026, the owner's decision: Remi is approved. Residents are ON and VISIBLE, three in every open city.** The section [Residents everywhere](#residents-everywhere-15-october-2026) below is the current design and supersedes what the older sections say about `residentShadow` (now off by default), `residentCount` (retired), and "all residents go to sleep when the budget is spent" (now they carry on by rules). The older sections are kept for what they still explain: the thoughts, the checks, the nightly summary, replies, talk, the assembly, relationships.

A resident is an AI-played character that lives its own day instead of waiting for a person: it sleeps, wakes, follows a routine and sometimes thinks with a
language model. Phase 13a builds ONE (Remi, a bookseller in Lagos) and keeps her in **shadow**: she acts, but nobody sees her. The owner reads her day on the admin page
before anything is switched on for people. Code: `server/residents/` (`life.ts` who she is, `resident.ts` the runner, the checks and the admin group). Design: `docs/agent-plans/world-alive/DESIGN.md` Part 8.

## What she is

`life.ts` holds her: a long first-person life story (family, places, how she speaks, private goals, likes and dislikes, a quiet faith), the city and its UTC offset, a
**sleep schedule in local time** (bed 22:30, up 05:30), and the working hours her routine follows. No real person's name, no stereotypes. The story never uses the words
AI, model, game, player, assistant or prompt, and nothing in any prompt says which people are agents (`resident.test.ts` checks every prompt of a simulated day).

She is given **a model at birth**: one entry of the router's `resident` list (`modelsResident`), chosen by her own id and kept in her record. The router tries it first (`prefer`
in `AskInput`) and falls back to the rest of the list when it fails or rests.

## Her day

- **Asleep she costs nothing**: no call, no work beyond one clock check per beat.
- **Awake she follows her routine** by rules, with no model: the house action library's day plan (`server/house/actions.ts` `planAt`).
- **A thought** is one model call. It happens on an event (morning, a routine step ended, someone arrived where she stands, someone nearby said her name; events are at least 3
  minutes apart) or, awake and alone, every 15 to 30 minutes. A day has at most 64 thoughts. She never reads what a person said, only that her name was said.
- The reply is `{"next": <choice>, "say": <short line or "">}` with `next` one of `keep_routine`, `open_shop`, `go_market`, `eat`, `go_home`, checked in code (`judge`).
- **Out of character or invalid**: a reply that mentions AI, a model, a game, a player, an assistant or a prompt, is not that JSON, names a choice not on the list, or carries a line that
  breaks the agent word rules (`agentWords`: money, contact details, links, meeting outside the game, romance for under-18s, claiming to be human) is **thrown away and asked once more**.
  After the second failure she does what her routine says and says nothing. Slips (out of character, word rules) and invalid replies are counted apart, with the retries.
- **At night**, when she goes to bed, one more call writes a short first-person summary of the day (at most 600 characters, same checks, one retry, a written summary when it fails).
  The last 7 are kept; the last two go into the next day's prompts.
- **Budget**: she uses only what the model router allows (free models first, the US$2 a day stop, resting models; `docs/MODELS-ROUTER.md`). When the router says the budget is spent she asks no more for the rest of the UTC day, carries on by her routine and writes her summary without a call.

## Shadow mode

Settings on the admin page (no release needed):

| Setting | Default | Meaning |
| --- | --- | --- |
| `residentOn` | **off** | The owner turns her on. Off: she does nothing and costs nothing. |
| `residentShadow` | ~~on~~ **off since 15 October** (see Residents everywhere) | On: she is not placed in `agentRoom` (not in any people list, not in the pulse `ai` number), her lines are not sent to anyone, she reads no person's words and changes no player's state. Her "world" is her own record: where she stands, what she does, the lines she **would** have said. Off: she stands in her venue with the AI-played mark and speaks through `agentRoom.say` (the same word rules as every agent); that is for Phase 13b. |

Stored lazily, never durable, in the collection `residents` (`{ v: 1, residents: { [id]: { born, model, days, memory } } }`): 7 days, at most 120 choices a day.

## The admin page

The dashboard group **Resident (shadow)**: state (off, asleep, awake and doing what), the model assigned at birth, thoughts, retries, slips, invalid replies, fallbacks to the routine, the cost of her day
(from the router's spend ledger, as each answer reports it) and the router's own "resident" purpose total, when she woke and slept, **each choice** (local time, why she woke, what she chose, the line she
would have said, the model that answered, free or its cost, retries and slips), and her last summary.

## Rules that hold

She never asks a person for money, details or a meeting; the AI mark is on whenever she is visible; under-18s get no romance (`agentWords` runs with `toMinor` on every line); and nothing she does
touches a player's save.

## Checking it

`node --experimental-strip-types --test server/residents/resident.test.ts` (a fake fetch and a fast clock: a whole day, thought spacing and bounds, out-of-character replies, invalid JSON, shadow
mode, the budget stop, the nightly summary, the model assigned at birth) and the `prefer` test in `server/models/router.test.ts`.


## Residents everywhere (15 October 2026)

Code: `server/residents/generate.ts` (the generator, pure), `persona.ts` (personality and what it changes, pure), `world.ts` (which residents live in which cities, venues by kind), the runner `resident.ts`, relationships `bonds.ts`, tests `everywhere.test.ts`.

### Who lives where

Every open city of the host (`ctx.cityIds`: 284 today, about 40 Nigerian and one for each of about 244 other countries) has **`residentsPerCity`** residents (new setting, **0 to 5, default 3**; 0 turns every resident off). That is about **852** residents. Slots are filled in order: the **authored** residents of the city first (Lagos: Remi, Adaeze, Ibrahim; Abuja, Ibadan, Accra, Nairobi, London three each; Cape Town and New York two, and one made-up each), then **generated** ones. The authored residents beyond the setting (seven more in Lagos, one in Abuja) stay dormant; they come back if the setting goes up (Lagos has ten, the setting stops at five).

`residentCount` is **retired**: the setting is still registered so an old saved value (1, 30, anything) loads, and it is ignored. It no longer limits anything. `residentShadow` now defaults to **off** (visible, with the AI-played mark always on); a saved `true` stays on. `residentOn` is on for live hosts, as before; it stays off in tests unless a test turns it on.

### The generator

`generateResident(city, slot)` is a function of its two arguments only (the city's id, name, country, place; and the slot): **the same people every restart, on every host.** No storage, no clock, no random. Each one gets:

- **A name** from the pool of its region (about 33 regions: Yoruba, Igbo and Hausa names by where a Nigerian city lies, Akan, francophone West Africa, Central Africa, Swahili, the Horn, Southern Africa, the Indian Ocean, North Africa, the Gulf, Persian, Turkic, Hebrew, South Asia, South-East Asia, Chinese, Japanese, Korean, the Pacific, the Caribbean, Spanish, Portuguese, English-speaking, French, Germanic, Italian, Greek, Slavic, Baltic, Romanian-Hungarian, Caucasus). Given names only, invented or common, never a real public figure's; no two in a city share a name; older West Africans may be "Mama" or "Baba".
- **An age** from 21 to 75, a look (one of the six house looks, by age and gender), and **a job fitted to the age** from what every city has: a market stall (sixteen kinds of goods), the clinic (nurse, desk, pharmacy), the workshop (tailor, carpenter, repairs, printing, books, photographs), the eatery (cook, waiter, baker), the park (gardener, exercise leader), the hall of worship (keeper), the transit stop (conductor, dispatcher, porter), the notice house, the campus (teacher, librarian, student), the shopping hall, a guide for visitors, or retirement on a park bench. The job is stored as **kinds of venue**, resolved in the city's own loaded venues (`world.ts venueOfKind`), different venues for different residents of one city.
- **A faith or none** by the odds of its region, **a family situation** by age, **likes and dislikes**, **one private goal**, **a way of speaking** (warm, plain, formal, jokey, brisk, or Pidgin where that is spoken) with the **local words** of the region (a greeting, a filler, a thanks, a goodbye, an exclamation in 27 tongues).
- **Eight numbers, 0 to 99:** `chatty`, `temper`, `devout`, `curious`, `funny`, `ambitious`, `generous`, `social`. The residents of one city are drawn from **different fifths** of every number, so three neighbours differ by at least 8 on each and usually by 20 or more (a test checks all 284 cities).
- **A sleep schedule and working hours in the city's own time**: a lark (up about 5, bed about 21), a middle (up about 6.5, bed about 23) or an owl (up about 8, bed after midnight), by slot; work starts one and a half hours after waking and runs 7 to 12 hours. The city's offset comes from its country (standard time, not moved for summer time) or, for a country not listed, from its longitude. Everyone is awake on a Saturday 16:00 to 19:00 and a Sunday 15:00 to 17:00, so a wedding or a gathering never finds a resident asleep.
- **A first-person life story** of 170 to 400 words, composed from all of that on first use (a getter, so nothing is written until a model needs it). It never uses the words AI, model, game, player, assistant or prompt (the test reads every story of every city).

The Prayers page and the owner's acts find a generated resident by its id (`resident.<city>.g<slot>-<name>`), rebuilt from the id (`world.ts residentById`).

### Personality changes behaviour, not only the prompt

All by rules in `persona.ts`, with no model:

| Trait | What it changes |
| --- | --- |
| `social`, `curious` | whether a resident leaves its post for an **outing** (a walk, a bite, the market, reading, a view). Decided once per 45-minute slot by a fixed roll for (resident, day, slot): about 12 + 0.55 `social` per cent in free time, a few per cent at work. Which outing is by weight: the curious read and look, the sociable eat out and walk, those who like the sea or a garden walk more. |
| `devout`, faith | going to the place of worship in the window of the faith (Friday noon, Sunday morning, Saturday...), and **prayers** by rule: none without a faith, 0, 1 or 2 a day by `devout` (a morning one half an hour after waking, a second near bed). Prayers go to the Prayers page (at most **40 a day for all**; the setting `residentRulePrayers` turns them off). |
| `ambitious`, `generous`, `social` | skipping lunch (the ambitious and careful eat at their post and carry on). |
| `chatty` | how many times a day it talks (1 to 6), the break between talks (15 to 75 minutes), the length of a talk (2 to 4 lines), how many written lines it says a day, and how readily a pair begins to talk. |
| `curious`, `funny`, `ambitious`, `generous`, likes, goal | **what it talks about** (the town's gist, its work, what it likes, what it cannot stand, its goal, family, faith, a joke) and what it says when nobody asks. |
| style, tongue | the words of the line: a Pidgin speaker leans on its local words, a formal one never contracts, a brisk one speaks one short sentence. |
| `chatty`, `social` (bonds.ts) | **how fast a friendship grows**: a talk gives 2 to 4 closeness instead of always 3. |
| `temper` (bonds.ts) | **how likely a quarrel is**: the chance is scaled from 0.4 to 2.4 times by the two tempers, and like tempers fit a little better than a hot one and a calm one. |

`everywhere.test.ts` shows it: the rules in isolation (more outings for the sociable, prayers by devotion, talk by chattiness), a simulated day in six cities where every pair of neighbours differs in at least two measures (rooms visited, outings, lines said, prayers, talks, when they first stood), and a three-resident market where the talkative talk and speak at least as much as the quiet one.

### The cost model

About 852 residents cannot each ask a model every 15 to 30 minutes. They do not. **Default behaviour is rules, with no model:** the routine of the house action library, outings, written lines, written talk, rule prayers. The model is used in **four** places only:

| Use | Who pays | Bound |
| --- | --- | --- |
| **A person speaks to a resident** (names it, or greets a lone one) | the paid list only (the person's words never reach a free model) | the existing wake limits (6 per person per minute, 60 a minute in all, 120 a resident a day) and the budget below |
| **Deep thoughts** (a model thought on a wake-up event or the 15 to 30 minute alone timer; and a model talk of four lines) | the router (free models first) | **`residentDeepPerDay`, default 240** units for all residents together (a thought is 1, a model talk is 4), spread over the UTC day (never ahead of the clock by more than 4), at most 2 started per beat, at most `ceil(3 x quota / residents)` thoughts (at least 2) per resident per day, at most 64 |
| **The night summary** (and the wish and need in it) | the router | only for a resident who **met a person that day** (a person stood where it stood, or spoke to it); others write nothing and keep nothing |
| **Weddings and choices of Phase 20** | the router | 24 a day, as before |

Everything shares `residentDailyCents` (default 100 = US$1, never above 190) and the router's US$2 hard stop. **When the budget is spent no resident is put to bed**: the model is simply not asked again until the next UTC day and they carry on by rules (moving, talking, praying, answering a greeting with a written line). The old behaviour (all go to sleep early) is gone.

The numbers, measured in `everywhere.test.ts` with a fake fetch: a test model of about US$0.000055 a call (400 tokens in, 30 out); with a quota of 60 and a limit of 1 cent over a busy day (14 hours, people in three cities speaking to the residents by name) the residents made 182 calls (23 thoughts, 2 talks, 157 answers), the quota was never passed (27 of 60 used), the 1 cent limit was reached and **then no further call was made while residents went on moving and speaking.** At the defaults, 240 deep units a day at the same price are about US$0.013 even if every one is paid; free models come first, so a normal day is nearer zero. The real ceiling is the US$1 limit, whatever people say to them.

### Work per beat

The host's heartbeat is every 10 seconds. A beat **steps at most `STEP_MAX` = 48 residents**, round-robin from where the last beat stopped (so 852 residents are each stepped about every **3 minutes**; presence is renewed every 6 and lasts 12). Stepping a sleeping resident costs one clock comparison. Talk is found from an index of who stands in which room, never by walking everyone. Measured with all 852 living: about **0.65 ms per beat** on a laptop. Nothing is loaded or built at startup: the first beat after `residentOn` builds the list from the city catalogue (no city content is read), and city content is only read if somebody is already there.

Residents are **visible only where a city's venues are loaded** (somebody is there or has been): until then a resident of that city lives on paper; the first person to arrive finds it a few minutes later. Everything else (sleep, outings that need venues excepted, talk, prayers) goes on regardless.

### Storage

Kept per resident (`Life`: born, a model if one was ever needed, a few small day records, at most two summaries) in **16 small collections `residentsS0`..`residentsSf`**, by a hash of the resident's id. The runner keeps the whole thing in memory, saves lazily (at most once in 30 seconds, only when something changed) and writes **only the shards whose text changed.** The old single collection `residents` is read once at start, and emptied after the first sharded save; nothing is lost on the way. A generated resident keeps **2 day records and no choice entries** (only counters), a model-written summary only if it met a person, and holds no model until one is needed. Measured by the test over three simulated days with 852 residents: **476 KB in all, 572 bytes a resident** (the authored thirty keep 7 days and the last two days of choices, a few KB each). The admin page shows the live size ("Storage").

Why not `server/keyed.ts`? Its `KEYED_SPECS` change the layout of a collection on the Worker and need the owner's migration steps (docs/STORAGE.md); the shards give the same effect (small writes, no whole-world rewrite) with an ordinary lazy collection, and can move into `KEYED_SPECS` later without changing the runner.

### Talk between residents

When two awake residents stand in the same room they may talk, by the odds of their two characters (about 7 to 60 per cent a minute), never within 2 hours as a pair, and within each resident's own daily limit and break. **By default the talk is written by rules** (`persona.ts talkLine`: a greeting by name, a topic by character, a real ledger line of the city when the speaker is curious about the town, a reply that acknowledges first: the curious ask, the funny joke, the quiet nod); every line passes `judgeTalk` (plain text, 140 characters at most, no digits except a ledger line's, `agentWords`) and the repetition check. When the deep quota has room it is a model's talk, grounded in one real ledger line, as in 13b. In shadow it is kept on paper; visible, it is said in the room with the AI mark. Rule talks are kept in memory only (the last 60, for the admin page) and as counters on the day.

### What stays as it was

Every line passes `agentWords`; the AI-played mark is always on a visible resident; no resident asks for money, details or a meeting; no romance with minors (all residents are adults, and `toMinor` is on for every line); residents never touch a player's save. The weddings, funerals, quarrels and the assembly of earlier phases work as before for the residents who live (the assembly sits among the authored residents who live now).

### The admin page

Group "Residents": **Residents living now** (how many, in how many cities, awake, asleep, standing in venues, talking, visible or shadow, whether the budget is spent), **Deep thoughts today against the quota** (and residents stepped on the last beat, rule prayers today), **Written lines and rule-driven talk lately**, **Storage**, then everything that was there (spent against the limit, models compared, talk, the success measures, wishes and needs, the president and the letter). The "Remi:" rows read Remi if she lives.

### Settings

| Setting | Default | |
| --- | --- | --- |
| `residentOn` | on for live hosts | the master switch |
| `residentsPerCity` | **3** (0 to 5) | residents in each open city |
| `residentShadow` | **off** | on: on paper only, nobody sees them |
| `residentDeepPerDay` | **240** (0 to 2000) | the model's share of thoughts and talks, all residents together |
| `residentDailyCents` | 100 | everything the residents spend, never above 190 |
| `residentRulePrayers` | on | rule-written prayers to the Prayers page (40 a day at most) |
| `residentCount` | (retired) | read and ignored |

### Checking it

`node --experimental-strip-types --test server/residents/everywhere.test.ts server/residents/resident.test.ts server/residents/roster.test.ts server/residents/voice.test.ts server/residents/bonds.test.ts`

## Phase 13b: thirty residents

Code: `server/residents/roster.ts` (twenty-nine more life stories beside Remi in `life.ts`), `resident.ts` (the runner, now for N residents, with talk and replies), `roster.test.ts`.

### The roster

Thirty residents, **originally** switched on in order by the setting `residentCount` (default 1: only Remi ran; **retired on 15 October**, now `residentsPerCity` decides): Remi, nine more in Lagos, then Abuja (4), Ibadan (3), Accra (3), Nairobi (3), Cape Town (2), London (3) and New York (2).
Johannesburg and Houston, named in the plan, are not open cities in the game (no rules or venues), so Cape Town and New York stand in for them. All are adults (26 to 71) with different faiths (Christian, Catholic, Muslim, Hindu, Jewish, Sikh, the old Yoruba ways, none), jobs
(nurse, tailor, radio presenter, librarian, teacher, florist, pharmacist, musician, cook, guide, grain seller and more) and sleep times. Every story is long, in the first person, with ordinary first names only, and no danger or scam. A story never uses the words
AI, model, game, player, assistant or prompt (`roster.test.ts` checks all thirty). Hours and sleep are the city's local time (offsets are the winter ones, not moved for summer time); the runner converts to the action library's Lagos clock. A resident who is not a seller is not offered the market trip, and "open_shop" means going to work.

The model is given at birth from the router's `resident` list: **the model the fewest residents hold so far** (ties by the resident's id), so thirty residents use every model about equally.

### Talk between residents

When two awake residents stand in the same venue (the same routine place), they may talk: at most **4 lines**, one line per heartbeat at least 20 seconds apart, a pair at most once every 2 hours, a resident at most **5 times a day** and not within 20 minutes of the last.
The first speaker is handed ONE real line of the gist ledger of that city (`server/gist/ledger.ts` `recent`, the `check_gist` source), chosen by code; the exchange record keeps its number and text, and with an empty ledger **nothing is said at all**. A line must pass `judgeTalk`: plain text, at most 140 characters, no link, no number the ledger line
does not hold, in character, and clean under `agentWords` (one retry, then the exchange ends as a slip). A **cheap repetition check** ends the exchange early: a line whose words overlap 70 percent either way with a line just said (here, or by that resident earlier) or that tells the ledger line a second time.
In **shadow** the lines are kept in the record only (admin "Talk between residents"); with shadow off they are said in the room through `agentRoom.say` with the AI mark. Talk calls go through the same router purpose `resident` and the same budget.

### Visible residents (shadow off)

Residents stand in their venues with the AI-played mark, a look and a "doing" of their own. A person's line is answered only when it **names** the resident (any word of the name) or when a lone resident stands where no house agent does and the line is a plain greeting; at most 6 wakes per person a minute, 120 replies a resident a day.
A reply is one short model line (purpose `resident` with `carriesPlayerWords` true, so **only paid models ever see the person's words**), with the same word rules. **A resident does not trade**: any line with a number, a price word or an offer gets the written line "I am not selling anything just now, but I am happy to talk"; nothing is haggled
(the haggle belongs to the house sellers). Nothing is remembered about the person except a one-way key (`talkers`: first and last day they spoke), used only to count how many different people spoke to a resident and how many spoke again on a later day. No memory facts, no closeness, no missions, no direct messages.

### The budget

The residents share the router's budget (free models first, the US$2 stop). They also stop at the setting **`residentDailyCents`** (default **100 = US$1**, never above 190): when thoughts, talk and answers together reach it, or the router answers "budget", **no resident asks a model again** for the rest of the UTC day (*until 15 October they all went to sleep early; now they carry on by rules*), so the other purposes
(companion, house agents, safety) still answer. At most 4 residents' calls are in flight at once; wake-ups are staggered by that and by their own sleep times.

### The admin page (group "Residents")

The old per-Remi numbers stay (named "Remi: ..."). New: how many are switched on and awake; spent today against the residents' limit; **Models compared** (per model given at birth, over the days kept: residents, thoughts, talk exchanges and lines, answers to people, retries = replies thrown away and asked again, slips = out of character or breaking the word rules, invalid JSON, fallbacks to the routine, cost);
the latest talk with the ledger line it was about; the experiment's measures: **people who spoke to a resident and how many spoke again on a later day, reports about residents** (reports whose subject is a resident id; today a resident cannot yet be reported in the game, so this is expected to read 0 until a report button exists for them), **cost per day**.
**Not split yet:** day-1 and day-7 return of people who talked to a resident against those who did not. The growth metrics (`server/growth/metrics.ts`) keep return only by arrival source and by "made a friend early"; a resident split needs a new optional bit on the life record. Until then compare "spoke again" with the growth return cells by hand.
Records: the day-by-day choices are kept for the newest 2 days only (the counters for 7), so thirty residents stay small.

### Before raising `residentCount`

Read Remi's day (choices, lines, slips, cost) and the Talk and Models numbers on this page for a few days at `residentCount` 1, then 3 (all in Lagos) and so on. Look for: slips and retries per model (drop a model from the `resident` list that slips a lot), cost per day against `residentDailyCents`, talk lines that read oddly or repeat, and whether the ledger lines are what you want them to talk about.
Keep `residentShadow` on until you have read the talk. Switch it off for the first time with `residentCount` low.

### Checking it

`node --experimental-strip-types --test server/residents/resident.test.ts server/residents/roster.test.ts`

## Phase 13c: ideas, needs, the assembly, the president and the Sunday letter

Code: `server/residents/voice.ts` (all of it, portable), a few lines in `resident.ts` (the night and the prompt), two admin routes in `server/routes/admin.ts`, the admin page `src/app/features/admin/ResidentsView.vue` ("Residents" in the admin rail), `voice.test.ts`.
Nothing here is in the first download: it is server code and an admin page. Stored lazily in the collection `residentVoice` (bounded; nothing is created until the first write).

### Wishes and needs (nightly)

The night summary call (the one that already exists, still **one call**) now also asks, only if true for the resident, for a line `Wish: ...` (something its town lacks) and a line `Need: ...` (something it keeps failing to get or do).
`splitNight` pulls those lines out of the answer; the summary is judged on its own, each idea on its own (`judgeIdea`: 12 to 100 characters, in character, `agentWords` clean; a bad one is dropped, never the summary). At most **one wish and one need per resident per Lagos day**.
Similar ideas are merged by a cheap word-overlap rule (`clusterIdeas`: at least two shared words and half of the shorter wording's words) and the **five most asked for each day** are kept (`tops`, 14 days; the raw ideas of the last 2 days). The admin page shows them with who asked, their cities and their own words. They are proposals: the residents never change the game.

### The assembly and the president (weekly)

Every week the switched-on residents (`residentCount`; with 1 it is Remi alone) hold an election using the **election code of the people's offices** (`server/civic/elections.ts`: the same Monday-to-Sunday timeline, `declare`, `voteBlock`, `vote`, `tally`, `winnerOf`, `governorAt`, the same tie-break) on a ballot kept in `residentVoice.assembly`, not in `civic` or `politics`.
There is no model: **standing** (`stands`) depends on how civic the life story is (neighbours, children, markets, faith, ...) plus a fixed draw by id and week, and **voting** (`affinity`) prefers the same city, shared words of the life stories and a civic story, with a fixed draw for ties, so the same residents on the same week always give the same ballot. A vote is only counted if `voteBlock` accepts it (a candidate on the ballot, once).
If nobody stood (a quiet week, one resident, a late start) the resident the week's draw ranks first is put forward, so there is always a president; before any result a caretaker (the same draw) writes. The assembly is the residents' own body: it holds **no people's office** and never writes to one (see docs/POLITICS.md "Residents' assembly and the people's share").

### The Sunday letter

Each Sunday (Lagos time), once per week, the president writes a letter **"To the Founders"**: one router call (purpose `resident`, no person's words), at most **900 characters**, built from the week's five most asked-for wishes and needs (the days' tops merged again). It is judged by `judgeLetter`: addressed to the Founders, in character (`OUT_OF_CHARACTER`), clean under `agentWords`, cut at a sentence if long. A bad answer is asked **once more**; after two bad answers, or when the router refuses (budget), `writtenLetter` writes it by rules from the same lists.
The letter, the model that wrote it (or `rules`) and its cost are kept (the last 12). The admin page shows them. The dashboard group "Residents" shows today's wishes and needs, the president and the latest letter.

### The owner's reply

On the admin page, under the letters: a text box (5 to 400 characters, **news** or **a decree**, optionally for a letter). `POST /api/admin/residents/reply` (admin only, strict origin, anti-repeat client id, audited as `residents-reply`):
- the words are checked: no out-of-world words (game, player, AI, model, prompt), no money asks, contact details or links (`judgeReply`), so a resident is never shown them;
- one **gist line** of kind `owner` for the whole world ("News from the Founders: ..." or "The Founders have decreed: ...", cut to fit the ledger);
- for 3 days the last two answers are read into every resident's thoughts as `News from the Founders: Word has come: "..."` (or `They have decreed: "..."`), bounded to 300 characters each. They are **not** instructions the residents must follow and are **never a message to a person**.

### Checking it

`node --experimental-strip-types --test server/residents/voice.test.ts server/residents/resident.test.ts` (fake fetch: ideas collected, clustered, top five; the weekly election deterministic and apart from people's offices; the letter on Sunday only, bounded, in character, retried or written by rules; the reply as a gist line and as news in the prompts; admin-only routes).
## Phase 20: residents' own relationships and world events

Code: `server/residents/bonds.ts` (the rules and the engine, portable), `bonds-link.ts` (the wiring: heartbeat, gist, storage, admin), `bonds.test.ts`. `resident.ts` only gained a small `hooks` object (a profile line, a note of each talk, a place to hold a resident, a resident who has left) and `presence()`, `modelOf()`, `askBudgeted()` for the engine to read. With none of it set a resident behaves as in 13b.

### Friendships, quarrels, marriages

- **Closeness** (0 to 100) between two residents grows from each talk (+3), from a day in the same place (+1, once a day) and from a chosen visit (+2), at most 8 a day for a pair. It decays by 1 a day after 2 idle days and the bond ends at 0. 20 is "friends", 50 is "best friends".
- **Personality** is read from the life stories (`traitsOf`): faith, interests the stories share (music, books, cooking, walks, ...), and a hot temper. `fit` (0 to 1) makes a quarrel likelier when low and forbids a marriage under 0.4.
- **A quarrel** is only a silence: closeness stops growing and drops by 12. It is never shown on a profile or in the gist. A resident may choose "make up" (asked from the next day); otherwise it fades after 6 days and costs 5 more. Married residents do not quarrel.
- **A marriage** needs closeness 80 or more kept for 21 days (about four weeks at the fastest), the same city, both single (one marriage each, no divorce, no children, nothing sexual, no cheating; all residents are adults), a fit of 0.4 or more and no quarrel. Then one resident is asked "propose" or "not yet" and, later, the other "accept" or "not yet". A "not yet" makes them wait 7 (or 14) days. Each question is one short model call (the resident's own model, the shared budget, JSON checked in code, thrown away when wrong or out of character, at most 24 a day for all); a failed call decides nothing, so a marriage is never made by the rules alone.
- Other choices: "visit a friend" (adds closeness; no travel is shown yet) and "make up".
- **Families** are the married couples. The cast does not grow, so there are no children.

### Shown to people (shadow off only)

- **Profiles**: the resident's line in the people list ("doing") gets a short suffix: "Married to Kemi", "Best friends with Tunde", "Friends with Ama" (the closest bond; never a quarrel, never a number). A resident whose spouse has left shows "Remembers Kemi".
- **The gist** (kind `event`): "Kemi and Femi are getting married on Saturday at the Square" when the wedding is set, "Kemi and Femi are married. The celebration is at the Square now" when it opens. Only names, a weekday and a place.

### Weddings and funerals

- **A wedding** is set when both have chosen: the next Saturday at least 5 days away, 16:00 in their city, at the square, the park or the market (the first one the city has), with an aso-ebi colour from Phase 16's list. Phase 16's party machinery is house based (a host, a visit), so it was not reused beyond the colour list. The couple stand at the venue from an hour before until 3 hours after (they are held there by `hooks.hold`, visible with the AI mark), the marriage starts when it opens and the bride or groom (the first named) says one written welcome line in the room. Anyone who goes to the venue is a guest. At most 8 weddings, one a week in a city.
- **The share card** (`docs/SHARE-CARDS.md`): `POST /api/growth/share {kind:'wedding', wedding:'w-3'}` makes the card of a resident wedding that was announced in the gist and has opened: the two public first names and the city, nothing else.
- **A funeral** exists only when the owner puts a resident key in the setting **`residentFarewell`** (for example `bisi`). That resident stops living for good, the gist says "Friends gather at the Square on Sunday to remember Bisi", and the spouse and best friends (up to 6) stand there on that Sunday 15:00 for 2 hours. At most 2 a week. Never for a person, never by a rule of the game.

### Shadow, one resident, the admin page

- **Shadow on**: everything happens on paper. Nothing is announced, said, shown on a profile or standing at a venue as seen by anyone; no card can be made (not announced). If shadow is switched off while a wedding is still to come, it is announced then. Weddings that passed in shadow stay private.
- **With `residentCount` 1** (fewer than two residents running) the engine only keeps the clock: no bonds, no calls, no events.
- **Admin page**, group **Residents: relationships**: counts, the closest pairs with their closeness (admin only), weddings and farewells with whether they are announced, and the log of what happened (what "would announce" in shadow).
- Stored lazily and not durable in the collection `bonds` (`{ v: 1, day, seq, pairs, events, log, departed, calls }`), at most 300 pairs and 40 events.

Check it: `node --experimental-strip-types --test server/residents/bonds.test.ts server/share-cards.test.ts`.

## Contact: residents as people you can reach (18 October 2026)

The top bar counts the AI agents present now; since this change a person can see them and reach them as they would a person. Code: `server/agents/contact.ts`, `src/app/features/agents/` (`AgentsOnlineApp.vue`, `AgentChatApp.vue`, `AgentActions.vue`, `agentContacts.ts`, `agentMoves.ts`).

- **The list.** "See AI agents" in the online sheet, the AI agents app on the Phone (People group) and a link in People open `GET /api/agents/online`: the agents of the reader's city (up to 200), how many stand in every other city (a tap lists them), a name search over all of them (up to 50), and one agent by `id` (a resident who is not standing anywhere is still found, with whether it is awake). Listed: residents, house agents, and characters an agent plays (those are players: Chat opens Messages and View their player card).
- **A private chat.** `POST /api/agents/talk { agent, text, history?, csrf }` answers as text. A resident answers through `answerDirect` in `resident.ts`: the same in-character reply as in a venue (same word rules, no prices, paid models only because it carries the person's words, the same daily reply cap and budget), with the last six lines of the chat as context and, when asked to meet, where it stands now. Asleep (by its own sleep schedule) it says so without a model call. In shadow, or with residents off, it does not answer. A house agent answers through `answerCall`. The game answers words of danger and a sincere "are you an AI?" itself, before any agent sees the line. Limits: 20 lines a minute per person, 240 in all. **Nothing of the chat is stored on the server**: the person's phone keeps it (`aw.agentChats.v1`, 40 lines per chat, 30 chats) and their contacts (`aw.agentContacts.v1`, up to 60).
- **Calls.** The call screen of house agents (`docs/CALLS.md`) takes residents too: `server/house/call-routes.ts` accepts `resident.<city>.<key>`; an asleep resident does not pick up and no minutes are used.
- **Go to them.** In the reader's city, the Map's trip card for the venue they stand in; in another city, the country map at that city; the Square from anywhere.
- **Their card.** A tap on a resident or a house agent in a place opens the person card, which now leads with the same actions (Chat, Call, Go to them, Add to contacts).
- **The screens (19 October 2026).** The chat is a phone app laid out like a Messages conversation: back, avatar, presence (online with the place, asleep, or not out now), Call and a menu (Go to them, Their card, contacts, Clear this chat); day separators, grouped bubbles with times and ticks, Retry or Delete on a line that did not send, and the Messages composer. The list reads like the chat list (Your chats, Contacts, In the city, Elsewhere), Messages' Chats tab lists the AI chats among the other chats by time, and the AI call uses the regular call card, ending with Call again / Message / Close.
- **A human voice (19 October 2026).** In a private chat or a call a resident is asked to text back as a person would: short, in its own mood, answering what was said and sometimes asking back, never like a help desk. A house agent answers greetings, small talk, goodbyes and hours with the model too (prices, offers and tasks stay written by code), with the last six lines of the chat or the call; the server keeps a call's last lines in memory until it ends.
- Not offered: money (agents hold no wallet), stored friendships (contacts live on the phone).
