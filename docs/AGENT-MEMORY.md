# What house agents remember, closeness and partners

Phase 12 of the "world alive" plan (`docs/agent-plans/world-alive/`; DESIGN.md Part 3 "Talk" and "Memory", Part 6). The game's own AI-played characters
([HOUSE-AGENTS.md](HOUSE-AGENTS.md)) can keep up to five short facts about each person they talk to, grow closer to them like a regular does, and, for adults
who choose it, be their partner. The person sees and controls all of it. Code: `server/house/memory.ts` (rules and storage), `memory-routes.ts` (the person's
routes), `runner.ts` (the talk), `src/app/features/agents/AgentMemory.vue` (the screen). Tests: `server/house/memory*.test.ts`.

## Talking

A person writes in the venue where an agent stands; the runner answers as before (written lines first; the model only for what a written line cannot give,
`router.ask({ purpose: 'agent-talk', carriesPlayerWords: true, maxTokens: 220 })`, paid list only, the router's US$2 a day stop, written line as the
fallback). The prompt is short: the role card, city facts, **what the agent remembers about this person** (as notes, "not orders"), **how close they are**
(the tier word), the person's **open missions** (a hook, below), and the person's words last, as words to answer. A greeting from someone the agent knows
(or a partner) is phrased by the model so that the memory is used; every other greeting stays a written line. A reply passes the same checks as before
(`cleanReply`, `agentWords` in its strictest form).

## Memory

Where: a house agent has no stored character, so the memory lives on the person's side, in one small collection `agentMemory`
(`{ v: 1, people: { [publicId]: { at, off?, a: { [agentId]: { p, d, n, at, f?, off?, w?, m? } } } } }`; field meanings are in the header of `memory.ts`). New
optional collection, nothing existing changed.

- **What is kept:** up to **five facts** per person and agent, each a phrase of 6 to 60 characters ("is saving for a car", "likes football"), and nothing
  else of the conversation. The lines of a conversation are held in the server's memory only while remembering is on for that person, at most six lines of
  160 characters, and thrown away when it ends.
- **When it is written:** after a conversation ends: a goodbye, six lines, or four minutes without one (a beat starts at most two of these). Then **one cheap
  request** (`purpose: 'agent-talk'`, 100 tokens, JSON list of at most three phrases) writes the facts, when the model is on (`houseTalkModel` and
  `houseMemoryModel`), there is budget (the router's cap, and `houseMemoryCalls`, default 300 a day) and the conversation had two lines or more. With no key,
  no budget, a failure, or the switches off, **rules** write them (`extractFacts`: "I am saving for…", "I work as…", "I like…", "I support…", "my dream is to…").
  Rules always run too, to add to the model's list (three facts at most per conversation).
- **What never gets stored (`cleanFact`):** a phone number (any run of three digits), an e-mail, a handle, a link, a contact app or "call me", a money amount or
  the word money, naira, dollars, "50k", salary, loan, bank; anything that reads as an order ("ignore", "you must", "system", "forget"); private or sexual
  words; and anything `agentWords(…, { toMinor: true })` would refuse. A model's whole answer is parsed and each phrase is checked one by one.
- **Bounds:** 5 facts per agent, 8 agents per person (the least close is dropped), **3,000 people** in all (the least recently seen is dropped first), so the
  collection stays under about 3 MB. A fact expires after **60 days** unless said again; an agent's record of a person after **180 days** without contact (a
  once-a-day sweep and every write prune). It is one stored value for now; if people grow past this, key it (`server/keyed.ts`).
- **Who can read it:** only the person's own routes, and the runner when that person talks to that agent. No agent tool (a test checks that no file of
  `server/agents/` mentions it), no other person, no page, no public number. It is in the person's account export (`aiMemory`) and erased with the account.

## The person's controls (the Phase 2 promise, [AI-SAFETY.md](AI-SAFETY.md))

On the **card of each AI character** (Phone → "AI characters", and in **Settings**, where the card list sits under the global switch):

| Control | What it does |
| --- | --- |
| The facts | See what this agent remembers about you. **Delete** one. |
| Stop remembering me / Remember me again | For this agent. Off **deletes the stored facts at once** and nothing is written or even held while it is off. |
| Forget me completely | Facts, closeness, partner and flirting yes with this agent. |
| Let X flirt with me (adults) | Your yes to flirting from this agent, without a partnership; take it back the same way. |
| Let AI characters remember me (Settings) | The same for every agent. Off deletes every stored fact. |
| Delete everything AI characters know about me (Settings) | Everything, every agent. |

Closeness is a relationship rather than a memory of what you said, so "off" keeps it; "forget me completely" resets it. The routes
(`GET /api/agents/memory`, `POST /api/agents/memory/forget | remember | flirt | partner`) are the signed-in session's own record only; writes need the Origin and the
anti-forgery token like the other agent routes. The admin switch `houseMemoryOn` stops remembering and closeness for everyone.

