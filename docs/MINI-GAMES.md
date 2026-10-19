# Local mini-games

Phase 9 of [WOW-PLAN.md](WOW-PLAN.md). Three small games, each its own phone app that loads only when it is opened, so none of them is in the first
download: a **market haggle** with AI-played traders who remember you, a **skit studio** for 15 or 30 second skits with captions, and two Nigerian
**seasons**, **NYSC camp** and **JAMB season**. The plan said these "had no signal either way: ship small, measure, keep what works", so each one is
small, switchable and counted.

Game naira only: paid or spent through the life's own wallet rules, never real money, never bought, never withdrawn (see the money rules in
[EARN.md](EARN.md) and Phase 0 of the plan). Code: `server/minigames/`, `server/routes/minigames.ts`, `src/minigames/`,
`src/app/features/minigames/`, `src/types/minigames.ts`. Tests are listed at the end.

| Game | Phone app (group) | Where | Needs |
| --- | --- | --- | --- |
| Market haggle | **Market haggle** 🤝 (Money) | the city's main market | the person standing in the market; a city with a market |
| Skit studio | **Skit studio** 🎬 (People) | anywhere | a browser that can record a canvas (the preview works without) |
| NYSC camp, JAMB season | **NYSC and JAMB** 🎓 (Life) | anywhere | a character in a Nigerian city; the season switched on |

## 1. Market haggle

**What a person sees.** Phone → Market haggle. The market of the city the character lives in ("Balogun Market" in Lagos), the traders who keep a
stall there, each marked **AI-played**, with a line about how well they know the person ("A new face", "You again today: last prices", "Remembers
you", "Your regular trader"). Pick a thing and **Haggle**: the trader opens at the list price; offer one of the suggested amounts or type your own;
the trader counters, refuses or agrees. An agreed price is held for ten minutes: **Buy** pays exactly that price and the cloth or craft goes into the
bag of trade goods (the same bag as the house sellers' goods, `BAG_LIMIT` 24). The best haggle (the most naira saved) is kept: **Clip it** replays
the talk bubble by bubble in the phone-story shape and ends on the result; **Share card** is the talk and the result as a picture. Both go to
Capture, which adds the @handle mark and opens the share sheet.

**Who sells.** Lagos has two traders of its own, both at the one market venue, both speaking Nigerian Pidgin: **Alhaja Sade** at Balogun Market
(warm; ankara, adire, aso-oke, indigo cloth) and **Mr Emeka** at the Computer Village corner (tough; caps, sandals, baskets). Any other city's market
has the market seller of its country's house cast (`castOf`, `server/house/cast.ts`): Pidgin in a Nigerian city, plain English elsewhere. A trader
sells only products that exist in the game's table (`BUSINESS_PRODUCTS`), at the game's list price. Computer Village sells caps and sandals because the
game has no phones or gadgets as goods yet; when it does, they belong on that stall.

**Where the price comes from (the server, never the client).**
- Each item has a **list** price, a **fair** price and a **floor**, from the house sellers' arithmetic (`priceList`, `decide` in
  `server/house/haggle.ts`, [HOUSE-AGENTS.md](HOUSE-AGENTS.md)): an offer at or above the ask is accepted at the ask; at or above fair, accepted at
  the offer; between the floor and fair, countered halfway; below the floor, refused. The floor is 75% to 95% of the list (never under the 70% the
  purchase step accepts) and moves by a few percent with the Lagos day, so tomorrow's floor is not today's. Neither the floor nor the fair price is
  ever sent to the browser, a model or the card: a deal's grade (A fair price, A good haggle, A sharp haggle, The trader's lowest) is coarse on purpose.
- A person has 4 offers below fair per item and trader and day; after that the ask is final.
- Offers are exactly-once per request id (`ctx.once`): a repeat costs no extra round. A deal already agreed cannot be lowered by anything said afterwards.

