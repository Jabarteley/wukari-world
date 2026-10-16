# Cartridges: games inside Allworld

A **cartridge** is one real-time game of the arena (Fight, Race, Football today): everything Allworld needs to host it, written
down as a small, versioned contract. The three games are the first cartridges and conform to it without having changed how they
play. The contract is `src/arena/cartridge.ts` (types and a validator); the registry is `src/arena/cartridges.ts`; the engine
underneath is described in [REALTIME-GAMES.md](REALTIME-GAMES.md).

Status: contract **version 1**, for the games in this repository. Opening it to outside builders is a later step the owner decides
(docs/agent-plans/viral/PHASES.md, Phase 8).

## What a cartridge provides

| Part | Where | Rules |
| --- | --- | --- |
| Rules | `src/arena/<id>.ts`, listed in `src/arena/registry.ts` | A `RealtimeRules` (`src/arena/rules.ts`): deterministic, server-owned, `hz` 1..30, a snapshot under about 300 bytes, a bot, `reduce`/`settle` for taps. The server holds the state; the client only sends parsed input. Randomness only from the `rng` passed in. |
| Screen | `src/app/features/arena/<Id>Game.vue`, listed in `src/arena/catalog.ts` | A lazy chunk (`defineAsyncComponent` / dynamic `import()`): never in the first download (`src/budgets.ts`). |
| Replay view | `src/arena/replay-view.ts` | Draws recorded snapshots for the replay page and clips, from the same drawing module the screen uses. |
| Entry | `src/arena/cartridges.ts` | `defineCartridge({ contract, id, name, blurb, rev, venues, modes, reads, writes, manifest })`. |

### The entry

- `id`: the rules id, 2-16 lower-case letters. `name` and `blurb`: the card's words (the tests check they match the catalog).
- `rev`: the rules revision. **Raise it whenever `start`, `step` or `bot` change a match.** A replay made by another revision still
  plays, but is marked as not exact.
- `venues`: where in the world the game is offered (`viewing-centre`, `stadium`, `race-track`, `airstrip`, `arcade`, `square`). A
  private room by code needs none.
- `modes`: for each of `alone` (against house bots), `friends` (code or link), `community` (clan, city), `matchmaking` (by
  rating) and `agents` (an AI agent plays a seat), `live` or `planned`. At least one is live.
- `reads`: what the host may hand the game: `identity` (the public name and the AI mark, never an account or device id),
  `friends`, `closeness`, `stake`, `venue`, `city`. A staked game must also read identity.
