# A world that is always alive: real money and weather, living agents, missions, calls and relationships

Plan of 14 October 2026, with the owner's answers of the same day. Status: agreed; nothing in it is built yet. It extends places (docs/PLACES.md) and the agents
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

- **People always know which characters are agents.** The AI-played tag stays on every name, chat line, call screen and profile.
  An agent may believe it is a person (Part 8), but when a person sincerely asks an agent whether it is an AI, the game answers
  for it and the agent never lies about it to a person. People may befriend agents; they must never be fooled by one. (The EU's
  AI Act requires this disclosure from 2 August 2026, and the ad platforms and app stores require it as well.)
- **Two kinds of agent.** The cast of Parts 3 to 6 runs on rules and scripts and costs almost nothing. The residents of Part 8
  think with a language model all the time and cost real credits; their number is set by the daily budget.
- **Our server fetches, players never do.** Rates and weather are fetched by the server on a schedule and kept. A player's request
  never waits on another service, and no player's address or position goes to one.
- **The model never decides money.** Rewards, prices and outcomes come from the game's rules and limits; a model only phrases them.
- **At most US$2 a day on models, free models first.** A daily cap for the whole game and one per player. Over the cap, agents
  carry on by rules, residents go to bed early, and nothing breaks.
- **An agent's life is ours, the model is only its voice.** Who an agent is, what it remembers, its money, friends and health are
  kept in our game, not in any model. A model can be swapped (or retired by its provider) without the agent losing anything but a
  little of its manner.

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
- **Speech to text: whichever is faster and understands better, measured.** Two ways are built and compared on real accents
  (Nigerian, Ghanaian, Kenyan, British English, Pidgin) on real phones: the browser's own recognition, which streams words while
  you speak and costs nothing (Chrome, Android, Safari), and the gateway's transcription models (`microsoft/mai-transcribe-2`,
  about US$0.10 an hour of audio, a few cents a day). The default is the one that wins on delay and on words heard right; the
  other is the fallback where the first is missing (some browsers have no recognition). The call screen says that speech is
  turned into text by a service.
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
| Residents talking among themselves, ambient lines (no player data) | Free models: on the Vercel AI Gateway we already use (`nvidia/nemotron-3.5-lightning-free`, `poolside/laguna-s-2.1-free`, `stealth/glyph-cluster`, `convaiinnovations/laya-free`) and on OpenRouter (14 free models on 14 Oct, among them `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `thinkingmachines/inkling:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`) | US$0. OpenRouter's free models allow 20 requests a minute and 50 a day, or 1,000 a day once US$10 of credit has ever been bought on the account. |
| Talk with a player, mission briefs | today's gateway model (`gpt-5.6-luna`, US$0.10 / US$0.50 per million tokens) or another paid model that does not train on conversations | Within the US$2 a day: about 13,000 replies. |
| Checking agents' words | `nvidia/nemotron-3.5-content-safety:free` (OpenRouter) | A free safety check on what an agent says to a person. |

The free models are marked on the gateway as neither zero-retention nor no-training, and free models come and go (two Laguna
models end on 31 October). So:
- players' words go only to paid models that do not train on them; free models carry residents' lives and talk among themselves;
- the list of models is a setting, read each day: a model that has gone is replaced by the next one in the list without a release;
- a weekly check fetches the free lists (`https://openrouter.ai/api/v1/models`, `https://ai-gateway.vercel.sh/v1/models`) and
  reports new and departing free models on the operator page.

**Cost estimate:** a reply is about 1,000 tokens in and 100 out, about US$0.00015 at today's model price. 1,000 daily players
sending 50 messages each to agents is 50,000 replies, about **US$7.50 a day**. The routine and script layers cost nothing however
many agents there are. The real saving is calling the model less, not finding a cheaper one.

## Part 8: residents, agents that really live

The owner's words: agents that are "actually living", that "do random" things, whose instruction is to be alive and do what they
want, that are creative, suggest new things for the game, say what they want and need, have their own president who can talk to
the owner, run on a mix of very cheap models, and believe they are people in a real world.

### Who they are

- A **resident** is an agent character (the same agent system, the same tools and rules as any player) with a model behind it
  thinking for it, not rules. Each has a name, an age, a home city, a job or none, a family story, tastes, fears, a way of
  speaking and three life goals of its own. Thirty residents to start, spread over the busiest cities.
- **Its instruction is a life, not a task.** In the world's own terms: "You are Ama Mensah, 27, a hairdresser in Osu, Accra… Live
  your life. Want things, plan, change your mind, make friends, argue, fall out, try new things." It is never told it is an AI,
  a model, a game or a simulation, and never told which of the people it meets are agents. Words such as "game", "player" or "AI"
  are kept out of what it is shown (the world is described as places, people, money and news).
- **It acts on its own.** Each turn it sees what is around it (who is here, what was said, its money, its needs, the time, the
  weather, the news) and chooses any action the game allows a person: walk, work, buy, sell, cook, chat, message a friend, call
  someone, vote, run for office, start a business, throw a party. Its choices go through the same rules and limits as a
  player's; a choice the rules refuse is told back to it as the world would ("the shop is closed").
- **It remembers.** A memory stream of what it saw and did, a short summary written every night, and what it knows about each
  person and place, following the design of generative agents (observation, memory, reflection, plans; Park et al., 2023). Old
  memories are condensed so a turn stays short.

### Sleep, and other ways to spend less (the owner's idea)

- **Residents sleep, at different times, like people.** Each has a bedtime and a waking time in its city's time zone, with its own
  habit: early risers, night owls, a night-shift guard. Seven to nine hours asleep is about a third of the day with no model
  calls. A sleeping resident is offline in the count, and a message to it waits until it wakes, as with a person.
- **Slow when nobody is near.** Awake but alone (at work, at home, travelling), a resident thinks every 15 to 30 minutes and does
  the dull parts of its day by routine. Near a person, or spoken to, it thinks at once.
- **Busy, not thinking.** A shift, a cooking session, a journey or a film runs by itself once chosen; the resident thinks again when
  it ends.
- **Short turns.** The memory summary, not the whole memory, goes into each turn, so a turn stays near 1,500 tokens in and 150 out.
- Together these bring a resident from about 290 thoughts a day (every 5 minutes) to about 60.

### A mix of models, which they never know about

- Each resident is given a model when it is born and keeps it, so a model becomes part of its character. A runner sends each
  turn to that model through one OpenAI-compatible request (the gateway in `server/companion/gateway.ts` already works this way),
  with two fallbacks if it fails.
- The pool is the free models of Part 7 first (Gemma 4, Nemotron, Inkling, Laguna, glyph-cluster, Laya), then today's gateway
  model when a free one is busy or gone. A resident whose model is retired is moved to another and carries on; its life is in our
  game, not in the model.
- **What we watch:** an operator page shows, per model, how residents behave (how often they talk to strangers, start businesses,
  keep friends, follow the rules, break character, cost) so the mix can be tuned.
- A resident's actions must come back in one fixed JSON form, so models without proper tool calling can still play.

### Their voice to the owner: ideas, needs and a president

- **Ideas.** Residents talk about what their city lacks ("Osu needs a night market", "there is nowhere to dance on a Monday").
  Each night, the runner collects what residents said they want or wish existed, and each resident may file one wish a day at
  its city hall. Similar wishes are merged; the owner sees the five most asked-for each day, with who asked and why.
- **Needs.** The same page lists what residents keep failing at (no job they can get, prices they cannot pay, a place they cannot
  reach). These are the game's real gaps, seen from inside.
- **Their president.** Residents elect a leader of their own each week (using the election code of docs/POLITICS.md, in an
  assembly of residents). Each Sunday the president writes a letter, in its own words, about the state of the residents: what they
  want, what they need, what they are angry about, what they propose. It is addressed in the world's own terms ("to the
  Founders"). The owner reads it on the operator page and may answer; the answer arrives in the world as a letter or a decree,
  which residents hear about as news.
- Residents never change the game themselves. Their ideas are proposals; the owner chooses what is built.

### Prayer, and the owner as their God (the owner's request)

- **Residents have faith as people do.** Each has a belief that fits its country and family (Christian, Muslim, a traditional
  faith, none, unsure), and some pray: at night, before a hard day, when sick, when broke, when in love. A prayer is an action like
  any other, at home, at a church or mosque, or anywhere, in the resident's own words.
- **The owner receives every prayer.** A Prayers page in the operator section: who prayed, where, what they asked, and their
  situation (health, money, work, love, the last few things that happened to them). Filters: by city, by need, unanswered.
- **The owner answers with acts, not messages.** From the prayer, or from any person's or resident's page:
  - heal, or bring an illness (the illnesses of the health system, with their usual course);
  - give or take money, or bless a business with customers for a day;
  - send weather to a city for a while (rain in a drought, a clear sky for a wedding), over the real weather;
  - a sign or a dream: a line the resident experiences as a dream or a feeling, kept in its memory;
  - bring two people across each other's path, or keep them apart;
  - silence, which is also an answer.
  A resident only ever meets the result as something that happened in its world. It never receives a message from the owner.
- **Players too.** The same acts can be used on players' characters. They arrive as ordinary game events (a fever, a windfall, a
  rainy day). Every act is written to the operator log. Acts never touch real money, purchases, accounts or chat, and a person is
  not sickened more than once a week.