**The trader remembers (`TraderRow`, `server/minigames/store.ts`).** Per person and trader: visits, purchases, the day of the latest purchase.
- **A new face**: the usual opening.
- **Again the same day** (after a purchase): "You again? Last price." The trader opens at the list price and the person has **two** offers, not four.
- **Another day** after a purchase: "I remember you!" as an opening line, and the trader shows it on the stall.
- **A regular** (3 purchases at that trader): the opening ask is a fifth of the way down to the floor, one more offer, and the trader uses the person's name.
- The floor does not move for anyone. A person's rows keep at most 12 traders and 6 talks a trader.

**Words.** Most lines are written (`haggle-lines.ts`): Nigerian Pidgin or plain English, a warm or a tough trader, 11 situations, two or three variants
each, every one through the AI word rules for a minor (`agentWords`) in `rules.test.ts`. A model may **rephrase a verdict line** (accept, counter,
refuse, final; never an opening or a closing line) through `router.ask({ purpose: 'agent-talk', carriesPlayerWords: false })`, so no word of the person
reaches it and a free model may answer; at most 3 a person and 60 a server per Lagos day, and the answer is thrown away unless it carries exactly the
amounts of the written line, no percent, no "free" or "discount", the same verdict (a refusal cannot become a yes) and passes `agentWords`
(`cleanRephrase`). Switch `haggleModel` off for written lines only.

**Buying (`POST /api/minigames/haggle/buy`).** The deal becomes the life's own **sale** step (`missions.server` op `sale`, `src/game/systems/agent-missions.ts`,
[AGENT-MISSIONS.md](AGENT-MISSIONS.md)): the life checks the price against 70% of the list and the list, the purse and the bag; the money is a sink, as at the
boutique. At most **3 haggled buys a Lagos day**. A held deal lapses after ten minutes; nothing is charged for agreeing. The person must be standing in
the market (`life.location`); the app offers **Walk there** (a `travel` trek) and the map.

## 2. Skit studio

**What a person sees.** Phone → Skit studio. A live preview (9:16) of the skit and the editor under it:
1. **Title card** text, a **place** (my home, the street, the market, a rooftop at dusk, a stage, the beach) and a **length** (15 or 30 seconds).
2. **Who is in it**: the person, and up to **three friends** from the friends list (people, not AI characters). Friends appear as figures wearing
   their names. They are not recorded and nothing is sent to them.
3. **Beats** (up to 6 in 30 seconds, 5 in 15; each at least 2 seconds): a pose for every actor from the game's own poses (stand, wave, dance, sit,
   work, eat, on the phone, relax, walk, jog) and an optional **caption line** (80 characters).
4. **Record**: the title card (2.5 s), the beats, the end card (2 s). The clip opens in **Capture**, which puts the @handle mark on it and opens the share sheet.

