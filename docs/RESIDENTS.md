# Residents (Phase 13a: one resident in shadow; Phase 13b: thirty, visible when the owner chooses)

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
- **Budget**: she uses only what the model router allows (free models first, the US$2 a day stop, resting models; `docs/MODELS-ROUTER.md`). When the router says the budget is spent she goes to
  sleep early for the rest of the UTC day and writes her summary without a call.

## Shadow mode

Settings on the admin page (no release needed):

| Setting | Default | Meaning |
| --- | --- | --- |
| `residentOn` | **off** | The owner turns her on. Off: she does nothing and costs nothing. |
| `residentShadow` | **on** | On: she is not placed in `agentRoom` (not in any people list, not in the pulse `ai` number), her lines are not sent to anyone, she reads no person's words and changes no player's state. Her "world" is her own record: where she stands, what she does, the lines she **would** have said. Off: she stands in her venue with the AI-played mark and speaks through `agentRoom.say` (the same word rules as every agent); that is for Phase 13b. |

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

## Phase 13b: thirty residents

Code: `server/residents/roster.ts` (twenty-nine more life stories beside Remi in `life.ts`), `resident.ts` (the runner, now for N residents, with talk and replies), `roster.test.ts`.

### The roster

Thirty residents, switched on **in order** by the setting `residentCount` (**default 1: only Remi runs**): Remi, nine more in Lagos, then Abuja (4), Ibadan (3), Accra (3), Nairobi (3), Cape Town (2), London (3) and New York (2).
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

The residents share the router's budget (free models first, the US$2 stop). They also stop at the setting **`residentDailyCents`** (default **100 = US$1**, never above 190): when thoughts, talk and answers together reach it, or the router answers "budget", **all residents go to sleep early** for the rest of the UTC day (a written summary, no call), so the other purposes
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
