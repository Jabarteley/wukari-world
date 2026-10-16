# Status

Read this first in every session; update it after every phase and whenever you stop. Newest entries at the top of each section.

## Now

- **Nothing is live from this programme yet.** The plan was agreed on 16 October 2026 and four phases were started the same day by
  subagents, which were stopped mid-way when their session ended. Their work is pushed, **unreviewed and not tested as a whole**, on
  the branches below; each ends with a "Work in progress" commit holding whatever was uncommitted. Continue them; do not start over.
- **Live site when this was written:** `main` at or after `c2419edb` (16 October), with every "world alive" phase live
  (docs/agent-plans/world-alive/STATUS.md).
- **Phase 1 is live (16 October 2026, `1841c909`):** the cartridge contract and checker, replays, the 15-second reconnect, the
  replay page, clips, real game controllers, and stakes with spectator backing. **Phase 2 is live (`01409bc9`):** clans, ladders,
  city leagues, clan wars, the clan venue room. **Phase 3 is live (`ee203d15`):** agent cups, the challenge link, /agents/join.
  **Next:** release Phase A (its subagent is finishing), then Phase 4 (Fight in 3D, built on `claude/viral-fight`: rigged fighters,
  ring at the rules' scale, camera, daily challenge, gist lines; measured 19 draw calls, about 8,500 triangles, 1.3 ms of script a
  frame at 4x CPU throttle, 386 KB brotli). In flight: 6-character build hashes (`claude/viral-build-names`, the startup-noise fix
  the owner approved) and the MCP OAuth sign-in (`claude/viral-mcp-oauth`). Implementation now goes to Sonnet/Haiku subagents; the
  coordinator decides, reviews and releases (the owner's request). Phase A (`claude/viral-assets`) and Phase 3 (`claude/viral-agent-arena`) are being
  finished by subagents in their own worktrees; each is reviewed and released in phase order.

## Baseline (Phase 0, 16 October 2026)

- `main` at `228443371` (merges the native-character work of another agent, which was mid-release at the time); `npm ci`,
  `cities:assets` (284 cities), `words:assets` and `npm run typecheck` are clean on it (Node 24.22, 5 projects, 0 errors).
- Live build: `joinallworld-c2419edbd4edac17602aa9199ce` (`c2419edb`, contained in `main`). Another agent's release run of the
  native characters was in progress on `main`; our releases go on top of whatever it lands.
- Work machine: an 8 GB Mac. Clone kept outside the iCloud-synced Desktop (`git` hangs there). Builds, full tests and the size
  checks go through CI. FFmpeg 9 and Playwright 1.64 are installed, so clips can be rendered locally as well as in CI.
- **Blender 5.2.2 LTS is installed** (`/Applications/Blender.app`, `--background --python` works), so "our own" assets can be made
  from committed scripts (PHASES.md, "Making our own assets with Blender").
- The four stopped branches each sit on `517ef3a46` and are 13+ commits behind `main`: `claude/viral-cartridge` 3 commits
  (20 files, +1,128), `claude/viral-clans` 2 (21 files, +1,026), `claude/viral-agent-arena` 3 (20 files, +1,486),
  `claude/viral-assets` 1 (49 files, +2,033). Each is reviewed as its phase starts (Phases below).

## Where the stopped branches are (16 October 2026)

| Branch | Phase | Commits past `main` | What is there | Known gaps |
| --- | --- | --- | --- | --- |
| `claude/viral-cartridge` | 1 | 3 | Contract v1 (`src/arena/cartridge.ts`, `cartridges.ts`, conformance tests), `scripts/cartridge-check.ts` wired into `.github/workflows/ci.yml`, replay recorder (`server/growth/arena-replays.ts`), replay runner and frame arithmetic (`src/arena/replay*.ts`), a replay route (`server/routes/arena.ts`, registry and protocol updated), `scripts/clip.test.ts`. | The 15-second reconnect with the bot steering, the client `?replay=` stepping hook, `scripts/clip.ts` itself, the Share clip button, `docs/CARTRIDGES.md`; the last change to `server/growth/arena.ts` is unfinished. |
| `claude/viral-clans` | 2 | 2 | Pure rules with tests in `src/clans/` (clan, ladder, league, results, war); `server/clans/` (data, ladder, link, forget, service); `server/routes/clans.ts`; hooks in `server/growth/arena.ts` and `tables.ts`; erasure and admin links. | Client UI (clan screens, boards, join card), the clan room, settings, city-league settlement and cards, docs/CLANS.md; nothing checked against a real server yet. |
| `claude/viral-agent-arena` | 3 | 3 | `server/tournaments/` (book, life, matches, service); `server/agents/join.ts` with tests; `/agents/join` page (`AgentJoin.vue`, `joinModel.ts`, `mcpbBundle.ts`, `joinEntry.ts`), Settings guides. | Tournament routes and settlement on the heartbeat, the challenge link, "agents playing now", the Agent league page changes, docs/AGENT-ARENA.md; the changes to `src/game/systems/growth.ts` and `src/types/actions.ts` need review (startup size). |
| `claude/viral-assets` | A | 1 | `scripts/assets/` (fetch-pack, prepare, budget, credits, glb, zip, pack-types, wants); packs `kenney-racing-kit` and `kenney-blocky-characters` with manifests and licences (about 400 KB); `public/assets/CREDITS.txt`, `credits.json`. | Quaternius/KayKit fetching, the fight and football want lists, the prepare step's caps, credits in Help, docs/ASSET-PIPELINE.md, joining the manifest format with the cartridge checker. |

Review each branch before building on it: typecheck, run its tests, read its diff, and keep only what is sound.

## Phases

| Phase | State | Live commit | Notes |
| --- | --- | --- | --- |
| 0 Baseline | done | `228443371` (main) | nothing to release; live was `c2419edb` |
| 1 Cartridge standard, replays, reconnect, clips | live | `1841c909` | see "Phase 1" below; real-pad check open |
| 2 Clans, ladders, city leagues | live | `01409bc9` | see "Phase 2" |
| 3 Agent arena | live | `ee203d15` | see "Phase 3" |
| A Asset pipeline | live | `c254d4327` | packs for all three games, credits in Help, Blender scripts |
| 4 Polish Fight | live (3D, realistic fighters) | `f0f38db3` | see "Phase 4" |
| 5 Polish Race | live (3D) | `f87981e1` | realistic cars later; see "Phase 5" |
| 6 Polish Football | live (6a); 6b realistic footballers on `claude/viral-football-real` | | 3D, penalty shoot-out, `rev` 2; see "Phase 6" and "Phase 6b" |
| 7 Videos (Nigeria first) | skipped | | the owner's decision, 16 October 2026 |
| 8 Open the standard | not started | | owner decides when |
| 9 Weekly city episode | not started | | |
| 10 Measure and iterate | not started | | |

## Phase 1 (16 October 2026)

**Live at `45723a6e`** (release run 38852370809; CI 38851333064; live smoke PASS; checked on joinallworld.com at 390x844):
- **Cartridge contract v1** (`src/arena/cartridge.ts`, registry `cartridges.ts`, guide `docs/CARTRIDGES.md`); the three games
  conform unchanged. `npm run cartridge:check` runs in CI after the build: fight 20.8 KB, race 25.5 KB, football 24.5 KB brotli
  against a 1.5 MB cap each; it fails on a missing licence, a CC BY line missing from NOTICE.md, or an oversized cartridge.
- **Replays**: each finished match's inputs (2-6 KB) kept for 7 days, 30 per game, in a bounded collection `arenareplays`
  (erased with a player); `GET /api/arena/replay/:id`; replays of all three games reproduce their snapshots exactly (tests).
- **Reconnect**: a dropped seat is steered by its bot for 15 seconds, then forfeits; the person takes it back on return.
- **Replay page** `/replay?replay=<id>` (its own small entry, nothing in the first download) with caption bands and the AI mark,
  and a stepping mode (`&frame=N`) for clips.
- **Clips**: "Make a clip" on every result card records the last ten seconds on the phone (MP4 or WebM, about 1.5 MB) and shares
  it with the words and replay link; checked on the live site. `npm run clip -- --replay <id>` renders 1080x1920 and a
  720x1280 copy held under 2 MB (needs FFmpeg and playwright-core; measured locally: 8 s per clip, 0.6-1.5 MB small copies).
- **Game controllers** (`src/arena/input/`): standard mapping, dead zone, d-pad, remap panel (the Controller button or Start),
  rumble, "Controller connected"; a pad sends exactly the touch input. Checked in a browser with a simulated pad (walk, punch,
  rumble, panel). **Not yet checked on a real pad over Bluetooth on Android Chrome**: this machine has none attached.

**Live at `1841c909` (1c, release run 38856598829, CI 38855730828, live smoke PASS):** stakes in game naira for two people in a room (the host picks one of
the table stakes; never with a computer seat) and spectator backing (₦100 or ₦500 on a seat, once a match, open until ten seconds
in; the winner's backers share the prize; a draw or a one-sided pot refunds), through the table stakes' life action, gift rule,
18+ rule and shared day limits; a pot record `arenapots` paid exactly once; refunded when a room closes or after a restart; an
erasure waits for it. Five tests against a real server pass.

**Finding for the owner (not blocking):** the startup download's brotli size moves by up to about 200 bytes with ANY change to a
lazy chunk, because the startup files list the 8-hex-digit hashes of lazy chunks (the city chunks among them) and random hex
compresses differently each time. On `main` the margin was 121 bytes. Phase 1 kept startup's own modules byte for byte (a second
build entry had reordered the engine chunk; it now enters through one dynamic import), but the remaining margin is hash noise:
expect any agent's release to fail STARTUP_BROTLI by chance now and then. A fix that does not raise the limit (for example shorter
hashes, or moving the city chunk hash list out of the engine chunk) is a shared decision, so it is listed under questions.

