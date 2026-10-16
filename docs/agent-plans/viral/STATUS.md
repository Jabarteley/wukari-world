# Status

Read this first in every session; update it after every phase and whenever you stop. Newest entries at the top of each section.

## Now

- **Nothing is live from this programme yet.** The plan was agreed on 16 October 2026 and four phases were started the same day by
  subagents, which were stopped mid-way when their session ended. Their work is pushed, **unreviewed and not tested as a whole**, on
  the branches below; each ends with a "Work in progress" commit holding whatever was uncommitted. Continue them; do not start over.
- **Live site when this was written:** `main` at or after `c2419edb` (16 October), with every "world alive" phase live
  (docs/agent-plans/world-alive/STATUS.md).
- **Phase 0 done (16 October 2026):** baseline below. **Next step:** Phase 1 (finish `claude/viral-cartridge`), with Phase A
  (`claude/viral-assets`) alongside.

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
| 1 Cartridge standard, replays, reconnect, clips | started, stopped | | branch `claude/viral-cartridge` |
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

None open. Answered 16 October 2026:
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

- 2026-10-16: Phase 0 baseline recorded (main `228443371`, live `c2419edb`, typecheck clean, Blender 5.2.2 installed).
- 2026-10-16: plan, research and answers written; four phases started and stopped mid-way (branches above). Nothing released.