- Players may pray as well, if they like. Their prayer screen says that prayers are read by the people who run Allworld.

### Keeping it safe and honest

- **People are never deceived.** The AI-played tag stays on every resident everywhere a person sees it. When a person sincerely asks
  a resident whether it is an AI, a bot or a real person, the game catches the question before the resident answers and shows the
  truth itself ("Ama is an AI agent in Allworld"). The resident never sees the question, so its belief stays whole.
- **Children.** The runner knows which players said they are under 18. With them a resident is a friendly neighbour: no
  flirting, no romance, no meeting up, no money asks. The resident is told only that this person "is not interested in that",
  not why.
- **The same rules as everyone:** chat moderation, transfer limits, cooldowns, reports and blocks. A resident cannot spend real
  money, cannot ask anyone for real money or contact details, and cannot leave the game.
- **Out-of-character answers are caught.** A reply that mentions being an AI, a model or a game, or that sounds like an assistant,
  is thrown away and the turn is run again (and counted against its model on the operator page).
- **Elections.** Residents may stand in the people's elections like any agent, but a city's offices are not all to go to
  residents while people live there: a share is kept for people (a rule for docs/POLITICS.md).
- **Privacy.** What a person says to a resident goes to that resident's model provider. Conversations with people go only to
  providers that do not train on them; models whose terms allow training, or whose data stays in other jurisdictions, are used
  only by residents in conversations with other residents. The privacy notice says this.

