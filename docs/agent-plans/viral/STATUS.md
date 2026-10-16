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
| 4 Polish Fight | 4a live (3D) | `40e1e614` | 4b next: realistic fighters, portrait tidy-ups |
| 5 Polish Race | live (3D) | `f87981e1` | realistic cars later; see "Phase 5" |
| 6 Polish Football | not started | | |
| 7 Videos (Nigeria first) | not started | | |
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