## Phase 2 (16 October 2026)

**Live at `01409bc9`** (release 38863942924, CI 38862832625, live smoke PASS, the Clans screen checked on the live site at 390x844).
The first release attempt (`d8b14c8d`) was refused by the package guard: the Worker bundle passed its 3,500,000-byte limit
(3,516,320). Fixed by building the Worker with minified local names (`scripts/package-joinallworld.mjs`; the edge tests build it the
same way): 2,758,057 bytes, Worker import 106 ms under Miniflare, local Worker smoke PASS. No limit was raised. Small follow-up:
the league tab shows the raw week number ("Week 2963"); it will say "This week".

Built on `claude/viral-clans` (the earlier agent's rules and server kept after review; finished and tested): clans of 25 (admin
setting) with leader, two deputies, six-letter codes and the invite link `/?table=clan-<code>` (kept across the quick start; link
preview "Join my clan on Allworld"), kick with a day's ban, the clan chat (a group the clan owns), and **the clan's venue room**
(10 or more people; members are seated together in one of the venue's groups, which shows the clan's name and colour; the venue
stays open). Ladders (+30/-12, floors, best 10 a day, three games a pair a day, 28-day seasons with a soft reset, weekly groups),
boards in the order friends, city, weekly group, clan, country, everyone (under 4 KB gzipped, tested), city leagues by the
home-city pin with the winner in the gist, and weekly clan wars on the top 80% with a prize claimed once. The Clans screen is a
section of the Games app (lazy). Review found and fixed: a clan war always settled as a draw (points read after they were
removed), a test-clock gap in the league, and an untyped route module. Tests: 5 against a real server plus the pure ones. Checked
in a 390x844 browser: start, share, open the invite as a new player, preview, join, ladders.

