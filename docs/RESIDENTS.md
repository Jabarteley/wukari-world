# Residents (Phase 13a: one resident, in shadow)

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
