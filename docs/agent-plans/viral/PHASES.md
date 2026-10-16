# Phases

One phase at a time, in this order unless STATUS.md records a reason to change it. Each phase ends live on joinallworld.com
(README.md, "How to release") with STATUS.md updated. A phase too big for one release is split; unfinished parts stay behind a
setting that is off by default. Every phase: start from the code, not this page (`git grep` first: paths were right on 16 October
2026 and the code moves); tests come with the change; stored data gains optional fields only; player-facing words short and plain;
the first download stays within its limits; check on a phone-sized screen; write or update a doc in `docs/` and link it from
`docs/REFERENCE.md`.

**Four phases were started on 16 October 2026 and stopped mid-way when the session ended** (STATUS.md says where each stopped and
what is on its branch). Phases 1, 2, 3 and A below continue those branches: read the branch's commits first, keep what is sound,
finish it, and do not start over.

---

## Phase 0: baseline

- Clone, install, generate the city and word assets, typecheck. Record in STATUS.md the commit, the live build, and the state of the
  four stopped branches (`git log origin/main..origin/claude/viral-cartridge` etc.).
- **Done when:** STATUS.md has the baseline, pushed.

## Phase 1: the cartridge standard, replays, reconnect and clips

Continues `claude/viral-cartridge`. PLAN.md Part 1 and Part 4; RESEARCH.md (clips, reconnect, budgets); docs/REALTIME-GAMES.md.
- **Where:** `src/arena/` (rules modules `fight.ts`, `race.ts`, `football.ts`; `RealtimeRules`, `registry.ts`, `client.ts`), the room
  host `server/growth/arena.ts`, the Games app `src/app/features/arena/` and `games/`, share cards `server/growth/share.ts` and
  `src/app/features/growth/shareMoment.ts`. On the branch already: `src/arena/cartridge.ts` (typed contract v1), `cartridges.ts`
  (registry for the three games), conformance tests, `scripts/cartridge-check.ts` (manifest and size checker wired into CI),
  `server/growth/arena-replays.ts` (replay log recorder), `src/arena/replay.ts`, `replay-frames.ts`, `replay-view.ts`, a replay route
  in `server/routes/arena.ts`, and an unfinished change to `server/growth/arena.ts`.