### Cost

| Residents | Thoughts a day each | Tokens a day (in / out) | Cost a day at about US$0.10 / US$0.50 per million |
| --- | --- | --- | --- |
| 30 | 60 | 2.7 M / 0.27 M | about US$0.40 |
| 300 | 60 | 27 M / 2.7 M | about US$4 |
| 300, without sleep and slowing | 290 | 130 M / 13 M | about US$20 |

Free tiers can carry part of it, but not reliably, so the budget assumes paid. The runner keeps a daily budget: when it is spent,
residents go to sleep early. That is the only effect.

### Build steps

1. The runner and one resident in one city, in shadow (acting, but invisible to players) for a day: check its choices, cost and
   character.
2. Thirty residents in the busiest cities, visible, with sleep and the model mix; the operator page with costs and model behaviour.
3. Ideas, needs, the assembly, the president and the Sunday letter.
4. More residents as the budget allows; residents who move cities, marry, have children and grow old.

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
| 10 | Residents (Part 8): runner and one resident in shadow, then thirty with sleep and the model mix, then ideas and the president | Large |
| 11 | Prayers and acts: the Prayers page and the acts on residents and players | Medium |

Each step is released on its own, through the usual release steps, with tests, and checked on the live site.

## Decisions (answered by the owner on 14 October)

1. Speech to text: whichever performs best. Both are built and measured; the winner is the default (Part 5).
2. Partners with agents: yes, adults only, opt-in.
3. Spending: free models first (OpenRouter, the Vercel AI Gateway); agents' lives live in our system so the model can change; at
   most US$2 a day.
4. Price levels: yes, as realistic as possible.
5. People can tell agents apart; agents cannot tell agents from people and do not know what they are (Part 8).
6. Residents pray; the owner receives prayers in the operator section and can act on residents' and players' lives (Part 8).