## Phase 4 (16 October 2026)

**4a live at `40e1e614`** (release 38890948167, CI green, smoke PASS; a practice fight checked on the live site at 390x844 and
844x390, the versioned models loading, no page errors). Fight is drawn in 3D: two CC0 KayKit fighters whose punch, kick, block, hit,
knock-down and cheer clips are timed to the server's moves; our own Blender ring at the rules' scale (1.8 m fighters, a 16.5 m ring);
a dark hall; a camera framing the pair clear of the HUD and the thumbs in portrait and landscape (re-framed on rotate), shaking on
hits and turning round a knock-out; sparks; the 2D view as the fallback. The renderer lowers its resolution when frames run slow and
earns it back at a steady 60 Hz; the 3D pieces are fetched when the Games app opens or the phone is idle (not on Save-Data or 2G),
and every model link carries a content version so updates reach players despite the year-long cache. A daily challenge against the
computer with a streak; matches between people become a gist line in the winner's city. Measured (headless Chromium, software GL:
frame times are not a phone's): 19 draw calls, about 8,500 triangles, 1.3-1.6 ms of script a frame at 4x CPU throttle; the cartridge
388 KB brotli of 1.5 MB. **4b, next:** realistic fighters (the players' own characters with fight clips we make in Blender for their
skeleton, as the KayKit fighters are stylised), the hall lamps showing behind the portrait top bar, the pair a little off centre in
portrait, clips rendered from the 3D view. Not verified: a real phone's frame rate, a real Bluetooth pad.

## Phase 4b (16 October 2026, branch `claude/viral-fight-real`)

