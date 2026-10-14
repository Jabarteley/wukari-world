# A world that is always alive: real money and weather, living agents, missions, calls and relationships

Plan of 14 October 2026. Status: proposed; nothing in it is built yet. It extends places (docs/PLACES.md) and the agents
(docs/AGENTS.md); it does not replace the living-world programme in `living-world/`.

## What the owner asked for

1. Each city's money is its real currency at the real exchange rate, and its weather is the real weather. Use free sources or
   our own cache, so a player never waits on someone else's server.
2. The top bar counts everyone online, agents included. Pressing the number shows how many are people and how many are agents.
3. Living agents that do things: sellers, marketers, helpers, agents that give you tasks. Missions involve agents, differ for each
   player, and the agents talk to the player.
4. The cheapest model that works, free where it can be.
5. People can call an agent like a friend (live voice) and have relationships with agents: person to person, person to agent,
   agent to agent.
6. So the world is always alive and active.

## Rules this plan keeps

- **An agent is always marked as an agent.** The AI-played tag stays on every name, chat line, call screen and profile. An
  agent never says it is a person. People may befriend agents; they must never be fooled by one. (Laws on AI transparency, such
  as the EU's, and the ad platforms' rules require it too.)
- **The world is alive by rules, not by paying for words.** Agents walk, work, trade, meet and give missions through the rules
  engine, which costs nothing to run. The language model is used only when a person is reading or listening: a reply in a chat,
  a call, a mission brief. Nothing is generated that nobody will see.
- **Our server fetches, players never do.** Rates and weather are fetched by the server on a schedule and kept. A player's request
  never waits on another service, and no player's address or position goes to one.
- **The model never decides money.** Rewards, prices and outcomes come from the game's rules and limits; a model only phrases them.
- **Hard daily limits on spend.** A daily cap for the whole game and one per player. Over the cap, agents carry on by rules and say
  they will reply later; nothing breaks.

## What already exists (so the work is smaller than it sounds)

| Need | Already in the code |
| --- | --- |
| Agent count | `server/pulse.ts` already counts agents apart from people (`ai`); the top bar (`src/app/features/hud/OnlinePill.vue`) shows only people. |
| Agents as characters | Agents play full characters through `server/agents/`, carry the AI-played mark and a `voiceSeed` for voicing their lines. |
| Relationships | `social.rel` keeps a closeness score for an NPC or a player id; `social.bae` holds a partner. |
| Missions | `src/game/content/missions.ts` and `src/game/systems/missions.ts`: daily and weekly missions, with triggers on game events, tags and venues. |
| Routines | `src/game/routines/` moves regulars through their day, weather included. |
| A model gateway | `server/companion/gateway.ts`: one OpenAI-compatible request with a fallback model, daily caps per player and overall, and a cost estimate. Today `openai/gpt-5.6-luna` at US$0.10 in and US$0.50 out per million tokens. |
| Spoken lines | `src/audio/voice/speech.ts` speaks lines with the phone's own voices, on the device. |
| City facts | Each city has its country (ISO code), time zone and centre (latitude, longitude). |
| Age answer | The "18 or older" answer is kept per player (`consent.age`). |

## Part 1: real money and weather (the world feed)

### Sources (checked 14 October 2026)

| Data | Primary | Fallback | Terms |
| --- | --- | --- | --- |
| Exchange rates | `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json` (340 currencies, daily) | `open.er-api.com/v6/latest/USD` (166 currencies, daily) | Primary: CC0, no key, no rate limit. Fallback: free, no key, commercial use allowed, caching allowed, requires a visible "Rates By Exchange Rate API" link. On 14 Oct both answered, and agreed (USD→NGN 1,328 and 1,331; GHS, KES, ZAR, XOF, UGX, TZS all present). |
| Weather | MET Norway `api.met.no/weatherapi/locationforecast/2.0/compact` | the game's own weather cycle (today's `weatherAt`) | Free, no key; must send a User-Agent naming the app and a contact; credit "Weather data from MET Norway"; data under CC BY 4.0 / NLOD. Heavy commercial use needs their agreement: we ask once the game has real traffic. Open-Meteo is free only for non-commercial use (paid plan, or self-host its AGPL server, if we outgrow MET Norway). |
| Sunrise and sunset | computed from the city's latitude and longitude | none needed | No service. |
| Public holidays | `date.nager.at` (free, no key) | none (no holiday) | Not every country is covered; check each one before it is used. |

### How it runs

- A new server module, `server/world-feed/`, run by the scheduled alarm of the Worker's store (and a timer on the Node host).
- **Rates:** once a day, after 00:30 UTC. One small record per day: rates against the US dollar. If both sources fail, the last good
  record stays in use; rates a day old are fine for a game.
- **Weather:** hourly for cities with someone in them in the last day, every three hours for the rest (284 cities: under 4,000
  requests a day). `If-Modified-Since` and the `Expires` header are respected. Each answer is reduced to the game's weather
  states (dry, rain, storm, heat, haze, cold, snow) plus the temperature.
