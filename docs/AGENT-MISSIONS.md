# Agent missions

Tasks that a house agent ([HOUSE-AGENTS.md](HOUSE-AGENTS.md)) gives a person **in person**, in the agent's venue, beside the daily and weekly missions
(the rules are `src/game/systems/missions.ts`, the pools `src/game/content/missions.ts`). Design: `docs/agent-plans/world-alive/DESIGN.md` Part 4
and PHASES.md Phase 11. Code: `server/house/errands.ts`, `server/house/desk.ts` and, for the life's half, `src/game/systems/agent-missions.ts`.

## What a person sees

- Ask an agent for work in its venue ("any task for me?", "anything I can do?", "any errand?"). The mission giver does it best (Baba Ade, who stands in Lagos when
  `houseAgentsBusy` is 6); **sellers give "fetch me X" errands** and every other agent can send a person to greet another agent or to play. By default Lagos has two
  agents out, so Mama Tolani (the cloth seller) is the one most people meet.
- The agent says its task in its own voice and adds "It is in your Goals". **Goals → Missions** (the Missions app) shows it in a **From agents** section: the
  agent's face (its letter on its colour, as in any list of people) with the **AI-played** mark, the task, the agent's words, **where to find it and when** (the
  venue and its hours), the progress, the reward, and **Go** (walks to the agent's venue when it is in the city the person is in) or **Collect**.
- The task is done by doing it. **Collect** pays the reward once, with the ledger line "Mission: <task>".
- A task of a day lapses at the next Lagos midnight, one marked *big* after seven days. Nothing is taken for missing it.

## Where the task comes from

Rules choose and fill; the model only rephrases.

1. **Templates** (`TEMPLATES` in `errands.ts`): verb × thing × place × agent. Each has a kind, the roles that give it, a test of whether it fits this life, and a
   filler that makes the words and numbers. Today:

   | Template | Kind | Given by | Fits | Reward |
   | --- | --- | --- | --- | --- |
   | `greet` say hello to another agent for the giver | talk | mission giver, seller | another agent is standing in the city | ₦150 |
   | `newhere` say hello to an agent at its place | talk | guide, marketer, quiz host, mission giver | a life that has been to fewer than 6 places this week, or has no friend | ₦150 |
   | `work` tell an agent what you do for work | talk | mission giver, guide, marketer | a life with a job | ₦200 |
   | `stallask` ask a seller how a stall works | talk | guide, mission giver | no stall yet, cash not lean | ₦200 |
   | `stallswap` swap stall stories with a seller | talk | seller, mission giver, guide | a life that has opened a stall | ₦200 |
   | `fetchsmall` bring five seasoning cubes to the seller | hand | seller | fewer than five in the kitchen | ₦250 |
   | `fetchbig` bring one grocery pack of a thing (price ≤ ₦900) | hand, *big* | seller, mission giver | cash not lean; the item is one the life does not hold | the pack's price + ₦100 (to ₦50), at most ₦1,000 |
   | `friend` bring a friend to the giver | bring, *big* | seller, marketer, quiz host, mission giver | at least one friend who is a person | ₦600 |
   | `table` play a table game with another person | table | everyone | fewer than 30 games played | ₦250 |
   | `tableweek` play three table games with other people | table, *big* | quiz host, mission giver, marketer | 5 or more games played | ₦700 |

2. **The life** (`profileOf`): its city, job, cash band (lean under ₦1,500, comfortable from ₦15,000), friends who are people, places reached this week, table games
   played, whether it opened a stall, and what its kitchen holds. Different lives fit different templates and fill them differently (the other agent, the item, the
   job in the words), and the choice is deterministic for (life, agent, day): asking twice gives the same task.
3. **Limits** (`AGENT_MISSIONS` in `src/game/content/missions.ts`, enforced by the life): at most three open, **two given a Lagos day, one *big* a week**, one a day
   from the same agent, no repeat of an id.

## The three new triggers, and the social ones

| Trigger | How it is counted |
| --- | --- |
| **Talk to an agent** (`talk`) | A person's line to the named agent in its venue. The runner hears the line (the same `venue-line` event as every house-agent answer), the desk reads the life and, if a `talk` task names that agent, runs the step. Counts once per agent. The agent answers with a short thanks. |
| **Hand an item to an agent** (`hand`) | A line that sounds like handing over ("here you go", "I brought it", "this is for you") to the agent who asked. The life must hold the items in its kitchen; they leave it and the task is done. Short of items: nothing is taken and the agent says how many are still needed. |
| **Bring a friend** (`bring`, social) | The person speaks to the agent while a **friend who is a person** stands in the same group of the venue (`ctx.checks.groupPeers`; a friend must be on the life's friends list and not an AI-played character). Counts once per friend. |
| **A table game with another person** (`table`, social) | The existing `table.played` event of a counted game against a real person (`human`), whose pair caps are the server's (`growth.table-result`). A game against the computer counts nothing. "Someone new" is whoever the server counts today; there is no list of past opponents in a life. |

Every step is the server-only action **`missions.server`** (`give`, `talk`, `hand`, `bring`, `sale`), run by the desk inside one stored transaction on the settled life
(`ctx.act`, with a `stateGuard` that says why a repeat is harmless). A player cannot call it.

## The hand-over of a held quote

Phase 10's haggle ends in a quote held for ten minutes. The **hand-over** is the person saying they take it ("I'll take it", "deal done", "sell it to me"):

1. The runner checks the person still holds an agreed price with that agent (`haggle.ts`: a deal exists and is under ten minutes old). A counter-offer or a refused
   offer holds no price, so nothing is sold.
2. The desk runs `sale` with **exactly the held price**. The life refuses a price under the least a house agent sells for (`AGENT_MISSIONS.floorShare` = 70% of the
   list price, rounded up to ₦10, the same 30% cap as `haggle.ts` and the least a player-owned shop may ask) or over the list price, a purchase made twice (the
   reference of the agreement is kept in `missions.deal`), too little cash, a full bag, and (for food) a full stomach.
3. **Where the money goes.** A house agent has no wallet and no owner. The economy already treats the game's own shops the same way: groceries, the boutique and
   the market's suppliers are a plain debit with no one to receive it (a sink). The sale is `Bought at <agent>: 1 × <item>` and the money leaves circulation. Nothing
   is paid to a player, so the rules about money between players (earned-from-work allowance, gift caps) do not apply and are not bypassed.
4. **What arrives.** Cloth and crafts go in the **bag** of trade goods (24 units at most, `BAG_LIMIT`), which a shop owner can put on the shelves; food is eaten (its
   needs and its mood, as at a player's stall). The quote is spent.

The model never decides a price or a reward. The seller's verdict is made in `haggle.ts` and a reply with any other number is thrown away, as before.

## What the model does, and what it costs

Only one thing: **it rephrases the written brief in the agent's voice.** `briefPrompt` sends the template's written brief with its `{tokens}` (`{other}`, `{item}`,
`{units}` …) and a rule card; no player, no name of a person, no digit, no reward is in it, so a free model may answer (`carriesPlayerWords: false`, purpose
`agent-talk`, 120 tokens). The answer is kept only if `cleanBrief` passes it: 20 to 200 characters, exactly the tokens of the written brief and no others, no digit, no
link or markup, and the whole text passing `agentWords` for a minor. The tokens are filled afterwards by code. The result is **cached per template and agent**: in memory,
and in the store (`houseBriefs`, at most 400 entries) so a restart or a second Worker instance does not ask again. A failed request waits ten minutes before the same
pair is tried again. With no key, no budget, `houseTalkModel` off, or an answer that fails the check, **the written brief is used** (the task is still given).

Every text a person is shown (the brief and the label) passes `agentWords` for a minor before it is stored; a text that does not is not given. Agents never ask for money,
contact details or a meeting outside the game, and a task never does either.

## Rewards and their limits

- The template sets the reward; a model never sees it. The desk asks the life to store it; **the life refuses** a reward above the daily figure (₦250) or, for a
  *big* task, above the weekly figure (₦1,000) with `too_big`, clamps whatever a save holds when it loads, and clamps again when the task is collected.
- Agents add at most two daily-sized tasks a day (₦500) and one weekly-sized task a week (₦1,000) to what the missions already pay. They add no stars.
- A reward is a normal credit (`Mission: <task>`) and counts in "Missions claimed".

## Stored data

Only optional fields were added to `state.missions` (a life saved before loads unchanged and gains nothing until it is given a task): `agent` (at most six tasks,
each cleaned and clamped by `sanitizeAgent` when a host that plays lives loads it) and `deal` (the reference of the last purchase from a house agent). **The first download carries
none of this** (its size limits are fixed and were full): the browser's engine does not keep these two fields, and the Missions app is given the tasks by the server with the growth
hello (`agentTasks` in the answer of `POST /api/growth/hello`, absent when there are none; the panel asks again each time it opens and after a collect) and turns them into rows
itself (`src/app/features/growth/agentTasks.ts`). The phone's mission badge and the "finished missions" notice therefore count only the daily and weekly ones; the agent says "collect it in Goals"
when a task is done. The new server-only action `missions.server` is listed with the others; the generated action catalogue was refreshed.

## Settings and the admin page

No new setting: tasks follow `houseAgentsOn`, `houseAgentsBusy`, `houseAgentsQuiet` and `houseTalkModel` (off: written briefs only). The dashboard group "House agents"
shows tasks given, briefs phrased by a model, from the cache and written, steps done (greetings, hand-overs, friends brought) and held quotes paid, all for today.

## Checking it

`node --experimental-strip-types --test src/game/agent-missions.test.ts server/house/errands.test.ts server/house/desk.test.ts server/house/runner.test.ts server/house/missions.live.test.ts`

- `agent-missions.test.ts`: the life's half. Limits, rewards that cannot exceed the figures (given, loaded, collected), every trigger, the sale at the exact price and
  never below the floor, old saves.
- `errands.test.ts`: template filling, different lives getting different tasks, every written brief and label through `agentWords` (adult and minor), the model's
  prompt, and `cleanBrief`.
- `desk.test.ts`: the cache (one model call per template and agent, kept across a restart), the written brief with no key, no budget or an unsafe answer, nothing of a
  player or a reward in a prompt, two tasks a day, and the exact price of a sale.
- `runner.test.ts`: tasks and hand-overs routed from a line; a counter or a refusal holds no price; a quote is paid once and only while held.
- `missions.live.test.ts`: a real server and a real life, end to end.