Fight draws each person as their own native character (the world's CC0 MakeHuman body, hair, outfit and shoes) animated with fight
clips made here in Blender from `scripts/assets/blender/native-fight-clips.py` (jab, cross, rear-leg kick, block, block-hit, two hit
reactions, knock-down, cheer, guard idle, shuffling walks; solved per frame with two-bone limb solvers, nothing captured or copied). A
seat carries an optional `nat` (short public native look, validated by the server); the computer and seats without one get a varied
default look from their name. A phone with under 3 GB memory or under 4 cores, WebGL 1, or a native load that takes over 8 s from when
the seats are known uses the KayKit fighters as before. The hall lamps are hidden in portrait. Details in the branch's final report.

## Phase 3 (16 October 2026)

**Live at `ee203d15`** (release 38868544013, CI 38867051851, live smoke PASS; /agents/join and /agents/league answer). Finished by a
subagent on `claude/viral-agent-arena` from the earlier agent's work, reviewed before release. Weekly agent cups in games (agents'
keys play arena and table seats, knockout or round robin by rating, server-owned clocks) and in life (richest stall from takings
by people only, most friends, most missions, office), Monday to Sunday Lagos time, settled on the heartbeat; prizes through the
server-only bonus line (₦2,000 / ₦1,000 / ₦500, at most ₦4,000 a character a week, only with four different people entered); the
owner's badge and card; standings and "agents playing now" with watch links on the Agent league page; the challenge link (a game or
a 7-day life contest) to a card with both names and AI marks; `/agents/join` with each assistant's exact steps from the owner's own
key (Claude, ChatGPT, Gemini CLI, Cursor and VS Code deep links), a `.mcpb` bundle and a starter prompt. Agent rooms are watch-only,
never staked or backed, and stay off people's ladders. `docs/AGENT-ARENA.md` lists what cannot be prevented. Not verified: the
bundle and deep links installed in the real apps (tests decode them).

## Phase 5: Race in 3D (16 October 2026, live at `f87981e1`: release 38893610686, smoke PASS, checked live at 390x844 and 844x390, 28 calls, about 22,000 triangles, no page errors)

- **What a player gets.** Race is drawn in 3D from behind their own car (a viewer follows the leader or the car they tap), on the three
  tracks: the Kenney race cars (red, orange, green, white, one a seat) with wheels that roll with the speed and front wheels that steer, a
  body that leans out of bends and dives under braking, tyre smoke on slides, a flame on a boost, sparks and a camera shake on a bump, a
  road with kerbs on the outside of bends, a chequered start line and boost pads, barriers and fences along both edges, a grandstand and pit
  garages by the start, palms and sand (Lekki, Ikoyi) or a lagoon, a deck and piers, lamps and stalled danfos and okadas (Third Mainland).
  The countdown pulls in from behind, the camera widens with speed, and when the car being followed crosses the line a low angle by the
  line holds for 2.6 s. The HUD (place, lap, time, speed in km/h, minimap, names, FINISHED, 3-2-1, GO) is the existing one over the 3D
  view. Without WebGL, or if the models fail, the old 2D view draws everything. Controllers, keys and touch are untouched.
- **Rules: unchanged, `rev` stays 1.** `race.ts`, the snapshot and the tracks are as they were; all the feel (roll, pitch, steering
  angle, spin, smoke, camera) is read from the snapshot in the browser. Units: 0.1 m a rules unit (a car is 40 units, 4 m long; the road
  18 m between kerbs; a lap about 450-520 m; the quickest cars about 65 km/h).
- **Files.** `src/arena/race-3d.ts` (lazy chunk), `race-3d-geo.ts` (pure: road ribbon, placements, wheel and lean maths, camera poses),
  `race-units.ts`, `race-3d.test.ts` (23 tests); `race-draw.ts` gains `drawRaceHud`; `RaceGame.vue` (3D canvas under the HUD canvas,
  insets, resize, `orientationchange` then again 250 ms later); `preload.ts` `warmRace()` (Games hub open and idle, same skips);
  `cartridges.ts` (race: `lazy: ['race-3d', 'meshopt_decoder.module', 'native-body']` and twelve CC0 Kenney assets).
- **Measured** (headless Chromium with a software GL: frame times are not a phone's, the script cost is what the numbers say; CPU
  throttle 4x via CDP, four cars, 16 s of driving):

  | Screen | script / frame (median, p95) | draw calls | triangles |
  | --- | --- | ---: | ---: |
  | 390 x 844 | 1.3 ms, 1.9 ms | 39 | 24,400 |
  | 360 x 740 | 1.3 ms, 1.9 ms | 39 | 24,400 |
  | 844 x 390 | 1.4 ms, 2.2 ms | 41 | 24,200 |
  | 667 x 375 | 1.3 ms, 2.0 ms | 39 | 24,200 |
  | Third Mainland (lobby view, 4 cars) | 0.5 ms (not throttled) | 43 | 28,400 |

  Two cars: 25-28 calls, about 21,400 triangles. Barriers, fences, trees and lamps are drawn only 40 m behind to 170 m ahead of the car
  (all of them were 42,000 triangles). Race cartridge: 257,088 bytes brotli (217,649 of chunks, 39,439 of models) of 1,500,000.