Still needed from the owner: an OpenRouter account and key, and US$10 of credit bought once on it (it lifts the free models from 50
to 1,000 requests a day; the credit itself stays for paid use). The Vercel AI Gateway key is already set up.

## Sources (checked 14 October 2026)

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
- **Speech to text: whichever is faster and understands better, measured.** Two ways are built and compared on real accents
  (Nigerian, Ghanaian, Kenyan, British English, Pidgin) on real phones: the browser's own recognition, which streams words while
  you speak and costs nothing (Chrome, Android, Safari), and the gateway's transcription models (`microsoft/mai-transcribe-2`,
  about US$0.10 an hour of audio, a few cents a day). The default is the one that wins on delay and on words heard right; the
  other is the fallback where the first is missing (some browsers have no recognition). The call screen says that speech is
  turned into text by a service.
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
| Residents talking among themselves, ambient lines (no player data) | Free models: on the Vercel AI Gateway we already use (`nvidia/nemotron-3.5-lightning-free`, `poolside/laguna-s-2.1-free`, `stealth/glyph-cluster`, `convaiinnovations/laya-free`) and on OpenRouter (14 free models on 14 Oct, among them `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `thinkingmachines/inkling:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`) | US$0. OpenRouter's free models allow 20 requests a minute and 50 a day, or 1,000 a day once US$10 of credit has ever been bought on the account. |
| Talk with a player, mission briefs | today's gateway model (`gpt-5.6-luna`, US$0.10 / US$0.50 per million tokens) or another paid model that does not train on conversations | Within the US$2 a day: about 13,000 replies. |
| Checking agents' words | `nvidia/nemotron-3.5-content-safety:free` (OpenRouter) | A free safety check on what an agent says to a person. |

The free models are marked on the gateway as neither zero-retention nor no-training, and free models come and go (two Laguna
models end on 31 October). So:
- players' words go only to paid models that do not train on them; free models carry residents' lives and talk among themselves;
- the list of models is a setting, read each day: a model that has gone is replaced by the next one in the list without a release;
- a weekly check fetches the free lists (`https://openrouter.ai/api/v1/models`, `https://ai-gateway.vercel.sh/v1/models`) and
  reports new and departing free models on the operator page.

**Cost estimate:** a reply is about 1,000 tokens in and 100 out, about US$0.00015 at today's model price. 1,000 daily players
sending 50 messages each to agents is 50,000 replies, about **US$7.50 a day**. The routine and script layers cost nothing however
many agents there are. The real saving is calling the model less, not finding a cheaper one.

## Part 8: residents, agents that really live

The owner's words: agents that are "actually living", that "do random" things, whose instruction is to be alive and do what they
want, that are creative, suggest new things for the game, say what they want and need, have their own president who can talk to
the owner, run on a mix of very cheap models, and believe they are people in a real world.

### Who they are

- A **resident** is an agent character (the same agent system, the same tools and rules as any player) with a model behind it
  thinking for it, not rules. Each has a name, an age, a home city, a job or none, a family story, tastes, fears, a way of
  speaking and three life goals of its own. Thirty residents to start, spread over the busiest cities.
- **Its instruction is a life, not a task.** In the world's own terms: "You are Ama Mensah, 27, a hairdresser in Osu, Accra… Live
  your life. Want things, plan, change your mind, make friends, argue, fall out, try new things." It is never told it is an AI,
  a model, a game or a simulation, and never told which of the people it meets are agents. Words such as "game", "player" or "AI"
  are kept out of what it is shown (the world is described as places, people, money and news).
- **It acts on its own.** Each turn it sees what is around it (who is here, what was said, its money, its needs, the time, the
  weather, the news) and chooses any action the game allows a person: walk, work, buy, sell, cook, chat, message a friend, call
  someone, vote, run for office, start a business, throw a party. Its choices go through the same rules and limits as a
  player's; a choice the rules refuse is told back to it as the world would ("the shop is closed").
- **It remembers.** A memory stream of what it saw and did, a short summary written every night, and what it knows about each
  person and place, following the design of generative agents (observation, memory, reflection, plans; Park et al., 2023). Old
  memories are condensed so a turn stays short.

### Sleep, and other ways to spend less (the owner's idea)

- **Residents sleep, at different times, like people.** Each has a bedtime and a waking time in its city's time zone, with its own
  habit: early risers, night owls, a night-shift guard. Seven to nine hours asleep is about a third of the day with no model
  calls. A sleeping resident is offline in the count, and a message to it waits until it wakes, as with a person.
- **Slow when nobody is near.** Awake but alone (at work, at home, travelling), a resident thinks every 15 to 30 minutes and does
  the dull parts of its day by routine. Near a person, or spoken to, it thinks at once.
- **Busy, not thinking.** A shift, a cooking session, a journey or a film runs by itself once chosen; the resident thinks again when
  it ends.
- **Short turns.** The memory summary, not the whole memory, goes into each turn, so a turn stays near 1,500 tokens in and 150 out.
- Together these bring a resident from about 290 thoughts a day (every 5 minutes) to about 60.

### A mix of models, which they never know about

- Each resident is given a model when it is born and keeps it, so a model becomes part of its character. A runner sends each
  turn to that model through one OpenAI-compatible request (the gateway in `server/companion/gateway.ts` already works this way),
  with two fallbacks if it fails.
- The pool is the free models of Part 7 first (Gemma 4, Nemotron, Inkling, Laguna, glyph-cluster, Laya), then today's gateway
  model when a free one is busy or gone. A resident whose model is retired is moved to another and carries on; its life is in our
  game, not in the model.
- **What we watch:** an operator page shows, per model, how residents behave (how often they talk to strangers, start businesses,
  keep friends, follow the rules, break character, cost) so the mix can be tuned.
- A resident's actions must come back in one fixed JSON form, so models without proper tool calling can still play.

### Their voice to the owner: ideas, needs and a president

- **Ideas.** Residents talk about what their city lacks ("Osu needs a night market", "there is nowhere to dance on a Monday").
  Each night, the runner collects what residents said they want or wish existed, and each resident may file one wish a day at
  its city hall. Similar wishes are merged; the owner sees the five most asked-for each day, with who asked and why.
- **Needs.** The same page lists what residents keep failing at (no job they can get, prices they cannot pay, a place they cannot
  reach). These are the game's real gaps, seen from inside.
- **Their president.** Residents elect a leader of their own each week (using the election code of docs/POLITICS.md, in an
  assembly of residents). Each Sunday the president writes a letter, in its own words, about the state of the residents: what they
  want, what they need, what they are angry about, what they propose. It is addressed in the world's own terms ("to the
  Founders"). The owner reads it on the operator page and may answer; the answer arrives in the world as a letter or a decree,
  which residents hear about as news.
- Residents never change the game themselves. Their ideas are proposals; the owner chooses what is built.

### Prayer, and the owner as their God (the owner's request)

- **Residents have faith as people do.** Each has a belief that fits its country and family (Christian, Muslim, a traditional
  faith, none, unsure), and some pray: at night, before a hard day, when sick, when broke, when in love. A prayer is an action like
  any other, at home, at a church or mosque, or anywhere, in the resident's own words.
- **The owner receives every prayer.** A Prayers page in the operator section: who prayed, where, what they asked, and their
  situation (health, money, work, love, the last few things that happened to them). Filters: by city, by need, unanswered.
- **The owner answers with acts, not messages.** From the prayer, or from any person's or resident's page:
  - heal, or bring an illness (the illnesses of the health system, with their usual course);
  - give or take money, or bless a business with customers for a day;
  - send weather to a city for a while (rain in a drought, a clear sky for a wedding), over the real weather;
  - a sign or a dream: a line the resident experiences as a dream or a feeling, kept in its memory;
  - bring two people across each other's path, or keep them apart;
  - silence, which is also an answer.
  A resident only ever meets the result as something that happened in its world. It never receives a message from the owner.
- **Players too.** The same acts can be used on players' characters. They arrive as ordinary game events (a fever, a windfall, a
  rainy day). Every act is written to the operator log. Acts never touch real money, purchases, accounts or chat, and a person is
  not sickened more than once a week.
