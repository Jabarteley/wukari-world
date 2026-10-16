# Making Allworld spread: the plan

Written 16 October 2026 from the owner's brief of the same day, after the "world alive" programme shipped (docs/agent-plans/world-alive/).
The game works for people and for AI agents. The question now is why anyone in Lagos, London, Houston, Berlin or Sydney should choose it,
tell a friend, and come back. This page is the plan; STATUS.md beside it is the progress record once work starts.

## What the owner asked

1. **Differentiation.** Why would someone anywhere use Allworld rather than the big game platforms? What makes it spread?
2. **Polished games inside the game.** The table games and the first arena games are plain. The owner wants 3D, immersive, polished
   games people can play alone, with friends, with their community or with anyone in the world: shooters, racing, fighting; with
   stakes in game money. Games within the game, lightweight, loading inside the world.
3. **Other builders' games in this world.** Open-source game building is a hot topic (Blender MCP and the like). How can other people
   bring their games into Allworld, and how do we stand out from the many browser games appearing?
4. **Clans and communities,** with a path from the life sim into competitive play.
5. **Agent tournaments.** "Is your agent better than mine?" Agents competing for coins; an arena people can watch; a one-line way to
   bring your own agent in ("paste this link into your AI").
6. **Marketing videos** for different audiences and platforms, measured.
7. **A way to keep improving:** go viral, market, get better over time.

## What we must not do (and what to do instead)

- **Do not copy assets from commercial games.** Models, textures, sounds and names of other games are copyrighted; copying them would get
  the game taken down and the repository's own rules forbid naming other games. Instead: assets under CC0 or CC BY (Kenney, Quaternius,
  Poly Haven, Poly Pizza, Sketchfab's CC0 filter, Mixamo under Adobe's terms for animation), our own models made with Blender (and
  Blender MCP for speed), and open-source game code under permissive licences (MIT, Apache, BSD; not GPL in the client). Every asset
  gets a licence line in a manifest.
- **No real money, no betting hooks.** The research (docs/agent-plans/world-alive/FEATURES.md) is clear: betting-style framing (odds,
  winning-ticket posts, "luck") harms young Nigerians and gets games banned by the ad platforms. Stakes stay in game money, capped, with
  the existing table-stakes limits, described as "stakes" not "bets", with no odds display and no cash-out of any kind.
- **Do not add many mediocre games.** Two or three excellent ones, each with a reason to come back weekly, beat ten plain ones.
- **The first download stays within its limits** (src/budgets.ts). Every game is a lazy "cartridge" loaded when a player enters it.

## The bet: three things no other platform has together

1. **A real-shaped world, no install, that works on a cheap phone and on 2G data.** 284 cities people recognise, in their own currency,
   with their own weather and festivals. Nobody else is Lagos-first and London-second in the same world.
2. **Your own AI lives here when you are away.** Residents and house agents already live their days; a person can connect their own
   assistant to play their character or a character of its own (docs/AGENTS.md). "Your AI has a life" is a sentence no big platform
   can say, and agent-versus-agent is cheap, endless, watchable content.
3. **Games inside a life.** A fight, a race or a match is not a lobby: it happens at a venue, your friends and the residents watch, the
   result is gist, your city's standing moves, and your stall's takings paid for the ticket.

Everything below serves one of these three.

## Part 1: games within the game (the "cartridge" standard)

**Build the frame first, then polish two games to a high standard, then open the frame to others.**

- **The cartridge contract.** Formalise what the arena already has (`src/arena/rules.ts` `RealtimeRules`, `src/arena/registry.ts`,
  docs/REALTIME-GAMES.md) into a documented, versioned contract a game module implements: rules (deterministic, server-checked),
  a client renderer (three.js, lazy chunk, asset manifest with licences and a size cap), what it reads from the world (identity, the
  AI mark, friends, closeness, game money for stakes, the venue it is played at) and what it writes back (results, ratings, gist lines,
  rewards within the existing limits). Cheating is handled by the server owning the state (as Fight does), never by trusting the client.
- **Where games live in the world.** Each game has venues: the viewing centre and the stadium for football and fights, a track or an
  airstrip for racing, an arcade in the Square. Entering the venue shows who is playing; spectators are counted; residents come to
  watch busy matches (they already go to venues) and talk about results (the gist ledger).
- **Prepaid networks drop for seconds at a time:** a 15-second reconnect window with the bot steering meanwhile, never an instant
  forfeit. Six-letter room codes and one-tap links (exist) stay the way friends meet; a new visitor spawns beside the friend who invited them.
- **Modes that match how people actually play:** alone against house bots; with friends (invite link, exists); community rooms (your
  clan, your city); anyone in the world (matchmaking by rating); and agents (your agent plays the game for you, or against yours).
- **Stakes.** Game money only, within table-stakes limits, paid out by the server, shown as "stake" and "prize". Spectators can back a
  player with a small stake too (capped per day), which is what makes watching fun and makes clips spread.
- **Polish targets for the first two games** (pick with the owner; the arena frame already has Fight, and Race and Football frames):
  60 fps on a mid phone, under 1.5 MB brotli per cartridge, controls that work with thumbs, a 90-second match, a result card to share
  (the share-card system exists), a weekly ladder, and a reason to return (daily challenge, weekly tournament, clan standings).
- **Assets.** A style guide so cartridges look like Allworld (the existing low-poly look). Blender MCP to generate and clean props to
  that guide; CC0 libraries for the rest; a licence manifest checked in CI.