- **Checks.** Typecheck clean; `src/arena/*.test.ts` and the others in the arena command pass (172); `npm run cartridge:check` ok;
  CI run 38890821282 (merged with `origin/main` and `origin/claude/viral-fight`) green: STARTUP_RAW 613,952 (the branch it started from:
  614,449, so it did not grow; a game is not in the first download), STARTUP_GZIP 222,444, STARTUP_BROTLI 195,390 of 195,600,
  SCENE_HOST_RAW 188,818, LOADING_RAW 90,568, all ok.
- **Not verified.** A real phone (frame rate, heat, touch feel on the two thumbs, a real pad over Bluetooth); a four-person live race
  over the network; the Third Mainland track during a race (only its lobby view and camera poses were looked at: the 2-seat practice
  starts on Lekki); Ikoyi by eye; the sound; reduced-motion mode; the photo finish for a viewer; the deck platform at the start of the
  bridge from the chase camera. Screenshots are in the coordinator's scratch folder, not the repository.

## Phase 6: Football in 3D and a penalty shoot-out (16 October 2026, branch `claude/viral-football`, not yet released)

- **What a player gets.** Football is drawn in 3D: our own pitch, goals and ball (40 x 20 m, the rules' field mapped onto it), Kenney's
  blocky players (green side, yellow side, purple keepers) running, kicking, sliding, falling, cheering and hanging their heads from
  what each snapshot says, a ball that rolls, spins and hops, nets that give on a goal, stands with a crowd that jumps, floodlights, a
  ring in the team's colour under each player and a team-coloured name tag over him. A goal shows a low replay from behind the goal
  line (the last second of the play at 0.62 speed, from frames the view kept) and then the scorer's celebration. **Camera:** a tall
  phone sees the pitch end-on from behind its own goal, high, looking up the pitch (it keeps the pitch's length along the tall screen,
  clear of the thumb pad, and your side attacks "up" as in the 2D view); a wide one sees it from the side, your side attacking to the
  right. Chosen by screenshots (`cmp-side-390x844-*.png` against `f390x844-*.png`: from the side the whole pitch is a thin band in the
  middle of a tall screen with the players half the size). **Penalties:** a level match with `ending` 3 goes to a shoot-out, seen from
  behind the shooter with the keeper facing; the kick that decides it runs in slow motion for its last ticks (the server stretches the
  flight, the camera creeps in). The old 2D view draws everything (the shoot-out too, as a goal seen from behind) without WebGL.
- **The shoot-out, as built** (`football.ts`, header and tests). Phase `pens`. Five kicks each, alternating, the team to go first drawn from
  the match's own random numbers; it ends as soon as one side cannot be caught (3-0 after three each). Level after five each: sudden
  death, a round at a time, ended by the first round that splits them; level after ten each is a draw. In a 2v2 a team's shooters take
  turns. A kick: SET 1.5 s, AIM up to 10 s (then it is taken as it stands), FLIGHT 9-16 ticks, RESULT 2 s. The shooter steers with the
  existing heading (15-degree steps, at most 60 degrees either side of straight on: 0, 15, 30 degrees land 0, 25, 53 units from the
  middle, 45 is outside the 70-unit post) and charges with the existing shoot button, kicking on release. The charge is pace and
  height: full at 16 ticks, over the bar from 22; a full charge swings the ball out a fifth, so a full-power corner clips the post.
  The keeper is the other team's first seat: its heading names left, middle or right (as the shooter's camera sees them). A dive named
  at the strike is early and full length; a keeper still in the middle may name one up to 5 ticks later, a late dive, 60% as far. A dive
  covers shots from 14 units off the middle out to 78 - 42 x power; a keeper who stays covers 18 units either side unless the shot
  is full power (more for a soft one). So: a well-placed corner beats a wrong dive and, above about half power, a right one; a middle
  shot beats a dive; hard beats a keeper who stays in the middle; a late dive saves only soft, near shots. All decided in `step`
  from aim, power and dive; no random number is drawn except for who goes first and the computer's own choices for each kick. Events:
  `kick`, `goal`, `save`, `post` and the new `miss` (1 wide, 2 over). The snapshot has `o` (stage, team, shooter and keeper, score,
  marks, seconds, the kick, its result, the winner). `rev` 2. Input is unchanged: the same integer, the shared pad module, the same
  `InputPipe`; on the keys a diagonal means 30 degrees in a shoot-out.
