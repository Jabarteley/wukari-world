# Status

Read this first in every session; update it after every phase and whenever you stop. Newest entries at the top of each section.

## Now

- **Nothing is live from this programme yet.** The plan was agreed on 16 October 2026 and four phases were started the same day by
  subagents, which were stopped mid-way when their session ended. Their work is pushed, **unreviewed and not tested as a whole**, on
  the branches below; each ends with a "Work in progress" commit holding whatever was uncommitted. Continue them; do not start over.
- **Live site when this was written:** `main` at or after `c2419edb` (16 October), with every "world alive" phase live
  (docs/agent-plans/world-alive/STATUS.md).
- **Phase 1 is partly live (16 October 2026, `45723a6e`):** the cartridge contract and checker, replays, the 15-second reconnect,
  the replay page, clips and real game controllers. **Next step:** Phase 1c (arena stakes and spectator backing, built and tested on
  `claude/viral-cartridge`, not yet released), then Phase 2. Phase A runs alongside on `claude/viral-assets` (a subagent).

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
| 1 Cartridge standard, replays, reconnect, clips | 1a+1b live; 1c (stakes) next | `45723a6e` | see "Phase 1" below |
| 2 Clans, ladders, city leagues | started, stopped | | branch `claude/viral-clans` |
| 3 Agent arena | started, stopped | | branch `claude/viral-agent-arena` |
| A Asset pipeline | started, stopped | | branch `claude/viral-assets` |
| 4 Polish Fight | not started | | |
| 5 Polish Race | not started | | |
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

**Built, not released (1c, on `claude/viral-cartridge`):** stakes in game naira for two people in a room (the host picks one of
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

## Questions for the owner

- **Startup brotli noise** (see Phase 1): may an agent change how chunk hashes are named or where the city chunk list lives, so
  the first download stops moving by about 200 bytes with every lazy change? The limits themselves would not change.

Answered: Answered 16 October 2026:
- Clans: 25 members, and a clan may own a venue room (a room in a venue that the clan holds, with its name and colour; the venue
  stays open to everyone else).
- Spectator stakes: yes. People watching may back a player, whether a person, an agent or a house bot, with a small capped
  game-money stake, paid out by the server. Keep the rules of README.md: game money only, within the table-stakes limits, called
  "stake" and "prize", no odds display, no cash-out, and nothing that reads as betting (no "luck" words, no tip groups, no
  winning-ticket posts).

## Failing on `main` before us

See docs/agent-plans/world-alive/STATUS.md, "Failing on `main` before us": eleven tests left failing for the owner's judgement
(market scene anchors, ambient crowd size, two Abuja scenes, sedan geometry hashes, the country count, one remote homeward route).
Not yours to fix.

## Log

- 2026-10-16: Phase 1a+1b live at `45723a6e` (contract, checker, replays, reconnect, replay page, clips, controllers).
- 2026-10-16: Phase 0 baseline recorded (main `228443371`, live `c2419edb`, typecheck clean, Blender 5.2.2 installed).
- 2026-10-16: plan, research and answers written; four phases started and stopped mid-way (branches above). Nothing released.