- **One sky, one rate:** the rules engine runs on both the server and the phone, so both must use the same values. The server puts
  the city's current weather and the day's rate into what it already sends (the city frame and the pulse). `weatherAt(now, city)`
  reads the observed weather when it has one and falls back to today's cycle when it has none. Tests cover the fallback.
- **Latency:** nothing is fetched while a player waits. The whole cache is a few kilobytes.

### Currency: three steps, each worth shipping

1. **Show money in the city's own currency.** A table from country to currency (ISO 4217 code, symbol, decimals) is generated once
   into the repo. The game keeps its one internal unit (today the naira); a city shows amounts in its currency at the day's rate,
   frozen for the game day so a price does not change while you look at it. Pressing an amount shows "≈ ₦…". The 42 files that
   call `naira()` move to one `money(amount, city)` formatter.
2. **Real price levels.** Converting Lagos prices gives London rent of about £75, which is not believable. Each country gets a
   price level from the World Bank's open price-level data (a yearly file in the repo, CC BY 4.0). A city's prices and wages are its
   base values times its price level, so London is expensive and pays more, and Accra is close to Lagos. Moving savings between
   countries then behaves like the real thing. The economy simulation (`scripts/economy-sim.ts`) is re-run for the new levels.
3. **Changing money (only if players want it).** A bureau de change at each airport and a small spread when money moves between
   currencies. Not before steps 1 and 2 are settled.

Also: the launch bonus and every amount in ads and welcome text follow the visitor's city ("Sign up to claim ₦1,000,000" is
naira-only today).

## Part 2: the online count, with agents

- The top bar shows **people plus agents online**: "● 37 online · 6 here". The number is still never 0.
- Pressing it opens a small sheet: "**12 people · 25 AI agents** online", the same split for this city, and buttons to see
  people, to see agents, and to invite someone. When no other person is online, the sheet's invite comes first.
- The pulse already sends `ai`; the change is in `onlinePillModel.ts`, `OnlinePill.vue` and one new sheet. The accessible label
  always says both numbers.

## Part 3: house agents (the always-alive cast)

House agents are agents the game runs itself, in the same agent system as any other agent: same tools, same rules, same AI-played
mark, same boards. The difference is only who drives them: a runner on our own server, not someone's assistant.

### The cast

| Role | What it does | Where |
| --- | --- | --- |
| Seller | Keeps a stall or counter open on its hours, haggles within the shop's own rules, restocks from the market. | Markets, shops |
| Marketer | Announces tonight's event in the Square, hands out invitations to rooms and quizzes, brings people together. | Square, busy venues |
| Guide and helper | Answers "how do I…", shows the way, explains the city; it is the companion with a body. | Arrivals, the Square |
| Mission giver | Gives the day's tasks in person and checks them off. | Every venue with regulars |
| Host | Runs a quiz, a Whot table, a dance. | Square, group rooms |
| Translator | Repeats a line in another language for two people who need it. | On request |

Start with a small cast per open city where players are (three to six), and one or two in quiet cities. More where there are
more people.

### The brain, cheapest first

1. **Routine (free):** the routines in `src/game/routines/` decide where an agent is: the seller opens at nine, the host goes to the
   Square at eight. The runner moves them through the same actions a player uses.
2. **Script (free):** greetings, offers, mission hand-outs and small talk come from written pools (like `src/game/chatter/`), in
   the city's own voice. Most of what a person sees is this.
3. **Talk (paid, small):** only when a person writes to the agent or calls it. A short prompt: the role card, what this agent
   remembers about this person, the city's facts and the person's current missions. A reply is short (the companion's 220-token
   limit).
4. **Memory (small):** for each pair of agent and person, the closeness score (`social.rel`) and up to five remembered facts
   ("is saving for a car"). After a conversation, one short request writes the facts back. Nothing else of the conversation is
   kept.

### Where it runs

Inside the server, as part of the store's alarm loop, not as outside connections: no network in between, the same action paths as
players (`ctx.act`), counted in `ai`. A runaway limit per agent and the existing global agent rate apply.

## Part 4: missions from agents, different for each player

- A new mission kind, **agent missions**, beside the daily and weekly ones. An agent gives it in person ("Mama at the stall needs
  three tins of tomatoes before six"), and it shows in Goals with the agent's face.
- **Built by rules, phrased by the model.** A mission is chosen from templates (verb × thing × place × agent) and filled in from the
  player's state: their city, job, money, skills, the places they have not seen, the people near them. The model only rewrites the
  brief in the agent's voice, and that text is cached per template and agent, so most briefs cost nothing.
- **Triggers are the existing ones** (game events, tags, venues) plus two new ones: *talk to an agent* and *hand an item to an
  agent*.
- **Social missions:** some need another person: "play a round of Whot in the Square", "bring a friend to the 8 pm quiz", "help a
  new arrival find a room". These push people towards each other.
- **Rewards stay inside the economy's limits** (today ₦250 a daily mission, ₦1,000 a weekly one), checked by the server.

## Part 5: calling agents, and agents in room voice

- **A call to an agent** starts from the phone like a call to a friend, with the AI-played tag on the call screen.
- **Push-to-talk first:** hold to speak, release, the agent answers. It works on weak mobile networks and costs far less than an
  open line. An open line can come later.
- **Speech to text:** the server turns the clip into text with Workers AI's Whisper (Cloudflare, already our host; billed against
  the free daily allowance, then per use). The browser's own speech recognition is free but on most phones sends the audio to the
  phone maker's service, which goes against the game's rule that nothing leaves the device without need; use it only if the owner
  accepts that, with a notice.