- **Tests.** `football.test.ts` (37): the options, the judging table (corner vs wrong dive, middle vs dive, power, over, wide, post,
  late dive), a scripted kick and its events, the keeper moving in the goal shot at, the aim time-out, slow-motion flight, `soWinner`
  for every case, a whole shoot-out won early, sudden death both ways, the ten-each cap, 2v2 turns, the computer shooting and keeping
  (and deterministic tick for tick), forfeit; endings 1 and 2 as before. `replay.test.ts` replays a football match that goes to
  penalties exactly. `football-3d.test.ts` (15): units, versioned URLs, clip choice, facing, camera framing (the ball inside the free band
  in both orientations for both teams, projected), the shoot-out camera fitting the goal, the replay's timing, the stick's turn.
- **Files.** `src/arena/football-3d.ts` (lazy chunk), `football-draw.ts` (`drawFootballHud`, `drawShootout2D`, `stickRotation`),
  `football.ts` (shoot-out), `FootballGame.vue` (3D canvas under the HUD canvas, insets, resize, `orientationchange` then again 250 ms
  later), `preload.ts` `warmFootball()`, `cartridges.ts` (`rev` 2, `lazy: ['football-3d', 'meshopt_decoder.module', 'native-body']`, six
  assets: our pitch, goal, ball; CC0 Kenney players 1-3), `replay-view.ts` (a shoot-out in a replay), `football-sound.ts` (`miss`).
- **Measured** (headless Chromium with a software GL: frame times are not a phone's, the script cost per frame is what the numbers
  say; production build, CPU throttle 4x via CDP, 14 s of running and shooting):

  | Screen | script / frame (median, p95) | draw calls | triangles |
  | --- | --- | ---: | ---: |
  | 390 x 844 | 1.6 ms, 2.5 ms | 41 | 10,346 |
  | 360 x 740 | 1.6 ms, 2.4 ms | 41 | 10,346 |
  | 844 x 390 | 1.8 ms (p95 is the software GL stalling) | 41 | 10,346 |
  | 667 x 375 | 1.7 ms, 2.5 ms | 41 | 10,346 |
  | 390 x 844, 2v2 (six bodies) | 1.9 ms, 2.8 ms | 53 | 10,490 |

  Shaders and textures are compiled and uploaded before the first frame. Cartridge: **football 271,299 bytes brotli** (17 chunk
  files 219,444, shared with the other two games' three.js, and six assets 51,855) of 1,500,000. Sizes: STARTUP_RAW 613,952 (the
  same as `aa00c1087`, the branch it started from), STARTUP_GZIP 222,445, STARTUP_BROTLI 195,230, LOADING_RAW 90,568, SCENE_HOST_RAW 188,818.
- **Found on the way.** The blocky players ship unlit and without normals (black under a light): the view computes normals. The goal's
  net texture has no `alphaMode`, so its clear cells drew black: the view blends it. The pitch's own marked spot is at 6 m, so the
  shoot-out's spot is 135 units, not the 92 the 2D pitch drew (now both at 135).
- **Screenshots** (`/Users/anthonyakpan/work/tmp/football-shots/`, not in the repository): `f<W>x<H>-run|kick|later.png` open play,
  `-goal-200|800|1300|2000|2800.png` a goal (live, replay twice, celebration), `-pens<N>-set|aim|fly|dive|result.png` a shoot-out, for
  390x844, 360x740, 844x390 and 667x375; `cmp-*` the other camera on each screen.
- **Not verified:** a real phone (GPU, thermal, Safari), a real pad over Bluetooth in a shoot-out, a two-person live match in a
  shoot-out, the 3D view after a lost WebGL context, and the numbers in the table on a throttled profile that is not software GL.

## Phase 6b: realistic footballers (16 October 2026, branch `claude/viral-football-real`)

- **What a player gets.** Each footballer is the person's own native character (the world's CC0 MakeHuman body, hair, face and shoes) in
  the team's shirt (green or yellow; shorts white or dark), animated by football clips made here in Blender
  (`scripts/assets/blender/native-football-clips.py`, sharing the solver and writer with the Fight clips in `native_rig.py`; the Fight
  clips file is byte for byte the same after the move). Seats carry the optional `nat` look as in Fight; the computer and seats without
  one get a varied default from pieces the world already loaded. Rings and name tags stay. Same fallbacks as Fight (under 3 GB memory,
  under 4 cores, no WebGL 2, files slow past 8 s, a failed spawn): the Kenney players as before, which also stand in until the own
  characters arrive.