- **Build:**
  - The contract, versioned and documented (`docs/CARTRIDGES.md`): deterministic server-owned rules; a lazy client renderer; an asset
    manifest (every file with source, licence, attribution text for CC BY, bytes; a cap per cartridge, default 1.5 MB brotli); what a
    cartridge reads from the world (public identity with the AI mark, friends, closeness, a game-money stake within the table-stakes
    limits, the venue, the city) and writes back (results and ratings; gist lines through `gistService(ctx).add`; rewards within the
    existing limits); a registry entry (id, name, venues, modes: alone vs bots, friends by code or link, matchmaking by rating,
    agents). The three games conform without changing how they play.
  - The manifest and size check runs in the CI job that builds, beside `size:download`.
  - Replay logs: each finished match's inputs per tick per seat, compact, the last N per game kept and expiring; `GET
    /api/arena/replay/:id` public for finished matches (public names and the AI mark only); a client replay mode running the same
    rules. Test: replaying a recorded fight reproduces its snapshots exactly.
  - Reconnect: 15 seconds, the seat's bot steering meanwhile (not idle), the returning player takes back control; never an instant
    forfeit.
  - Clips: a `?replay=<id>&aspect=9x16&frame=` hook so a headless browser can step the clock 16.67 ms per frame; `scripts/clip.ts`
    assembles frames into a 10-second MP4 of the finish (1080×1920) and a 720×1280 version under 2 MB, through FFmpeg. If the machine
    cannot run a browser, unit-test the pieces (frame stepping, frame selection, FFmpeg command) and write the run guide; CI may run
    it later.
  - A "Share clip" button on the result screen that shares the clip with the share card's words when one exists, else the card.
- **Done when:** the three games pass the conformance tests; the checker runs in CI and fails on a missing licence or an oversized
  cartridge; a replay reproduces a match; a dropped player has 15 seconds; a clip can be produced from a replay (at least in CI);
  live.

## Phase 2: clans, ladders and city leagues

Continues `claude/viral-clans`. PLAN.md Part 2; RESEARCH.md ("Clans, seasons and ladders"). On the branch already: pure rules in
`src/clans/` (clan, ladder, league, results, war) with tests, `server/clans/` (data, ladder, link, forget, service), a route module
`server/routes/clans.ts`, hooks in `server/growth/arena.ts` and `tables.ts`, erasure wiring, admin links: all unreviewed.
- **Where:** group chats and friends in `server/social/service.ts`; results from `server/growth/tables.ts` and `server/growth/arena.ts`;
  ratings; the home-city pin (`server/routes/stages.ts`); Phase 16's colour list (`src/festivals/`); share cards.
- **Build:**
  - Clans: name (text rules apply), colour, home city, up to 25 members (admin setting), leader and two deputies, join by invite link
    or six-letter code (a "Join <clan>" share card), leave, kick, a clan room (a group chat the clan owns). Minors may join; chat rules
    unchanged. Agents may be members and keep the AI mark.
  - Ladders from results the game already produces: weekly and seasonal (28 days, soft reset: drop one or two sub-tiers, never to
    zero), rank floors per tier, +30/−12 below the top tier then rating-based, a player's best 10 matches a day. Boards in this order:
    friends, my city, my weekly cohort (30–50 players by the hour of their first match of the week), clan, country, global. Payloads
    under 4 KB gzipped; 2D overlays.
  - City leagues: results roll up to the player's city and country (the home pin counts abroad); weekly standings per game and
    overall; a season card to share; a gist line for the week's winner.
  - Clan wars: weekly, matched by size and rating, scored on the top 80% of member scores; prizes in game money within existing
    limits; a result card.
- **Done when:** clans work end to end on a phone; ladder maths tested (floors, points, soft reset, best-10, cohorts); a city league
  week settles with a card and a gist line; a clan war settles; payload sizes tested; live.

## Phase 3: the agent arena

Continues `claude/viral-agent-arena`. PLAN.md Part 3; RESEARCH.md ("Agent arenas", "Connecting a user's own assistant");
docs/AGENTS.md (MCP keys, the AI mark, the Agent league at `/agents/league`, agent boards apart from people's). On the branch already:
`server/tournaments/` (book, life, matches, service), `server/agents/join.ts` with tests, the `/agents/join` page
(`src/app/features/agents/AgentJoin.vue`, `joinModel.ts`, `mcpbBundle.ts`, `joinEntry.ts`), Settings guides, and an unreviewed change
to `src/game/systems/growth.ts` and `src/types/actions.ts`.
- **Build:**
  - Weekly tournaments in two families: games (agents' keys play seats in the arena and table games; bracketed or round-robin by
    rating; server-owned state and timeouts) and life (richest stall from nothing in seven days, most friends made, most missions
    completed, elected to office: measured from the game's records, Monday 00:00 to Sunday Lagos time). Prizes in game money within
    limits to the agent's character; the human owner gets a badge and a card; standings on the Agent league page; a gist line for
    winners; anti-gaming rules (real distinct accounts; takings from people only), with what cannot be prevented written down.
  - The challenge link: a person makes a challenge (a game or a 7-day life category) and gets a card; another person's agent accepts
    through its key; both play; the result is a card with both names and the AI marks; limits per day.
  - `/agents/join`: for each assistant the exact thing to paste with the signed-in owner's own key (never shown to anyone else):
    Claude (connector steps; a downloadable `.mcpb` bundle if it can be made without new dependencies), ChatGPT (custom connector:
    MCP URL and auth; write actions confirmed by the user), Gemini CLI (`gemini mcp add <name> <url>` and the settings block), Cursor
    and VS Code (one-click deep links), plus a short, safe "agent starter prompt".
  - "Agents playing now" on the Agent league page with watch links to arena rooms as a spectator.
- **Done when:** a tournament settles on a fake clock with prizes within limits; a challenge runs end to end to a card; the join page
  renders each assistant's snippet from a fake key and never without a session; deep links are encoded correctly; live.

## Phase A (alongside 1–3): the asset pipeline

Continues `claude/viral-assets`. PLAN.md ("What we must not do"; Part 1 "Assets"); RESEARCH.md ("Code and assets we may build on").
On the branch already: `scripts/assets/` (fetch-pack, prepare, budget, credits, glb, zip, pack-types, wants), two Kenney packs under
`public/assets/packs/` with manifests and licences, `public/assets/CREDITS.txt` and `credits.json`: unreviewed.
- **Build:** fetch named packs (Kenney, Quaternius, KayKit, Poly Pizza CC0) keeping only wanted files, recording source URL, licence
  and bytes in a manifest; prepare (GLB with Draco or meshopt if the repo already uses one, metres, Y-up, triangle caps: 3,000 for
  characters, 1,500 for props and cars, WebP textures at 1K); want lists per game within 1.5 MB brotli each (fight: a ring or street
  arena and two rigged characters with punch, kick, block and hit; race: 4–6 cars with separate wheels, track pieces, barriers, a
  grandstand; football: pitch, goals, ball, four players); credits generated from all manifests and shown in Help; a style note
  (`docs/ASSET-PIPELINE.md`) on matching the Allworld low-poly look, and Blender MCP's honest role (automating cleanup and glTF
  export, not generating characters). Join the manifest format with Phase 1's checker.
- **Done when:** three want lists produce packs within budget with correct manifests; credits appear in Help; the checker accepts
  them; live (the packs load lazily with their games).

## Phase 4: polish Fight

The owner wants all three games polished; Fight first because it exists. PLAN.md Part 1 "Polish targets".
- **Build:** 60 fps on a mid phone (a 1024 shadow map at most, baked shadows, no dynamic lights beyond one), under 1.5 MB brotli,
  thumb controls, a 90-second match with a clear result, the Phase A ring and characters with Mixamo-style punch, kick, block and hit
  animations on a low-poly rig, sound effects (CC0), a daily challenge against bots, a weekly ladder (Phase 2), stakes (game money,
  the table-stakes limits), residents turning up to watch busy matches and talking about results in the gist, a result card and clip.
- **Done when:** the polish targets are measured and recorded in STATUS.md (frame time on a throttled profile, size), a tester's
  play-through is recorded, live.

## Phase 5: polish Race

- **Build on the Race frame:** raycast-vehicle physics (the MIT racer's approach), the Phase A cars and track pieces, a 90-second lap
  race with up to four seats (people, agents, bots), thumb steering with assists, a photo-finish clip, daily time-trial challenge,
  weekly ladder, stakes, residents watching, result card. Same targets as Phase 4.

## Phase 6: polish Football

- **Build on the Football frame:** a penalty duel first (the simplest great moment: goalkeeper dive, last-second save), then 5-a-side
  if the frame allows; the Phase A pitch and players; match nights (Phase 16) feeding the viewing centre; clan and city leagues using
  football results; clips of goals and saves; same targets.

## Phase 7: videos for Nigeria first

PLAN.md Part 5; RESEARCH.md ("Short video", "Programmatic video"). The owner approves every video before it is posted; posting is
the owner's.
- **Build:** the pipeline: pick a replay, render frames in a headless browser at 9:16, add word-by-word captions, city and currency
  words and the ad-source link with an MIT video toolkit (or FFmpeg with subtitle styling), output 1080×1920 MP4 for TikTok and a
  720×1280 under-2 MB MP4 for WhatsApp status styled like a friend's raw status. Three families: moments (fail, near-miss, finish in
  the first 1.5 seconds; 13–21 seconds), "your AI has a life" (an agent's day in 15 seconds), "your city is in it" (fly into Lagos).
  Each variant carries ad-source words the dashboard already counts (day-1 and day-7 return by source). Produce the first ten
  variants for Nigeria and put them in a folder for the owner, with a one-line note each.
- **Done when:** the pipeline runs in CI or on the owner's machine from one command; ten approved-for-review videos exist; the
  dashboard shows return by video source once the owner posts; recorded in STATUS.md.

## Phase 8: open the cartridge standard to outside builders (owner's decision to open)

- **Build:** `docs/CARTRIDGES.md` as a public guide; a sample cartridge repository layout; the review rules (licences, sizes,
  server-owned rules, the AI mark, no real money); a submission path (a pull request with the manifest; the checker gates it). The
  owner decides when to announce.

## Phase 9: the weekly city episode

- **Build:** from the gist ledger, a one-screen recap card per city each week (the week's top events, the league result, the
  president's line), shareable; later a short video through the Phase 7 pipeline.

## Phase 10: measure and iterate

- **Build:** the one weekly number (day-7 return) split by source, "has a friend", "has a clan", "talked to an agent" on the admin
  dashboard (the first two exist); a weekly note in STATUS.md: what shipped, what the number did, keep or revert.

## Not for an agent to start

Real money, ads spend, app stores, partnerships, announcing the standard publicly, posting videos. List them in STATUS.md if they
come up.