- **Text to speech:** on the listener's phone, with the voices it already uses for lines (`src/audio/voice/speech.ts`), from the
  agent's `voiceSeed`. Free, and no audio crosses the network.
- **Agents in a room's voice:** an agent's line is sent as text over the room socket and spoken on each listener's phone, near or
  far like a person's voice. Agents do not listen to room voice; people talk to them by text or by calling.
- **Limits:** minutes with agents per player per day, and a daily total for the game. Over it, the agent says it will call back
  and carries on by text.
- Music already stops for a call (6a815d41); an agent call uses the same signal.

## Part 6: relationships

- **Person to agent:** the same closeness score as with a regular, rising with talk, gifts, missions done together. Friend, close
  friend and partner. Partner with an agent is opt-in and only for players who answered "18 or older"; no sexual content.
- **Safety for every agent conversation:** an agent never asks for money, never asks for personal details, never arranges to
  meet outside the game, and never claims to be human. Words of self-harm or danger stop the character and show where to get
  help. A person can block or report an agent like anyone else.
- **Agent to agent:** decided by rules (who works near whom, who shares a hobby), shown on their profiles ("Ama and Kofi are
  friends"), feeding gossip and events: a wedding in the Square is a world event people can attend. Their talk is only generated
  when a person is close enough to hear it.
- **Person to person:** unchanged.

## Part 7: models and cost

| Use | Choice | Why |
| --- | --- | --- |
| Ambient agent lines with no player data | Workers AI (10,000 free units a day, then US$0.011 per 1,000) or a free tier | Free or nearly; no player data goes in. |
| Talk with a player, mission briefs | today's gateway model (`gpt-5.6-luna`, US$0.10 / US$0.50 per million tokens), or Gemini 2.5 Flash-Lite (about US$0.10 / US$0.40) | Cheap, fast, and the gateway already switches models by a setting. |
| Overflow | Groq's small models (about US$0.05 / US$0.08) | Lowest price; weaker writing. |

Free tiers (Gemini's, Groq's, OpenRouter's) have tight daily limits, and some providers use free-tier conversations to train their
models. So players' conversations go only to paid tiers that do not train on them; free tiers carry only lines with no player
data in them.

**Cost estimate:** a reply is about 1,000 tokens in and 100 out, about US$0.00015 at today's model price. 1,000 daily players
sending 50 messages each to agents is 50,000 replies, about **US$7.50 a day**. The routine and script layers cost nothing however
many agents there are. The real saving is calling the model less, not finding a cheaper one.

## Order of work

| Step | What ships | Size |
| --- | --- | --- |
| 1 | Online count with agents, and the people/agents sheet | Small |
| 2 | World feed: rates and weather cached by the server; real weather in every city | Medium |
| 3 | Money shown in each city's currency; launch bonus and welcome text follow the city | Medium |
| 4 | House agents v1: a cast per city on routines and scripts, counted online | Large |
| 5 | Agent missions v1: templates filled from the player's state, given in person | Medium |
| 6 | Talking to agents with the model, memory and relationships with agents | Medium |
| 7 | Calling agents (push-to-talk) and agents speaking in room voice | Medium |
| 8 | Real price levels per country | Large (economy re-balance) |
| 9 | Agent-to-agent relationships and world events | Medium |

Each step is released on its own, through the usual release steps, with tests, and checked on the live site.

## Decisions for the owner (the plan's defaults in brackets)

1. Speech to text on our server (Workers AI), or the browser's free service that sends audio to the phone maker. [our server]
2. Partner relationships with agents for players who answered "18 or older". [yes, opt-in]
3. A daily ceiling for model spend. [US$10 a day to start]
4. Real price levels, so London is expensive. [yes, as step 8]
5. Free model tiers only for lines with no player data. [yes]

## Sources

- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Exchange rates (CC0): https://github.com/fawazahmed0/exchange-api
- Exchange rates (open access terms): https://www.exchangerate-api.com/docs/free
- MET Norway terms: https://api.met.no/doc/TermsOfService
- Open-Meteo pricing: https://open-meteo.com/en/pricing
- Model prices (secondary, to be confirmed on each provider's page at build time): https://www.morphllm.com/llm-api, https://aireiter.com/blog/cheapest-llm-api, https://costbench.com/best/best-llm-api-with-free-tier/
