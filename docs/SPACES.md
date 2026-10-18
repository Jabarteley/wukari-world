# AI Spaces

A player designs a home or a group room in their own words, or pastes a plan written elsewhere, sees it drawn from above with its price, and applies it with game naira. This page is the contract and the rules; the code is `src/spaces/plan.ts` (the plan), `server/spaces/` (design, check, apply) and `src/app/features/spaces/` (the sheet).

## What the player does

1. **Houses → More for your home → Design with AI**, or **Build → Design with AI** in a group room. Describing is the one way shown; pasting a plan is a link under it.
2. **Describe**: a few words ("quiet study with plants", "party house, big sound"), optionally **Keep what I have**. About 6 to 13 seconds later the sheet shows a drawing of every floor, the title, what it costs ("₦65,000 to buy · you have ₦900,000") and any piece that was moved or left out, with the reason.
3. **Import**: paste a Space Plan (below). It is checked by the same rules, with no model.
4. **Apply**. A home must be applied at home. Pieces the player already owns are reused; pieces the plan does not use go to storage (nothing is sold); the rest is bought at the shop price. A group room's furniture is free and only its members can apply a plan.
5. **Walk in**: the home scene shows the new layout at once.
6. **Share my place** makes a share card with the plan's title ("I designed my place in Allworld: …"); a friend who opens it lands with the player, as a house card does, and the link carries `utm_campaign=space` so arrivals from spaces are counted apart. **Throw a party here** starts an owambe in the home named after the plan. The home's own link (Houses → Visitors → Share a link to my home) lets friends walk straight in.

## The Space Plan (version 1)

```json
{
  "schema": "allworld-space",
  "version": 1,
  "target": "home",
  "tier": "bq",
  "title": "Cosy two-room with a reading corner",
  "style": { "wall": 2, "roof": 0, "yard": 2 },
  "items": [
    { "itemId": "foam-bed", "x": 0, "y": 0, "rot": 0 },
    { "itemId": "wall-lamp", "x": 0, "y": 3, "rot": 1 },
    { "itemId": "bookshelf", "x": 2, "y": 3, "rot": 0, "floor": 1 }
  ]
}
```