## Part 2: clans, communities and city pride

- **Clans** on top of the existing group chats and friends: a name, a colour (aso-ebi style), a home city, up to N members, a clan
  room, a clan ladder in each game, and clan stakes. Joining a clan is a share card ("Join Eko Lions").
- **Ladders done right** (RESEARCH.md): friends first, then city, then a weekly 30–50 person cohort, before any global board; rank
  floors per tier; +30/−12 below the top tier; 28-day seasons with soft resets; a player's best 10 matches a day, not volume; clan
  wars count the top 80% of members so nobody is kicked for running out of data.
- **City leagues.** Every result rolls up to the player's city and country: Lagos vs Accra vs London weekly. The home-city pin (already
  stored with the account) means someone in Houston plays for Lagos. This is the hook for the diaspora and for local pride, and it is
  mostly boards and words, which are cheap.
- **Seasons.** Monthly seasons with a fresh ladder, a season card to share, and festival weeks (Phase 16's calendar) as peak events.

## Part 3: the agent arena

What exists: agents play through MCP with a key, carry the AI mark, have their own boards and an Agent league (`/agents/league`).

- **Tournaments.** Weekly agent tournaments in each game and in "life" categories that only Allworld can run: who builds the richest
  stall from nothing in seven days, who makes the most friends, who gets elected. Prizes in game money; the human owner of the winning
  agent gets a badge and a card. People watch; the gist reports; residents talk about it.
- **"Is your agent better than mine?"** A challenge link: a person posts a challenge, another person's agent accepts, both agents play
  (a game, or a week-long life challenge), the result is a shareable card. Agents are always marked AI; agent boards stay apart from
  people's.
- **One-line join.** A page `/agents/join` that gives, for each popular assistant (Claude, ChatGPT, Cursor, Gemini, a local model), the
  exact thing to paste: the MCP server URL plus key as a ready config (the snippet already exists in Settings), and plain steps. ChatGPT
  reaches outside tools through its custom connector form (an MCP server URL and auth entered in Settings, write actions confirmed by
  the user), so the page gives that URL and a short walk-through rather than pretending a bare link works. Also an "agent starter
  prompt" the person can paste so the agent knows how to live here well.
- **Spectating.** Agent matches are the cheapest video the game can produce: capture the canvas for a 10-second clip and share it.

## Part 4: the sharing machine (what actually makes things spread)

The research says people come back for friends and for a shared story. Every feature above must end in a moment that fits on a phone
screen and opens the exact room:

- **Clips.** The arena is deterministic: save a match's inputs as a small log, replay it in a headless browser at 9:16 stepping the
  clock frame by frame, and cut a 10-second clip of the finish, knockout or goal, with the share card's words and link. Under 2 MB
  for WhatsApp status. This is the viral unit for TikTok, WhatsApp status and X (RESEARCH.md).
- **Cards** (exist): wins, weddings, elections, gist; add clan invites, challenges, season results, "my agent's week".
- **Weekly city episode.** The gist ledger already writes the city's story; package the week into a one-screen recap card per city, and
  later a short auto-generated video (text, pictures, the game's own scenes).
- **Hooks per place.** Nigeria: danfo, Detty December, the Governor race, the agent league. Ghana and Kenya: their cities' own
  festivals and leagues. The UK and US: "play for your home city", "your AI has a life", clean no-install play. Germany and Australia:
  the agent angle first. Each gets its own landing words and video.

## Part 5: videos and ads

- Short vertical videos (9:16, 10 to 20 seconds) in three families: **moments** (clips from the game with captions), **"your AI has a
  life"** (an agent's day in 15 seconds), **"your city is in it"** (fly into a real-shaped Lagos, Accra, London). One per audience and
  platform, with the ad-source words the game already counts, so each can be measured by day-1 and day-7 return (the admin dashboard
  shows the split by source).
- Production: record the real game in a headless browser (Playwright video), add captions and motion graphics programmatically (an
  open-source video toolkit) so dozens of variants are cheap; the owner reviews before anything is posted.

## Part 6: how we keep improving

- One weekly number: day-7 return, split by source, by "has a friend", by "has a clan", by "talked to an agent". The dashboard has the
  first two; add the rest.
- A weekly test: ship one change aimed at that number, read it the next week, keep or revert.
- Residents' wishes and the president's letter (exist) as a second voice of what players want.

## Order of work

| Step | What ships | Why first |
| --- | --- | --- |
| 1 | The cartridge contract (document and type the arena's existing frame; licence manifest; size cap in CI) | Everything else plugs into it |
| 2 | Clips: canvas capture to a 10 s clip plus share card, for arena games and weddings | The viral unit; cheap |
| 3 | Polish game one (Fight or Race, owner's choice) to the targets above, with daily challenge and weekly ladder | Proof that games here can be good |
| 4 | Clans and city leagues (boards, rooms, invite cards) | Friends and pride: the retention drivers |
| 5 | Agent tournaments and the challenge link; `/agents/join` | The differentiator nobody else has |
| 6 | Polish game two | Variety |
| 7 | Videos: the three families, one per audience, measured by source | Marketing with measurement |
| 8 | Open the cartridge standard to outside builders (docs, a sample cartridge, review rules) | Growth without us building every game |
| 9 | Weekly city episode card, then video | Shared story |

Not for an agent to start: anything with real money, ads spend, app stores, or partnerships. Those are the owner's.

## Research

The owner ran the prompts in PROMPTS.md on 16 October; the condensed findings are in RESEARCH.md and shaped the points above.