**No sound.** Voice is not recorded. The studio draws the skit on a canvas and records that canvas; Capture's recorder takes a video-only stream and strips
any audio track, and nothing in the studio calls `getUserMedia` (a test scans the sources for it). The studio says so in the page ("No sound. The studio
never asks for your microphone") and on the end card ("captions only, no sound").

**Words.** The title and the captions are text strangers will read in a shared video, so the server checks them first (`POST /api/minigames/skit/check`):
the same filter as any text strangers read (`screenText`, contact details and links refused). They are tidied (control characters out, spaces
collapsed, cut to length) and **refused, never altered**. 60 checks a person a day. Switch `skitOpen`.

**Where it is drawn.** `src/app/features/minigames/skitDraw.ts` paints the preview and every frame of the recording with the same function
(`drawSkit`), so what is previewed is what is recorded. The composing rules and the timeline are pure (`src/minigames/skit.ts`).

**What it does not do (yet).** It does not pose the 3D scene's own avatars: the home scene's guests choose their own poses, the scene host cannot pose
another player, and a title card cannot be burned into the 3D canvas. So the studio is a stage of its own; "my home" is a backdrop, not the real room,
and a world is not yet a backdrop. Posing the real home with consenting guests is the natural next step once the scene host can pose actors.

## 3. NYSC camp and JAMB season

Two seasonal life paths for **Nigeria only** (the character's city decides; `nigeria_only` otherwise), each behind its own **admin switch**
(Admin → Settings: `nyscOn`, `jambOn`; both **off** until an operator turns them on) and a short label (`nyscBatch`, `jambYear`). A new label starts a new
batch or season: everyone can join again. The app shows a season only when it is on or already joined.

The arcs run from the day a person joins, not from a calendar date, so a late joiner still gets the whole path. Both are a game about a stretch of Nigerian
life, written for this game: neither is an official programme, and neither makes a promise about the real thing.

### NYSC camp (three weeks)

| Days of camp | Stage | Duties (one a day, a scene with three choices) |
| --- | --- | --- |
| 1 to 7 | **Registration** | the document queue, the camp clinic, collecting the kit |
| 8 to 14 | **The platoon** | meeting the platoon at dawn, skills day, an evening at Mammy Market |
| 15 to 21 | **The parade** | drill rehearsal, pressing the uniform, the march past |
| 22 | **Passing out** | the passing out parade; the card |

- The camp is the city's: Lagos's is **Iyana-Ipaja Orientation Camp** and Abuja's **Kubwa Orientation Camp**, any other city's is "<City> Orientation
  Camp"; the platoon (1 to 12) is a stable draw from the person's id and the batch.
- The choices are worth 2, 1 or 0 points that **only the server knows**. Nine duties make at most 18 points; 14 or more is a **Distinction**, 9 or more a
  **Credit**, else a **Pass**. A posting ("a community library, running reading hours") is drawn for the card.
- A duty is open once its stage is; a stage left undone stays open; the passing out needs day 22 and all nine duties (`duties_left`, `not_yet`).
- **Pay**: ₦500 a duty and ₦8,000 once at the passing out (₦12,500 a camp). The **passing-out card** (name, camp, platoon, honour, posting, date) is drawn on
  the device from the server's row and handed to Capture to share.

### JAMB season (two weeks)

- **Daily practice**: five original questions a day (two English, two Maths, one General knowledge), drawn from the person's own seed, new questions
  first. They arrive **without answers**; the server checks every answer and tells the person why. ₦50 a right answer, at most ₦250 a day.
- **Mock exam** (after practice on 3 different days): twenty questions (7, 7, 6), twenty minutes, once a season. The browser auto-submits at the end;
  the server marks it from the answers sent (a score out of 400), and after the time and a minute of grace the unanswered count as wrong. ₦1,000 for half
  right or better, ₦200 otherwise.
- **Results day** (day 8 of the season, once the mock is done): the **results card**: the score and a band word (Strong, Good, Almost there, Keep
  reading), the best subject, the practice record and the streak. It goes to Capture like any card; in Lagos it also leads to the UNILAG campus app.
- The season is over after 14 days; the card stays.

**The question bank** (`server/minigames/jamb-questions.ts`): **120 original multiple-choice questions**, 40 each of English, Maths and General
knowledge, written for this game and not copied or adapted from any past paper. Each row holds the right answer, three wrong ones and a one-line
explanation. The four are shown in an order that is the person's own (a hash of their seed and the question), so the position of the answer says
nothing. The bank is server only: it is not in any download. It is a revision game, not an exam.

### The season money

A season payment is the one server-only wallet step `living-world.server` op `minigame-reward` (`src/game/systems/living-world.ts`): it refuses an amount
above `MINIGAME_PAY_CAP` (₦8,000, equal to the passing-out pay; a test keeps them equal) and it is not counted as earned work. On top of it the server caps
a person's season pay at ₦12,000 a Lagos day (`SEASON_DAY_CAP`), and every paid step is exactly-once per request id. A repeat finds the step done.

## Switches and numbers

| Setting (Admin) | Default | Meaning |
| --- | --- | --- |
| `haggleOpen` | on | The market haggle is open. |
| `haggleModel` | on | A model may rephrase a few verdict lines a person a day; off: written lines only. |
| `skitOpen` | on | The skit studio's word check is open. |
| `nyscOn`, `nyscBatch` | **off**, `2026-C` | NYSC camp is open for this batch. |
| `jambOn`, `jambYear` | **off**, `2027` | JAMB season is open for this season. |

| Number | Value | Where |
| --- | --- | --- |
| Haggled buys a day | 3 | `BUYS_PER_DAY` |
| Offers per item and trader a day | 4 (2 on a return the same day, 5 for a regular) | `HAGGLE.rounds` |
| Deal held for | 10 minutes | `HAGGLE.quoteMs` |
| Model rephrases | 3 a person, 60 a server, a day | `REPHRASE_*` |
| Regular after | 3 purchases | `REGULAR_AFTER` |
| Skit | 4 actors, 6 beats (5 in 15 s), 40 + 80 characters | `src/minigames/skit.ts` |
| NYSC | ₦500 a duty, ₦8,000 passing out, 21 days | `nysc.ts` |
| JAMB | ₦50 a right answer (₦250 a day), mock ₦1,000 or ₦200 | `jamb.ts` |
| Season pay | ₦12,000 a Lagos day | `SEASON_DAY_CAP` |

## Stored data and erasure

One small collection `minigames` (keyed, `server/keyed.ts`): `haggle[player]`, `days[player]`, `nysc[player]`, `jamb[player]`, `skits[player]` and a
server-wide `model` counter. Nothing is public. `forgetMinigamesPlayers` (`server/minigames/store.ts`) removes a person from all of it and runs in the
erasure flow (`server/admin/erasure-data.ts`; `minigames` is a known collection of the preflight).

## Measuring

Telemetry events (no names, ids or text): `haggle_talk` (open, deal, buy, card, clip, with the grade), `skit_made` (record, share, with
the number of actors), `season_step` (nysc or jamb, with join, duty, pass-out, practice, mock, card). **Measure** (the plan): plays, clips, return. Keep
what works: if a game is not played, switch it off (`haggleOpen`, `skitOpen`, `nyscOn`, `jambOn`); no release is needed.

## Known limits

- The skit studio is a stage of its own, not the 3D room (see above). Worlds are not yet a backdrop.
- Computer Village sells caps, sandals and baskets: the game has no phones or gadgets as goods.
- NYSC and JAMB are tied to the campus and episode systems only by their cards (the JAMB results card opens the UNILAG campus app in Lagos). They do
  not change `unilag.apply` or the episode chapters, and a JAMB score does not decide anything in the campus rules.
- A season does not follow the real calendar; it runs from the day a person joins.
- The traders' lines are written for the Lagos and Nigerian-market voice; other countries get plain English templates and no city-specific slang.

## Tests

- `server/minigames/rules.test.ts`: traders and their goods, the floor (never under 70% of the list, moved by the day, never undercut by any offer), grades,
  the memory rules, every written line through `agentWords`, the rephrase filter, the JAMB bank (120 questions, 40 each, four distinct answers, the answer in
  every position, a person's own order), the day's draw, the NYSC arc and honours, the money caps.
- `server/minigames.test.ts` (a real server): the haggle end to end (not at the market, the floor never in a response, offers, duplicates, the held deal,
  buying once into the bag, memory the same day / the next day / as a regular, the daily limit, a lapsed deal, a short purse, the switch), the model
  rephrase and its caps, the skit word check, NYSC camp (switch, Nigeria only, stages, one duty a day, pay once, the 21 days, passing out, the card, the
  day cap), JAMB season (no answers sent, checked on the server, paid once, the mock locked then marked, late and junk answer sheets, the results card,
  the end of the season) and erasure.
- `src/minigames/skit.test.ts`: composing and bounds, the timeline, and that nothing in the studio can record sound or upload.
- `src/app/features/minigames/minigames.test.ts`: the haggle's offers and replay, the seasons' tabs and countdown, every pose in every place on every kind
  of frame, the two cards, the telemetry events, and that all three apps are lazy panels with nothing else importing them.