- **Clips** (`public/assets/packs/allworld-arenas/native-football-clips.glb`, 393 KB, 2 x 15 clips, 60 Hz keys resampled by the pack
  step): idle 1.6 s loop, walk 0.85 s, jog 0.70 s, sprint 0.47 s, dribble 0.62 s (cycles, treadmill feet for 1.3, 2.4, 5.7 and 3.3 m/s),
  kick 0.85 s (wind-up held at 0.30 s while the shoot button is charged, contact 0.38 s), pass 0.60 s (0.18, 0.24), tackle 0.70 s (a
  standing poke, no slide), stumble 0.9 s, celebrate 1.5 s loop (arms-out run then a jump), dejected 2.0 s loop, keeper-ready 1.1 s
  loop, keeper-dive-left and -right 1.2 s (the first 0.5 s is scrubbed by how far the server has moved the keeper, the rest is the
  landing played in time), keeper-catch 1.0 s. The view blends idle, walk, jog, sprint and dribble by speed on one shared stride phase
  (`football-native.ts`, `ActionMix`), one state clip over it.
- **Budget and level of detail.** A full native actor of the world's body is about 29,000 to 33,000 triangles and the world has no animated
  light body, so each actor gets a second index over the same vertices, skeleton and skin weights, simplified with the simplifier the
  world ships (`lightenActor`, about 7,000 triangles, every clip plays on it). Your own player, and in a shoot-out the shooter and the
  keeper he faces, are drawn in full; everyone else is light. Every person is a native character in every mode (1v1, 2v2, shoot-out,
  keepers included); the blocky players remain only as the fallback and the stand-in. If one full actor plus the other actors light, or two
  full ones, would pass 90,000 triangles with the scene, the match falls back. The keeper side-steps (`keeper-shuffle-left/right`, played at
  his sideways speed) instead of gliding.
- **Framing.** Tall phone: the end-on camera slides back towards your own goal, up to 12 m (never past the point where the ball leaves the top fifth of the free band), until the near goal line is above the thumb pad
  (`clearShift`). Wide phone: a dark gradient band behind the top bar so the score reads over the crowd.
- **Measured** (headless Chromium, software GL, CPU throttle 4x; script ms a frame median/p95, draw calls, triangles): 1v1 open 390x844
  3.6/4.6, 45, 57,344; 844x390 3.7/22.4 (software GL stalls), 45, 57,344; 2v2 open 390x844 4.3/5.2, 59, 68,588; 844x390 4.2/21.9, 59,
  68,588; shoot-out 1v1 390x844 2.6/3.3, 31, 63,938; 844x390 3.3/5.0, 31, 65,256; 2v2 390x844 2.8/3.9, 31, 67,368; 844x390 3.3/5.2, 31,
  66,110. Screenshots `r390*`, `r844*` in the screenshots folder. Sizes in CI's run for the final commit.
- **Not verified:** a real phone (GPU, thermal, Safari), two people in a live shoot-out, the keeper's side-step on screen in a live match, the 3D view after a lost WebGL context.

## The owner's decisions (16 October 2026)

1. Polish all three games: Fight, Race and Football.
2. Stakes: game money only, capped by the table-stakes limits, called "stake" and "prize", no odds, no cash-out.
3. First videos: Nigeria, on TikTok and WhatsApp status. The owner approves and posts.
4. The comparison set is the big platforms (the PC store, the user-generated game platforms, the battle-royale creator mode).
5. Assets: CC0, CC BY or our own only; never a commercial game's.
6. Clans of 25 that may own a venue room; spectators may back a player (person, agent or bot) with a capped game-money stake.
7. The games must be realistic and polished like finished commercial games (within the phone and size budgets), and every game
   must work with a real game controller through the Gamepad API (PHASES.md, "The standard for every game").
8. The agent may install Blender and make our own realistic assets with it, for the world and for the mini games, from committed
   scripts, within the budgets (PHASES.md, "Making our own assets with Blender").

9. (16 October, evening) **Every game must be oriented properly on a phone and must not lag.** Portrait and landscape both framed
   well (the controls never cover the play, the full-screen button turns the phone to landscape where it can), and smooth on a
   cheap phone: downloading and caching ahead of time is allowed (prefetch a game's chunks and models when the Games app opens or
   the phone is idle; the browser and service worker caches keep them), and the renderer lowers its resolution by itself when frames
   run slow.

## Questions for the owner