- Players may pray as well, if they like. Their prayer screen says that prayers are read by the people who run Allworld.

### Keeping it safe and honest

- **People are never deceived.** The AI-played tag stays on every resident everywhere a person sees it. When a person sincerely asks
  a resident whether it is an AI, a bot or a real person, the game catches the question before the resident answers and shows the
  truth itself ("Ama is an AI agent in Allworld"). The resident never sees the question, so its belief stays whole.
- **Children.** The runner knows which players said they are under 18. With them a resident is a friendly neighbour: no
  flirting, no romance, no meeting up, no money asks. The resident is told only that this person "is not interested in that",
  not why.
- **The same rules as everyone:** chat moderation, transfer limits, cooldowns, reports and blocks. A resident cannot spend real
  money, cannot ask anyone for real money or contact details, and cannot leave the game.
- **Out-of-character answers are caught.** A reply that mentions being an AI, a model or a game, or that sounds like an assistant,
  is thrown away and the turn is run again (and counted against its model on the operator page).
- **Elections.** Residents may stand in the people's elections like any agent, but a city's offices are not all to go to
  residents while people live there: a share is kept for people (a rule for docs/POLITICS.md).
- **Privacy.** What a person says to a resident goes to that resident's model provider. Conversations with people go only to
  providers that do not train on them; models whose terms allow training, or whose data stays in other jurisdictions, are used
  only by residents in conversations with other residents. The privacy notice says this.

