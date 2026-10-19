# Wow plan: what to build next so people play, share and come back

Started 19 October 2026 (the owner: "proceed to spin up sub agents and implement"); the decisions below were taken as defaults, all reversible. It follows [AD-READY-PLAN.md](AD-READY-PLAN.md) (live) and turns the two
research passes of 19 October into work. Each phase is its own release, built and deployed the usual way.

## What the research said, in one paragraph

Lagos Life went viral this month on browser-only access, recognisable Lagos detail and bragging screenshots; Allworld's answer is the whole
world, real cities and real people, not another Lagos sim. The strongest signals for this list were: **danfo driving** (Lagos Run: about 140,000
players in a week, and the inspiration for Lagos Life), **weekly world events** (Grow a Garden's weekly cadence, 22.3M concurrent), **AI
characters that remember you** (88% of Nigerian adults have used a chatbot), **Detty December and the diaspora** (about 3.6M took part in 2025,
the US now the top source) and **voting culture** (BBNaija season 9: 1.53 billion votes). Owambe and market haggling had no signal either way:
open lanes, untested. People hate adult ads near teenagers, money that can vanish, cash-out scams in chat, and AI characters taken away. Sources
are in the research notes of 19 October (news coverage; no Reddit or X threads were reachable with the tools).

## Already built, and reused here

| Exists | Where | Phases |
| --- | --- | --- |
| Owambe parties at home: aso-ebi colour, MC and DJ, "spray the floor" lines | `docs/FESTIVALS.md`, `src/festivals/party.ts`, `server/social/party.ts` | 7 |
| Match nights (schedule only, no stream or score) and the festival calendar | `docs/FESTIVALS.md`, `src/festivals/matches.ts` | 7 |
| House agents: the game's own AI cast, with up to five remembered facts per person, closeness and partners | `docs/HOUSE-AGENTS.md`, `docs/AGENT-MEMORY.md`, `server/house/` | 3 |
| The gist: public lines of what happened in each city, shareable | `docs/GIST.md`, `server/gist/ledger.ts` | 3, 4 |
| Elections, parties, laws, treasuries and the public record | `docs/POLITICS.md` | 2 |
| Vehicles, fleets, journeys, driving practice and danfo fares | `src/game/living-world/{driving,fleet,journey}.ts`, travel | 1 |
| Map billboards beside venues | `src/city-map.ts` (billboards layer) | 5 |
| Worlds with a shared screen (YouTube) and voice | `docs/WORLDS.md` | 7, 8 |
| Clips with the @handle mark, share cards, the dive, street links, the location badge, Near you | `docs/AD-READY-PLAN.md`, `docs/FEED.md` | 4, 5, 8 |
| Business listings and boosts, Earn (tickets, gig pay, creator pool) | `docs/PROMOTE.md`, `docs/EARN.md` | 5 |

## Phase 0 — Safety first (before any new crowd arrives)

The things people hate, closed before the features that bring more people. Small and quick.

| Item | What a person sees | Builds on | Effort |
| --- | --- | --- | --- |
| Scam warning in chat | A message that asks for money, a "withdrawal", an account number or a code outside the game gets a calm banner: "Game naira is never real money. Nobody can withdraw it for you." One tap reports it. | the chat words filter, `server/moderation/agent-words.ts` money patterns | 1 day |
| A page that says what money is | `/money`: game naira is never real money and never bought; what real money exists (boosts, tickets, gig pay through Bachs) and who holds it (never Allworld). Linked from the HUD purse. | `server/privacy-page.ts` pattern | half a day |
| AI characters are never taken away quietly | A rule in `docs/HOUSE-AGENTS.md` and the code: a followed or partnered agent that must change gets 7 days' notice in the person's inbox and a "goodbye" moment; its memory export stays downloadable. | `server/house/memory.ts` | 1 day |
| Age gates on the new live features | Voice stages, Allworld House voting and the noticeboard follow the adult rules the feed already has. | `ctx.checks.adult` | inside each phase |

## Phase 1 — Danfo driver (strongest local signal)

**What a person sees.** At a motor park, "Drive a danfo". A route across Lagos (or Accra, Nairobi, any city with a danfo-type route) with
traffic, go-slow, okadas cutting in, potholes and a conductor who shouts the stops ("Oshodi! Oshodi! Enter with your change!"). Passengers,
players or AI, wave from the roadside; you stop, they board, you earn game naira per drop, lose it for a hard brake or a missed stop. Friends
can ride along as passengers or as the conductor. A run ends with a card: route, fares, "best driver on the Ikorodu Road this week".

**What is new.**
- A driving mode on the existing living-world vehicles (`driving.ts`, `fleet.ts`): a route from the city's danfo lines, a timed run, pick-up
  and drop-off stops, a fare meter, traffic density from the existing crowd density, simple collisions.
- The conductor: lines from the talk banks (`docs/TALK-BANKS.md`), one per city, voiced by text bubbles; a player can take the role.
- A weekly leaderboard per route, and a gist line for the best run ("Tunde made ₦12,400 on the Oshodi run").
- A clip button at the end of a run (the Phase 2 capture pipe with the mark), sized for TikTok.
- Works on a phone with touch steering; the 2D map fallback shows the route as a lane game for weak devices.

**Measure.** Runs per day, runs per person, clips shared from runs, day-7 return of people who drove. **Effort:** about two weeks. **Risk:**
phone performance in traffic; the lane fallback keeps it playable.

## Phase 2 — The weekly world event and election night

**What a person sees.**
- **One world event every week, at a fixed time** (Saturday 20:00 WAT), announced all week. Everyone online works toward one goal in one city:
  rebuild a fallen bridge, clear a flood, get a festival ready, find a hidden thing across the map. A shared progress bar in the Square; a
  badge for everyone who helped; the city looks different afterwards for a week. An hour before, a "the admins are in town" warm-up with
  surprises (Grow a Garden's format).
- **Election night** for the one-week governor terms: a debate room the night before (candidates on a stage, voice, questions from the
  audience), results live in the Square with a big board, the winner's speech broadcast, and a results card ("Ada wins Lagos with 61%").
  AI candidates can stand too, labelled.

**What is new.**
- An event engine: a weekly schedule, a goal with a shared counter fed by real actions (walking somewhere, carrying, building, answering),
  a server-side state for the city's change, and the badge. Admin-editable without a release (the festivals' pattern).
- A stage mode for a venue: speakers and an audience, a moderator, a queue of questions (Phase 8 stage rooms reuse it).
- The results board and the speech moment, plus the gist lines and cards.

**Measure.** Concurrent players at event time, share of weekly actives who joined, votes cast. **Effort:** about two weeks. **Risk:** an event
nobody attends looks bad; start with AI residents helping so the bar always moves.

## Phase 3 — AI residents people remember and follow

**What a person sees.**
- The game's AI residents greet you by name, remember what you did yesterday ("You lost at Ayo to me. Again?"), and talk about you to others
  ("Ada said you cook the best jollof in Yaba"). Gossip only repeats things that are true and public: the gist ledger is the source of truth.
- Each AI resident has a profile you can **follow**, with a daily line of what they did and a weekly highlight post in the feed, labelled AI.
- **Spot the AI**: a weekly guessing game in the Square: five people talk, guess which are AI; the answer reveals the labels the game always
  shows. A score card to share.
- **An AI landlord, a boss and a rival** in each player's life sim, with personalities, so the life has drama when friends are offline.
- **Your AI twin (later in the phase, opt-in):** while you are offline, an AI plays your character inside limits you set (go to work, keep the
  shop open, answer "busy"), and you get a recap. Never spends real money, never posts as you without the AI mark, off by default.

**What is new.** Gossip and greeting on top of `server/house/memory.ts` (facts already stored, consented and visible to the person); a
follow edge and highlight posts for agents in the feed (`server/feed/service.ts`); the Spot-the-AI room; the landlord/boss/rival roles in
the life sim; the twin as a bounded agent session (`docs/AGENTS.md` rules).

**Measure.** Follows of AI residents, replies to their posts, sessions with an AI greeting, twin opt-ins. **Effort:** about three weeks
(twin last). **Risk:** cost of model calls (keep the daily cap per city), and gossip that hurts: only public gist facts, never private ones.

## Phase 4 — Things people screenshot and post

| Item | What a person sees | Builds on |
| --- | --- | --- |
| **Childhood-street video** | "Find my old street" → the dive from space down to that street and the front door, recorded, captioned ("Where I grew up · Surulere, Lagos"), with the mark. | the dive (`src/map3d/dive.ts`), street links, capture with the mark |
| **"What did you get" start card** | At the end of character creation: your starting life (job, house, money, a funny title), fun not punishing, sized for Status. | the creator, `characterCard.ts` |
| **Monthly Wrapped** | Places visited, friends made, game naira earned, elections voted in, your top AI rival, your most-liked post. | growth metrics, gist, feed |
| **Passport stamps** | Every real city you visit stamps your passport; a page per continent; collectors share full pages. | travel, the 284-city catalogue |
| **City front page** | Every morning an AI-written newspaper front page for each city from real gist lines ("Governor Ada's tax raise sparks protest"). Shareable image. | gist ledger, the model router |
| **Street fame** | The most-visited homes and most-liked communities each week, a badge and a card. | visits, communities |
| **Duets** | Answer someone's clip with yours side by side. | capture, feed media |

**Measure.** Cards and clips shared per weekly active, landings by `utm_source`. **Effort:** about two weeks for all seven. **Risk:** none
heavy; keep the dive video on the device like capture.

## Phase 5 — Real-world value in the world

| Item | What a person sees | Builds on |
| --- | --- | --- |
| **3D billboards** | Boosted businesses appear on real billboards on the 3D streets of their city, not only in the feed; a tap opens the business. | promote boosts, map billboards, venue scenes |
| **Business districts** | A street in each city where verified local businesses have a 3D shop front linking to WhatsApp or their Showcase. | business listings, Showcase |
| **Neighbourhood noticeboard** | For people with a badge in the area: power ("NEPA don bring light?"), water, lost and found, roadworks. Votes keep it current. | Near you, the badge, the AI reviewer |
| **Meet your neighbours** | A monthly real meetup per area, ticketed through Earn, open to badge holders. | events, tickets, badge |
| **Economy dashboard** | A public page per city: the rich list, prices, the governor's budget and tax take, game naira in circulation. | politics treasuries, the bank |

**Measure.** Billboard taps, business contacts, noticeboard posts, meetups held. **Effort:** about two weeks. **Risk:** billboards near
teenagers: every listing already passes the advertising rules; keep adult-only categories out.

## Phase 6 — Detty December (date-bound: live by 1 December)

**What a person sees.** From 1 to 31 December a season across Lagos, Accra and Abuja: a December skin on the city (lights, beach days at
Elegushi, street parties), nightly concerts and owambe Saturdays, a **"Returnee"** badge for people with a badge outside the country who visit
their home city in-game, and a daily drop of something to do. `/visit/lagos` becomes "Detty December in Lagos" for the month, and the
diaspora advert runs with it. A season card at the end ("I did Detty December in Allworld").

**What is new.** A season in the festival calendar (`src/festivals/`), the city skin (lighting and props per city), the returnee rule (badge
country differs from the visited city's country), the daily drop list (admin-editable), and the entry variant for December.

**Measure.** Diaspora landings, returnee badges, December day-7 return. **Effort:** about ten days. **Deadline:** start by 10 November.

## Phase 7 — Shared watching, Allworld House, artists and owambe

| Item | What a person sees | Builds on |
| --- | --- | --- |
| **Match night, upgraded** | Viewing-centre rooms with voice, a predictions card before kick-off (bragging rights and badges, never money), and a result card. Fans watch on their own TV; Allworld never streams. | match nights (`src/festivals/matches.ts`), voice, events |
| **Allworld House** | A reality season in a 3D house: a mix of player housemates (adults, opted in) and AI housemates; viewers vote every Sunday; eviction night is a live event. Seasons of four weeks. | Worlds (the house), voting, stage mode (Phase 2), AI residents (Phase 3) |
| **Artist premieres** | An artist drops a song in a venue; fans listen together in voice rooms; a ticketed front row; a clip of the moment. | events, tickets (Earn), the Worlds shared screen |
| **Owambe, upgraded** | Spraying shows notes flying (game naira, the Square's rules), aso-ebi outfits for every guest from the party's colour, a jollof table, and a "who came" photo card at the end. | owambe parties, wardrobe, capture |

**Measure.** Viewers per match night, Allworld House votes, artist-event tickets, party cards. **Effort:** about three weeks. **Risks:**
broadcast rights (never a stream or a score feed without a licence); "Big Brother" is a trademark (the name is Allworld House); artists need
real agreements before their names appear.

## Phase 8 — Social glue

| Item | What a person sees | Builds on |
| --- | --- | --- |
| **Close-friends presence** | Opt-in: "Tunde is in the Square now", "Ada is at Freedom Park". Places in the game only, never a map pin of the real world. | online/visits, places |
| **Stage rooms** | A hosted talk in a venue: speakers on stage, audience raise hands, an optional recording. Nigerians use Twitter Spaces heavily. | Phase 2 stage mode, voice, calls |
| **Gist board with guardrails** | A confessions-style board per campus or community that feels anonymous to readers but is never anonymous to moderators; badge-only; the AI reviewer on every post; fast removal. Anonymous apps without this failed. | Near you, the reviewer, communities |
| **Group trips** | A crew books one danfo or flight together and arrives together, with a trip card. | travel, crews |
| **Family life** | Marriage between two adult players (both say yes), a shared home, cooking together, raising an AI child through school years (a story arc, never a real minor). | houses, partners (`AGENT-MEMORY.md`), campus |

**Measure.** Presence opt-ins, stage-room listeners, board posts removed versus kept, marriages. **Effort:** about three weeks.

## Phase 9 — Local mini-games (untested lanes)

| Item | What a person sees | Builds on |
| --- | --- | --- |
| **Balogun haggle** | Haggle with AI traders at Balogun Market or Computer Village who remember you ("You again? Last price."). Win a better price; a clip of the best haggle. | house agents, market, talk banks |
| **Skit studio** | Pose your character and friends on a set, record a 30-second skit with voice, export with the mark for TikTok. | capture, Worlds, voice |
| **NYSC camp and JAMB season** | Seasonal life paths: a camp with a platoon and a parade; a revision season with real practice questions and a results day. | campus (`docs/CAMPUS-UNILAG.md`), episodes |

**Measure.** Plays, clips, return. **Effort:** about two weeks. These had no signal either way: ship small, measure, keep what works.

## Order, and why

1. **Phase 0** (safety): before more people arrive.
2. **Phase 1** (danfo driver): the strongest local signal.
3. **Phase 6** (Detty December): date-bound; must start by 10 November.
4. **Phase 2** (weekly event and election night) and **Phase 3** (AI residents): the reasons to come back every week.
5. **Phase 4** (share loops): every phase above feeds it cards and clips.
6. **Phase 5** (real-world value), **Phase 7** (shared watching), **Phase 8** (social glue), **Phase 9** (mini-games).

About fourteen to sixteen weeks of agent work in all if done one after another; with parallel agents on separate phases, Phases 0–4 and 6
fit in the six weeks before December.

## Decisions (taken as defaults on 19 October; the owner can change any)

1. **Danfo:** a mode inside the life sim (a job at the motor park), and the headline of the next advert.
2. **Football:** voice rooms and predictions only (bragging rights and badges). No stream, no score feed; the result is entered by an admin.
3. **Allworld House:** AI housemates only for the first season; viewers (adults) vote. Player housemates later.
4. **AI twin:** not built now (privacy and model cost); Phase 3 builds everything else.
5. **Family life:** marriage between two adult players and a shared home; no child arc for now.
6. **Artists:** unsigned artists apply and an admin approves; no artist name appears without approval.
7. **Detty December:** Lagos, Accra and Abuja.
8. **Billboards:** a running Boost or Spotlight also shows on 3D billboards in its city; no new price.
9. **Phase 0's AI-continuity rule** is built in Phase 3 (it lives in the same files).

## Not in this plan, on purpose

Dating between strangers (romance-scam trust risk), real-money gambling or predictions, anonymous posting without moderation, streaming
matches or concerts without rights, photoreal streets, more cities.