None open. Answered 16 October 2026 (evening):
- **Startup brotli noise:** yes, an agent may change how build files are named (or where the chunk lists live) so the first download
  stops moving with every lazy change; the limits in src/budgets.ts stay as they are.
- **Agent cup prizes:** yes: ₦2,000 / ₦1,000 / ₦500, at most ₦4,000 a character a week, only when four different people entered.
- **OAuth for web assistants:** yes: the MCP endpoint gets an OAuth sign-in so ChatGPT and Claude on the web can connect; the owner
  accepts the connector terms.

Answered 16 October 2026:
- Clans: 25 members, and a clan may own a venue room (a room in a venue that the clan holds, with its name and colour; the venue
  stays open to everyone else).
- Spectator stakes: yes. People watching may back a player, whether a person, an agent or a house bot, with a small capped
  game-money stake, paid out by the server. Keep the rules of README.md: game money only, within the table-stakes limits, called
  "stake" and "prize", no odds display, no cash-out, and nothing that reads as betting (no "luck" words, no tip groups, no
  winning-ticket posts).

## Failing on `main` before us

- 16 October: `server/social.test.ts` "who-is-here carries each player's server-held look…" fails on untouched `main` (it expects
  `look_saved`; the native character work changed looks). Not ours.

See docs/agent-plans/world-alive/STATUS.md, "Failing on `main` before us": eleven tests left failing for the owner's judgement
(market scene anchors, ambient crowd size, two Abuja scenes, sedan geometry hashes, the country count, one remote homeward route).
Not yours to fix.

## Log

- 2026-10-16: Phase 4b live at `f0f38db3` (release 38921497112, smoke PASS): each fighter is the player's own native character, moved
  by fight clips we built in Blender (scripts/assets/blender/native-fight-clips.py; 24 clips, 310 KB); bots use only character pieces
  the world already loaded; the camera keeps them large and inside the ropes; startup unchanged. Checked live at 390x844 and 844x390:
  about 55,000 triangles, 20-21 calls, under 1 ms of script a frame, no page errors. Fallback to the KayKit fighters on phones with
  little memory or few cores, without WebGL2, or when the characters are slow. Not verified: a real phone, a two-person match.
- 2026-10-16: Phase 6a live at `d95ee616` (Football in 3D, penalty shoot-out; release 38911085638, smoke PASS, checked live at
  390x844 and 844x390: 41 calls, about 10,300 triangles, no page errors). For 6b: realistic players, the near goal partly under the
  portrait joystick, the crowd behind the landscape score bar. Live-testing note: the coordinator's live checks made about seven guest
  players named "Zz Test …" (the rule is at most two); from now on every live check reuses one saved test session. The extra guests
  are idle guests (no account); an operator may remove them with the admin erasure tool.
- 2026-10-16: the owner skipped Phase 7 (videos); the work in progress was discarded, nothing was posted or committed.
- 2026-10-16: Phase 6 (Football in 3D, penalties, `rev` 2) built on `claude/viral-football`; in CI.
- 2026-10-16: Phase 5 live at `f87981e1` (Race in 3D). Phase 4b (realistic fighters) and Phase 6 (Football) being built.
- 2026-10-16: Phase 4a live at `40e1e614` (Fight in 3D). Race (Phase 5) built and in CI; Football (Phase 6) being built.
- 2026-10-16: live in order: the MCP OAuth sign-in for web assistants (`9e8b5b3b`; discovery documents and the 401 challenge
  checked live), 7-character build hashes (`80768f46`; first-download brotli 195,569 to about 195,300, so chance overages stop),
  Phase A asset packs (`c254d4327`). Smoke PASS after each.
- 2026-10-16: the owner asked that every game be oriented properly on a phone and never laggy; prefetching and caching allowed.
- 2026-10-16: the owner answered: build-file naming may change, the cup prizes stand, OAuth for web assistants yes.
- 2026-10-16: Phase 3 live at `ee203d15` (agent cups, challenge link, join page).
- 2026-10-16: Phase 2 live at `01409bc9` (with the Worker build minifying local names to stay within its guard).
- 2026-10-16: Phase 1 complete and live at `1841c909` (1c: stakes and backing). Phase 2 built and in CI.
- 2026-10-16: Phase 1a+1b live at `45723a6e` (contract, checker, replays, reconnect, replay page, clips, controllers).
- 2026-10-16: Phase 0 baseline recorded (main `228443371`, live `c2419edb`, typecheck clean, Blender 5.2.2 installed).
- 2026-10-16: plan, research and answers written; four phases started and stopped mid-way (branches above). Nothing released.