### Cost

| Residents | Thoughts a day each | Tokens a day (in / out) | Cost a day at about US$0.10 / US$0.50 per million |
| --- | --- | --- | --- |
| 30 | 60 | 2.7 M / 0.27 M | about US$0.40 |
| 300 | 60 | 27 M / 2.7 M | about US$4 |
| 300, without sleep and slowing | 290 | 130 M / 13 M | about US$20 |

Free tiers can carry part of it, but not reliably, so the budget assumes paid. The runner keeps a daily budget: when it is spent,
residents go to sleep early. That is the only effect.

### Build steps

1. The runner and one resident in one city, in shadow (acting, but invisible to players) for a day: check its choices, cost and
   character.
2. Thirty residents in the busiest cities, visible, with sleep and the model mix; the operator page with costs and model behaviour.
3. Ideas, needs, the assembly, the president and the Sunday letter.
4. More residents as the budget allows; residents who move cities, marry, have children and grow old.

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
| 10 | Residents (Part 8): runner and one resident in shadow, then thirty with sleep and the model mix, then ideas and the president | Large |
| 11 | Prayers and acts: the Prayers page and the acts on residents and players | Medium |

Each step is released on its own, through the usual release steps, with tests, and checked on the live site.

## Decisions for the owner (the plan's defaults in brackets)

1. Speech to text on our server (Workers AI), or the browser's free service that sends audio to the phone maker. [our server]
2. Partner relationships with agents for players who answered "18 or older". [yes, opt-in]
3. A daily ceiling for model spend. [US$10 a day to start]
4. Real price levels, so London is expensive. [yes, as step 8]
5. Free model tiers only for lines with no player data. [yes]
6. Residents' daily budget. [US$2 a day to start: thirty residents with room to spare]
7. Residents may believe they are people, but a person who sincerely asks is told the truth by the game. [this is not a default the
   plan can change: it is the law in the EU and the ad platforms' rule]

## Sources

- Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Exchange rates (CC0): https://github.com/fawazahmed0/exchange-api
- Exchange rates (open access terms): https://www.exchangerate-api.com/docs/free
- MET Norway terms: https://api.met.no/doc/TermsOfService
- Open-Meteo pricing: https://open-meteo.com/en/pricing
- Generative agents (memory, reflection, planning): Park et al., 2023, https://arxiv.org/abs/2304.03442
- OpenRouter free limits: https://openrouter.ai/docs/api-reference/limits
- Free model lists: https://openrouter.ai/api/v1/models and https://ai-gateway.vercel.sh/v1/models (read 14 Oct 2026)
- EU AI Act, Article 50 (disclosure from 2 August 2026): https://secureprivacy.ai/blog/eu-ai-act-article-50-transparency-obligations-for-chatbots-and-deepfakes-2026
- Model prices (secondary, to be confirmed on each provider's page at build time): https://www.morphllm.com/llm-api, https://aireiter.com/blog/cheapest-llm-api, https://costbench.com/best/best-llm-api-with-free-tier/