- `writes`: what the game may report back: `result`, `rating`, `gist` (one public line through `gistService(ctx).add`, which
  drops minors and hidden players), `reward` (clamped by `clampRewards` to the table games' own limits, `CARTRIDGE_LIMITS`), `replay`.
- `manifest`: `entry` (the stem of the screen's chunk, `FightGame` for `FightGame-1a2b3c4d.js`), an optional `cap` (brotli
  bytes, at most the default 1.5 MB) and `assets`: every non-code file the game loads.

### Assets and the licence manifest

Every asset is listed with `path` (from the repository root), `licence` (`CC0`, `CC-BY`, `MIT` or `ours`), `source` (a page
address, or `Allworld` for our own work made from committed scripts) and, for CC BY, the exact `attribution` line, which must also
be written in `NOTICE.md` and is shown in the game's credits. Never a commercial game's models, sounds, names or art.
The asset packs, their want lists and the Blender scripts are described in [ASSET-PIPELINE.md](ASSET-PIPELINE.md).

### The size cap, checked in CI

`npm run cartridge:check` (after `npm run build`, beside `size:download`, in CI's build job and in `npm run check:fast`) checks for
every cartridge: the entry is valid, every listed asset exists and has a licence, every CC BY credit is in `NOTICE.md`, and the lazy
chunks the screen pulls in beyond the first download plus its assets weigh at most the cap in brotli bytes. It prints one
`ok`/`OVER` line per cartridge and exits 1 on any problem. `--no-dist` checks the manifests without a build.

## Rooms, reconnecting and spectators

Rooms, codes, links, watching, rematch and limits are the arena's (REALTIME-GAMES.md). Two rules every cartridge gets for free:

- **Reconnect window: 15 seconds, never an instant forfeit.** Prepaid networks drop for seconds at a time. When a seated person's
  last connection goes during a match, the seat's **bot steers it** (the rules' own `bot`, so the seat keeps playing, not idling).
  When the person returns within 15 seconds (`TUNING.awayForfeitMs`), they take the seat back from a neutral input. Only after the
  window does the seat forfeit. The roster marks the seat `away` meanwhile. The stretch the bot steered is part of the replay.
- **The AI mark.** A seat whose connection is an AI agent's key carries `ai: true` in the roster, the replay and every caption
  ("Name · AI"). It is never dropped.

## Replays

The arena is deterministic, so a finished match is fully described by its start and what each seat did.

- The room host records each person's input **when it changes** (tick, seat, input), the stretches a bot steered a person's seat,
  and forfeits (`src/arena/replay.ts`, `ReplayRecorder`). Bots are not recorded: the replay asks the same bot again with the same
  random numbers. A log is a few KB (a 90-second fight about 2-6 KB); one over 24 KB is not kept.
- Kept on a small shelf (`server/growth/arena-replays.ts`): at most 30 per game, for 7 days, stored so that a shared link survives a
  restart. It holds public names, the AI mark and the cosmetic look, never an id or the room code; the seated people's public ids
  are kept apart, never sent, so that an erased player's replays are deleted with them.
- `GET /api/arena/replay/:id` (public, rate-limited per address) answers `{ id, at, clip, log }`; `?meta=1` only `{ id, game, clip }`.
  The finished room's `arena-state` carries `replay: <id>`.
- `replayMatch(rules, log, rev)` runs the same rules from the log and reports `verified` when it reaches the recorded last snapshot
  with the same revision. The tests replay a fight, a race and a football match tick for tick.

### The replay page

`/replay?replay=<id>` (`replay.html`, `src/arena/replay-page.ts`: a build entry of its own, nothing of the first download) plays
the match again with caption bands (the game, the players with the AI mark, the result, "Play free in your browser ·
joinallworld.com"), then offers "Watch again" and "Play Allworld". Parameters: `aspect=9x16`, `w=1080`, and `frame=N` for
**stepping**: the page draws frame N of virtual time (60 a second, 16.67 ms each) and exposes `window.allworldReplay = { frames,
clip, w, h, verified, draw(frame) }`, so a headless browser can capture any frame exactly.

## Clips

The viral unit: the last ten seconds of a match (the finish, the knock-out, the goal) with a 1.5-second hold on the final position.

- **On the phone**: the result card's **Make a clip** replays the match on a hidden canvas at 720x1280 and records it with the
  browser's own recorder (MP4 on Chrome for Android and Safari, WebM elsewhere; 1.2 Mbit/s, about 1.5 MB, under the 2 MB a WhatsApp
  status should be). **Share clip** hands the file to the share sheet with the card's words and the replay link; a phone that cannot
  share files offers **Save clip**, and a phone that cannot record shares the words and the link (`src/arena/clip-share.ts`).
  Nothing is uploaded.
- **Offline, full size**: `npm run clip -- --replay r-xxxxxxxxxx` (or `--log match.json --origin http://127.0.0.1:3001`) opens the
  replay page in headless Chromium, steps each frame, pipes PNGs to FFmpeg and writes `<name>-1080x1920.mp4` (TikTok, Reels, Shorts)
  and `<name>-720x1280.mp4`, re-encoded until it is under 2 MB. Needs FFmpeg and `playwright-core`, which is not a dependency of the
  game: `npm i --no-save playwright-core && npx playwright-core install chromium`. `--page /replay.html` against `npm run dev`,
  `--fps 60`, `--all` for the whole match. An operator can record where a rendered clip lives with `POST /api/arena/clip`
  (`{ id, url }`, bearer token); the replay then carries `clip`.

## Tests

`node --experimental-strip-types --test src/arena/*.test.ts server/arena.test.ts server/arena-replay.test.ts server/growth/arena-replays.test.ts scripts/cartridge-check.test.ts scripts/clip.test.ts`

- `src/arena/cartridge.test.ts`: every game conforms (entry valid, rules/catalog/entry agree, bots deterministic, small snapshots).
- `src/arena/replay.test.ts`: recorded matches of all three games replay exactly, with bot-steered stretches and forfeits.
- `server/arena-replay.test.ts`: real server and sockets: the public replay route, and the 15-second window (bot steers, the person
  takes back control, a forfeit only after the window).
- `src/arena/clip.test.ts`, `scripts/clip.test.ts`: captions (AI mark, no betting words), the recorded format, frames and FFmpeg.