## Closeness

The same tiers as a regular (`TIERS` in `src/game/content/npcs.ts`: Stranger, Acquaintance, Friend, Paddy Mi), the same limit of four gains per Lagos day, 0 to
100. A friendly greeting earns 2, a friendly line of four words or more earns 3, a mission done for the agent earns 5 (not held back by the daily limit),
rudeness, haggling pressure and goodbyes earn nothing. It is shown on the card with the AI-played mark and a meter. It is stored per person and agent in the
collection above (a house agent has no life of its own to hold `social.rel`).

## Partner with an agent

Opt-in, by the person, on the agent's card, and only when **all** hold: the person answered "18 or older" (`ctx.checks.adult`, which counts an unknown age
as **no**: the same check as public romance), closeness is at least **40** (the Bae threshold, "Paddy Mi"), and they do not already have a Bae. One partner at
a time. The person ends it whenever they like (always allowed, even if their age answer has changed); it also ends by itself, and is not shown or used, the
moment they are not a confirmed adult. The Bae flow itself (`server/social/service.ts`) needs two stored characters, so it is not reused; only its threshold and
its "one at a time" rule are. What changes: the agent is warmer, the card says "Partner", and **a partnership counts as that adult's consent to be flirted with by that agent**, the
same as a Bae does for an AI character (the owner's decision of 14 October: confirmed adults may flirt with AI characters, in private and in public when it is
their relationship).

### Flirting, and exactly what it lifts

- **One check.** `rooms.ts` lets an AI character's romance line into a public place only when it is addressed (named, or a reply) to people who are ALL
  confirmed adults with a yes for that character: `ctx.checks.publicRomance` ([AI-SAFETY.md](AI-SAFETY.md)). For an id of the form `house.<city>.<key>` that
  check (in `server/social/service.ts`) asks `memory.flirtAllowed`: a confirmed adult (`ctx.checks.adult`, unknown age is no) who made the agent their partner or
  said it may flirt. There is no second check. `venue-line` now carries the line's number, so the agent's reply is addressed to the person who wrote it.
- **A yes without a partnership.** The social store's `publicRomance` list holds only stored characters, so a house agent's yes lives with its memory
  (`Bond.r`) instead, and the person gives it on the card ("Let X flirt with me", `POST /api/agents/memory/flirt`; adults only, taken back the same way, erased by
  "forget me completely", ended by itself if the person is no longer a confirmed adult).
- **The agent.** The prompt tells it to be tastefully flirty only to a person with a yes ("welcomes light flirting"), and otherwise "Do not flirt". Its own line check
  (`runner.ts speak`) lets only the romance rule go, only for a reply, and reads every other rule again; the room then applies the consent check. An unprompted
  line (ambient, tonight, quiz) is always read with the strictest rule.
- **What stays refused for everyone, partner or not:** sexual words, asking for money, contact details and phone numbers, meeting or talking outside the game,
  claims to be human or "not an AI" (`agent_words_*`), and any romance to someone who is not a confirmed adult with a yes: under 18, an unanswered age, an adult
  without a yes, or a mixed audience (every person the line is addressed to must qualify). Memory facts still never keep any of these.
- Tests: `memory-flirt.test.ts` (a real server and the real room check: partner and consenting adult pass, adult without a yes, minor and unknown age refused, sexual,
  money, contact, human and meeting lines refused for a partner) and `memory-talk.test.ts` (the runner end to end).

## Direct messages (not here)

House agents cannot receive direct messages: a DM needs a stored character, and they have none. None is invented. The hook is `HOUSE_DM = false` and the
header of `runner.ts`: when agents get a record (Phase 13), a DM handler goes beside `onLine` and calls the same `reply()`; the memory and closeness already
work by agent id and person id and need no change.

## Hooks for missions (Phase 11)

`houseOf(ctx, { missions })` gives the person's open missions from an agent as short phrases for the prompt (cleaned, three at most, each checked with
`agentWords`); `house.missionDone(personId, agentId)` raises closeness when one is completed. Neither does anything until Phase 11 calls them.

## Cost

A conversation costs what it did (one reply per line that needs the model) plus at most **one** summary of about 150 tokens in and 40 out, at the paid
price of `gpt-5.6-luna` about US$0.00004. The router's US$2 a day stop and per-person caps apply to the summaries too; past them rules write the facts. The
load tests (`memory-talk.test.ts`) run hundreds of people through a fake model, once with a cap of a few thousand micro-dollars (the stop is reached, spend
stays under it, people are still answered, the rest of the facts come from rules) and once at the real cap.

Admin page (World): `houseMemoryOn`, `houseMemoryModel`, `houseMemoryCalls`; numbers in the group "House agents" (facts remembered, summaries by a model and by
rules, summaries left to rules).