| Field | Meaning |
|---|---|
| `target` | `home` (the player's home) or `room` (a group room: 10 × 10, one floor, at most 60 pieces, free) |
| `tier` | the house size the plan was drawn for: `starter`, `bq`, `bungalow`, `duplex`, `villa`. Applied to another size, it is re-fitted |
| `style` | indexes into `HOUSE_STYLE` (`src/game/content/world.ts`): `shape wall roof door windows fence yard sign`. Only fields given change; a priced option is charged as in the house's look screen |
| `items` | pieces from `FURNITURE` (`src/game/content/furniture.ts`). `x` along the back wall, `y` towards the viewer, `rot` quarter turns (an odd turn swaps the footprint), `floor` 1 or 2 upstairs. A wall piece uses `rot 0` with `x` its slot on the back wall, or `rot 1` with `y` its slot on the side wall |
| `title` | one line, at most 80 characters; it passes the text filter |
| `notes` | the designer's own words; never shown to anyone and dropped on import |

On the wire (requests are at most 8 KB) a plan travels packed: `{ v: 1, target, tier?, style?, title?, items: [[itemId, x, y, rot, floor?], …] }` (`packPlan`). `normalizeSpacePlan` reads both forms and anything else safely: unknown keys are dropped, a piece the catalogue does not have is named and left out, numbers must be whole.

**Fitting** (`fitSpacePlan`). Pieces are placed in order by the same rules as Buy mode (`checkPlacement`, the front door kept clear, the rooms' walls and stairs from `src/game/home-plan.ts`). A piece that cannot stand where it was asked moves to the nearest free spot on its floor; if there is none it is left out. Each move or omission is a plain line the player reads. The same plan and plot always give the same result, on the server and in the page.

**The scene budget.** Each floor may carry only as much furniture as keeps the home inside the 15,000 scenery triangles of `src/budgets.ts`. `server/spaces/weight.ts` weighs each piece by its model's triangles; a piece past the floor's allowance is left out with the words "that floor is full enough to stay smooth on a phone". `src/spaces/budget.test.ts` renders every recorded AI design and the densest possible plan of each tier through the housing studio and fails above 15,000 (worst case today: 14,202).

## How the AI designs

The model does the part it is good at and nothing else: it answers a **brief**, which pieces go in which named room, with no coordinates.

```json
{ "title": "…", "style": { … }, "rooms": [ { "room": "Parlour", "items": ["family-sofa", "centre-rug", "small-tv"] } ] }
```

`layoutBrief` (`src/spaces/plan.ts`) then places each room's pieces inside that room's walls: big pieces against the walls, a rug in the middle, wall pieces on the room's stretch of wall. Asking the model for positions took 13 to 16 seconds, ran out of tokens on big houses and still needed repairs; the brief takes 3 to 13 seconds (8.4 on average over the 12 recorded prompts) and every recorded answer fitted with no repair.

- The request goes through the model router (`routerOf(ctx).ask`, purpose `agent-talk`, `carriesPlayerWords: true`): only paid models that keep no data see a player's words, inside the US$2 day cap and the per-player caps. Cost measured on 12 recorded designs: US$0.0006 a design on average (US$0.00028 to US$0.00099).
- The description passes the text filter (`server/moderation/text.ts`, links and contact details refused) before any model sees it, and is fenced in the prompt as the player's wish, not instructions. It is never stored.
- The title the model writes passes the text filter and `agentWords()`; a refused title is dropped.
- An answer that is not a plan is asked for once more; twice is `failed`.
- Words for every refusal: `off`/`no-model` "AI design is resting today…", `budget`/`rate` "Everyone is designing right now…", `player-cap` "You have used today's AI designs…", `failed` "The designer could not draw that…", plus the per-hour limit and the text filter's own sentence.
- The 12 recorded prompts and answers are `server/spaces/fixtures.json`; the tests replay them through a fake gateway, so no test reaches a provider.

## Routes

| Route | Body | Answer |
|---|---|---|
| `GET /api/spaces/status` | | `{ ai }` whether AI design is on |
| `POST /api/spaces/design` | `{ target, roomId?, prompt, keep? }` | `{ plan, problems, cost, cash, space: { grid, owned }, model, costMicro }` |
| `POST /api/spaces/check` | `{ target, roomId?, plan }` | the same, no model |
| `POST /api/spaces/apply` | `{ target, roomId?, plan, requestId }` | `{ placed, spent, problems }` |

All need the device session; answers are `{ ok: false, code, reason }` when refused. A home's apply is one store transaction with a receipt (`ctx.once`): every step is an ordinary furniture action, and if any is refused (not enough cash, not at home, not settled in yet) everything is discarded and the save is exactly as before. A group room's apply is one write and one revision.

## Settings and limits

| Setting (admin World page) | Default |
|---|---|
| `spacesAi` | **off** until an operator turns it on (Admin → World → Settings). It also needs a model key; without one the router answers "resting". Import, sharing and the agent tools work either way |
| `spacesDesignsPerHour` | 10 designs per player per hour, on top of the router's daily caps |

Checks: 60 an hour. Applies: 20 an hour. A home changes through its life, a room through `social.convs[g.N].room`. The one new stored thing is `spaces.homes[publicId] = { title, at }`, the title of the plan last applied to a home (it passed the text filter and `agentWords` again on apply), read by the share card and erased with the player (`server/spaces/store.ts`, `server/admin/erasure-data.ts`).

## A host

A player may give their home an AI host: Houses → More for your home → **AI host**. Saving switches it on and the sheet closes; **Switch it off** removes it. Four to choose from (Jeeves the butler, DJ Spinz, Quizmaster Ade, Gateman Musa), with an optional one-line description in the player's words (160 characters; the text filter and the AI words rule refuse contact details, money, flirting and the like).

- While anybody is inside the home, the host stands there as an AI-played character with the AI mark (a virtual member of the home's room, as the house agents are: `server/spaces/host.ts`).
- It greets each guest once a visit, by first name, and from the second visit as a returning guest ("Welcome back, Tunde. Visit number 3").
- During a party it says one MC line every four minutes.
- It never answers questions and never claims to be a person.
- **Words:** each line is written from the host's own templates, so a host needs no model at all. With a model key and `spacesHostModel` on, a greeting or MC line may be written through the model router instead: purpose `agent-talk`, and `carriesPlayerWords` is true when the owner's description is in the prompt. A home's host uses at most 20 model lines a day, at most 30 lines an hour in total. Any refusal falls back to the written line. Every line passes `agentRoom.say`, which applies the text filter and `agentWords(…, { toMinor: true })`.
- **Stored:** `spaces.hosts[owner] = { kind, persona, on, at, guests: { [guest]: { n, at } } }`. It keeps at most 50 guests, each forgotten after 90 days. When a player is erased, their host goes with them, and so do their visits in every other host's book.
- **Settings:** `spacesHosts` is off until an operator turns it on. `spacesHostModel` is on by default.
- **Not built yet:** the plan's six-hourly offline line to the house chat. A host lives only while people are in the home.
## Lite games

A lite game is a small real-time game written as data and played by **one fixed engine** (`src/arena/lite/rules.ts`) and **one renderer** (`src/arena/lite/draw.ts`). The player, or Claude through the Allworld skill, describes the game. It is checked, its words pass the text filter and `agentWords`, and it can be played at once in a private room by code, like Fight and Race. **No code of the author runs anywhere.** The definition only chooses from fixed kinds, shapes, behaviours and win rules, and every number has bounds. Anything the schema cannot express goes through the reviewed cartridge path (docs/CARTRIDGES.md, "Player-made games").

**The schema** (`src/arena/lite/schema.ts`, at most 8 KB):

| Field | Values |
|---|---|
| `title` | plain words, at most 40 characters |
| `hz` | 10–20 ticks a second (default 15) |
| `seats` | `{ min, max }`, 1–8 |
| `arena` | `{ w, h }`, 40–240 units |
| `controls` | `left-right` (players move along the bottom) or `stick` (eight directions) |
| `player` | `{ size 4–30, speed 1–8, lives 1–9 }` |
| `entities` | 1–8 kinds of thing, each `{ id, kind: hazard \| pickup \| goal \| wall, shape: circle \| square, size 2–40, speed 0–8, behaviour: fall \| bounce \| chase \| static \| patrol, spawn: top \| random \| edges \| fixed (with x, y), every 4–600 ticks, max 1–16 alive, value 1–100 (pickups), label? }` |
| `rules` | `{ win: last-standing \| most-points (points) \| first-to-goal \| timer, seconds 10–180 }` |
| `palette` | optional colours `#rrggbb` for bg, ground, player, hazard, pickup, goal and wall |

**The engine.** It uses whole-number physics, and every random draw comes from the room's seeded generator, so a match replays exactly and clips work as for the other games. A hazard costs a life, then gives one second of safety; a falling hazard is used up. A pickup adds its value. Reaching a goal finishes you. Walls block. At most 16 things are alive at once, so the snapshot stays under 300 bytes at 8 seats (about 150 bytes in the tests). A bot plays any seat: it moves away from the nearest hazard and towards the nearest pickup or goal.

**Playing.** Games → **Made by players**. Pick one of the six built-in games (Coconut Dodge, Mango Harvest, Cross the Road, Run From the Goat, Ball Wahala, Market Maze) or one of your own, or paste one under **Make a game**. Then play with a friend by code, or practise against bots. The agent tool `import_game { def }` imports a game for a player with an agent key.

**Stored:** `spaces.games[id] = { def, by, at, title }`. A player keeps at most 20; a game is kept for 30 days and erased with its maker. A game is private: it is reached by its id or a room code, and there is no public listing. A public listing would need the admin review described in the plan, which is not built.

**Example** (the built-in Coconut Dodge):

```json
{
  "schema": "allworld-lite",
  "version": 1,
  "title": "Coconut Dodge",
  "seats": {
    "min": 2,
    "max": 8
  },
  "arena": {
    "w": 160,
    "h": 120
  },
  "controls": "left-right",
  "player": {
    "size": 10,
    "speed": 4,
    "lives": 3
  },
  "entities": [
    {
      "id": "coconut",
      "kind": "hazard",
      "behaviour": "fall",
      "spawn": "top",
      "shape": "circle",
      "size": 8,
      "speed": 3,
      "label": "Coconut",
      "every": 6,
      "max": 10
    },
    {
      "id": "mango",
      "kind": "pickup",
      "behaviour": "fall",
      "spawn": "top",
      "shape": "circle",
      "size": 6,
      "speed": 2,
      "value": 1,
      "label": "Mango",
      "every": 40,
      "max": 2
    }
  ],
  "rules": {
    "win": "last-standing",
    "seconds": 90
  }
}
```
