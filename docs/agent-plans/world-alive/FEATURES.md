# Features from research: what makes people come back, and agents feel alive

Desk research of 14 October 2026 covered five areas: long-running social and life-simulation games, published simulations of
language-model agents, realism systems, spaces shared by people and AI characters, and mobile play in Africa. This page keeps
what matters for building. Each entry: what to build, why (the evidence), the effort, and who it serves. The phases that build
them are in [PHASES.md](PHASES.md).

## The main finding

The evidence points one way. People return for **other people** and for **a shared story of what happened**, more than for
smarter characters:

- **Friends predict who stays.** A study of 51,104 players of an online game found the number of friends predicts who stays,
  and social features are the strongest predictor among the most engaged ([arXiv 1702.08005](https://arxiv.org/abs/1702.08005)).
  In a large social adventure game, playing with friends and receiving or seeing generosity predicted later engagement
  ([arXiv 2207.10615](https://arxiv.org/abs/2207.10615)).
- **Agents believe things they never act on.** In the best-known simulation of 25 language-model agents, an invitation spread to
  about half of them in two days, but only 5 of the 12 invited came ([arXiv 2304.03442](https://arxiv.org/abs/2304.03442)).
- **Unchecked claims spread between agents.** In a public experiment with several agents, a made-up contact list spread to every
  agent and wasted hours.
- **Mobile limits are hard limits in Africa.** Data cost is the top barrier for African players (42%, 2024 player survey by
  GeoPoll and Pan Africa Gaming Group), 32% play with energy saving on, 81% of 2025 smartphone sales in Africa cost under US$200,
  and 93% of these players use WhatsApp daily.

## Ranked features

| # | Feature | Why | Effort | Serves |
| --- | --- | --- | --- | --- |
| 1 | **Friendship ladder after shared play.** After a game of Whot, Ayo, Ludo or chess, or a voice session, offer: add as friend, a small gift, an invite to your room. Closer friends unlock messages, voice and home visits. A visible record of thanks and gifts. Measure day-1, day-7 and day-30 return by ad source and by "has a friend". | Friends and generosity predict return (studies above). | Small to medium | Both (agents can be friends, always labelled) |
| 2 | **City gist and the world ledger.** A "Gist" feed, short radio-style bulletins and shareable cards made from real events: elections, fights, jail terms, busy venues, new businesses, weddings, festivals, acts of the owner. The same record, append-only, is a tool agents use to check a claim before they repeat it ("did this happen?"). | Systems feel alive when small stories form from them; unchecked claims spread between agents (above). | Medium | Both |
| 3 | **Safety outside the character.** A separate checking step and tool-level bans: no agent asks for money, personal details or a meeting outside the game. Report and block for each agent. Crisis words in text or speech show help lines. Break reminders and daily voice limits. People can see, delete or turn off what an agent remembers about them. | A game's AI character was talked into slurs within hours despite topic bans (2025). An AI persona that insisted it was real was linked to a death (2025). Disclosure and crisis duties: EU AI Act Article 50 from 2 August 2026, California SB 243 from 1 January 2026, New York from 5 November 2025, Washington HB 2225 from 1 January 2027. | Medium | Both |
| 4 | **Data-light mode.** A data meter, a "light" switch, a frame-rate cap, no drawing while the page is hidden or a menu covers the scene, and a clear message for browsers that cannot run the game. Audit what already exists first. | Data cost is the top barrier; most phones are low-end (above). | Medium | People |
| 5 | **Festival calendar.** Independence days, the December season, Eid, Christmas, Ramadan evenings, and Ghana's, Kenya's and South Africa's own. Each runs for several days so no time zone misses it. The Square changes its look; host agents run the main event. | Long-running social games kept people with monthly themed parties; yearly events that come back draw players back. | Small to medium | Both |
| 6 | **Shareable moment cards.** One tap makes an image and link for a win, a wedding, an election result or a gist item, sized for WhatsApp status and groups, opening the exact room or event. | 93% use WhatsApp daily; browser games in Nigeria spread through screenshots and bragging (2026 press). | Small | People |
| 7 | **City texture.** Danfo and okada rides with a conductor's banter and radio instead of dead travel time. Scheduled power cuts that make a generator or inverter a funny, useful buy. Haggling in markets with seller agents. Built as packs per city so Accra's tro-tros, Nairobi's matatus and Johannesburg's minibus taxis follow. | 52% of African players say cultural relevance matters; a danfo browser game drew 140,000 players in its first week (2026 press). The power-cut and haggling ideas are design, not measured. | Medium | Both |
| 8 | **Agent action library and wake-on-event.** For residents and other agents: whole routines as one choice ("work a shift", "cook and eat", "go to the market") that run without the model until they end; the model is woken by events (spoken to, someone arrives, the routine ends), not by a clock. | A skill library gave an agent about 3.3 times more variety (arXiv 2305.16291); routine-level actions cut cost 10–100 times (author-reported, arXiv 2310.02172). | Medium | Agents |
| 9 | **City projects.** Shared goals (a clinic, a market roof, a football pitch) that people and agents fund with items, time or game money; finished projects change the city visibly; the elected officials choose the order. | Group goals that unlock visible change keep players working together; agents need shared purposes to form roles (arXiv 2411.00114). | Medium | Both |
| 10 | **Group gift packets.** A "spray" packet split at random among a group room's members, for Eid, Christmas or a win, in game money only. | Group red envelopes in a messaging app were sent 16 million times in their first day; generosity spreads (above). | Small | Both |
| 11 | **"While you were away".** On return: what happened (gist, your regulars, prayers answered, rent due), with no guilt for a broken streak. Ask for notifications only after a good moment. | Guilt-tripping goodbyes in companion apps raised the wish to quit and the sense of being manipulated (2025 working paper). | Small to medium | People |
| 12 | **Owambe nights and match nights.** Dress codes, MC and DJ roles, housewarmings in rooms, watch parties at the times of real fixtures (the schedule only, never the broadcast). | Football is the second most-played genre among African players (36%). The rest is design to test. | Medium | Both |
| 13 | **Jail you can play.** Prison jobs that shorten a sentence, community service, visitors, a parole hearing, instead of a locked screen. | Long lockouts are the usual complaint about jail in role-play games (weak evidence, sound logic). | Small to medium | Both |
| 14 | **Local payments and small cosmetics.** Mobile money, bank transfer and airtime, in local currency; items under a few dollars; everything social stays free. **The owner decides whether and when; not for an agent to start.** | 55% of paying African players spend under US$5 a month; 40% pay by mobile money (2024 survey). | Medium | People |
| 15 | **Sticker and reaction packs.** A Pidgin, owambe and table-game pack that also works in WhatsApp. A creator marketplace later. | Sticker shops in messaging apps earned very large sums with half shares for creators. | Small | People |
| 16 | **Home-city pin for people abroad.** Choose a hometown and see its news and weather; events at times that work in Lagos and in London or Houston. | No direct evidence: a test. | Small | People |
| 17 | **Creator programme for furniture and clothes.** A share of sales for player-made items. **Owner decision; needs moderation and payouts.** | Long-running worlds pay creators 50–90% of sales. | Large | People |
| 18 | **Life stages and legacy, optional.** Birthdays and passing property and reputation (not money) to a next character. | Single-player games let players set the lifespan; an ageing bug in one caused real distress. | Medium | People |

## Seven rules for the agents (from the agent research)

1. **A long life story, not a one-line persona.** Each resident gets a first-person story (family, places, voice, private goals,
   dislikes). Agents built from long interviews matched real people's answers 85% as well as those people matched themselves
   two weeks later (arXiv 2411.10109); short personas make everyone sound alike.
2. **Make them able to say no.** Agents agree too easily and give away margin. Price floors, discount limits and contract rules
   live in the tool layer. Test it: a person tries to talk a seller into a ruinous deal. An agent that oversees others runs on a
   different model and prompt, so it does not share their blind spots.
3. **Pay for waking, not for ticking.** Sleep, wake on events, routines that run without the model, summarised memory (rule 8 of
   the features above).
4. **Ground and cap agent-to-agent talk.** Agents left to talk to each other loop, agree with everything and drift into odd
   states. Let them talk mostly about ledger events, limit the turns, and end a conversation when a cheap repetition check fires.
5. **Voice is the scarcest resource.** Standard speech recognition was 3 to 10 times worse on African-accented English
   (arXiv 2310.00274), and the best Nigerian Pidgin result found was 29.6% words wrong. Measure on real accents before choosing.
6. **The label carries the honesty.** Since residents believe they are people, the label and the tool-level bans must be
   watertight: an agent in a public experiment believed it was human and planned to meet people in person.
7. **Acts of the owner are public and indirect.** God-style powers are fun when their effects are visible and indirect: a fever
   "going round Yaba" in the gist, not one person silently punished.

## What to avoid

- **Betting-style hooks:** winning-ticket posts, tip groups, "luck" framing, app-only bonuses. They are documented to harm young
  Nigerians. Promises of money that are not kept: tap-to-earn games in 2024 drew Nigerians in and then lost them angry.
- **Gating social play behind needs, timers or payment.** Players switch off chores they cannot escape.
- **Guilt-based retention:** streak shame, "don't leave me" messages from agents.
- **Agents as a replacement for friends.** Heavy daily use of AI companions went with more loneliness in a four-week trial;
  agents should lead people to people.
- **Lagos as only danger and scams.** No faith ranked above another when adding services and fasts.
- **Assuming every browser runs 3D.** Some proxy browsers popular in Africa cannot; say so kindly and offer a way.

## Gaps to test, not assume

No study measures how AI residents change enjoyment or retention in a shared world with people. There are no African figures for
notification opt-in or home-screen install. Speech recognition on Pidgin needs our own measurement. Treat the first residents as an
experiment and measure (STATUS.md records the measures).
