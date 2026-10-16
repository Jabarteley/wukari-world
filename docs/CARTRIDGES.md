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

## Stakes and backing

Game naira only, never real money, never cashed out (`src/arena/stakes.ts`, money in `server/growth/arena-stakes.ts`). Every rule of the
table stakes holds, through the same server-only life action: adults only (the age answer), only money the player worked for and has
not passed on (the gift rule), and the **same day limits**, shared with the tables (₦10,000 a player, ₦5,000 a pair).

- **Players.** The host picks "Play for" in the lobby: free, ₦100, ₦500, ₦1,000 or ₦2,000 each. Only between exactly two people,
  never with a computer seat (such a room plays free and says so). Both stakes are taken in one transaction when the match starts;
  the winner takes the prize (both stakes); a draw or a match nobody pressed anything in gives both back; leaving or forfeiting loses.
- **Backers.** Someone watching (not seated) may back one seat, a person, an agent or a house bot, with ₦100 or ₦500, once a match,
  in the lobby or the first ten seconds of play. The winner's backers share the prize (everything all backers put in, in proportion,
  to the naira); a draw, or a match where nobody backed the other side, gives every stake back. There are no odds anywhere.
- **Exactly once.** The pot record (`arenapots`) is written in the transaction that takes the money and deleted in the one that
  pays it. A room that closes without a result, or a restart, gives every stake back (the heartbeat sweeps any pot no live match
  owns). A player with money in an unsettled pot cannot be erased until it settles.
- Words: "stake", "prize", "back", "play for". The tests run every line past the table stakes' forbidden words.
- Frames: `arena-stake {room, amount}` (host, lobby) and `arena-back {room, seat, amount}` (a watcher); `arena-state.stakes` says the
  stake, whether this viewer may back, what they backed, and their sentence once it settled.

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

## Controllers

Every cartridge gets real game controllers through the browser's Gamepad API, from one shared module (`src/arena/input/`):

- **Equal terms.** A pad sends exactly what the touch controls send. Each screen hands its own touch functions to `usePad`
  (Fight and Race: the stick or d-pad holds left/right, with a little hysteresis; Football: the stick sets the same heading as the
  touch joystick), so the server sees one kind of input and replays stay exact. The stick has a radial dead zone (22% by default).
- **The standard mapping** (`src/arena/input/pad.ts`): left stick or d-pad to move or steer, face buttons for the game's actions,
  triggers for gas and brake, Start for the controller panel. Fight: X punch, B or Y kick, A jump, LB, RB or LT block (held).
  Race: RT or A gas, LT or B brake. Football: A or RT shoot or pass (hold to power up), B or X tackle.
- **The Controller button** in every game's top bar (shown where the browser has the Gamepad API) opens the panel: the buttons for
  each action, **Change** (press the button you want; one button does one thing), the dead zone, rumble on or off, and back to
  the standard buttons. Kept on the device (`aw-pad-v1`). "Controller connected" is said once when a pad appears.
- **Rumble** where the browser allows it (the pad's vibration actuator): hits and the knock-out, bumps and the finish, goals.
- A live match cannot be paused: the server keeps time for everyone.
- A new cartridge declares its `PadControls` (actions with default buttons, and whether the stick moves) in `pad.ts`, calls
  `usePad(controls, handlers)` with its touch functions and passes the result to `ArenaStage` as `:pad`.
- Tests: `src/arena/input/pad.test.ts` drives fake pads (mapping, dead zone, d-pad, edges, remap, repaired settings).

## Tests

`node --experimental-strip-types --test src/arena/*.test.ts src/arena/input/*.test.ts server/arena.test.ts server/arena-stakes.test.ts server/arena-replay.test.ts server/growth/arena-replays.test.ts scripts/cartridge-check.test.ts scripts/clip.test.ts`

- `src/arena/cartridge.test.ts`: every game conforms (entry valid, rules/catalog/entry agree, bots deterministic, small snapshots).
- `src/arena/replay.test.ts`: recorded matches of all three games replay exactly, with bot-steered stretches and forfeits.
- `server/arena-replay.test.ts`: real server and sockets: the public replay route, and the 15-second window (bot steers, the person
  takes back control, a forfeit only after the window).
- `src/arena/input/pad.test.ts`: controllers with fake pads.
- `src/arena/stakes.test.ts`, `server/arena-stakes.test.ts`: stakes and backing, pure and against a real server.
- `src/arena/clip.test.ts`, `scripts/clip.test.ts`: captions (AI mark, no betting words), the recorded format, frames and FFmpeg.

## 3D on a phone (Fight, Race and Football today)

- **Orientation.** The 3D view frames the pair in what the HUD and thumbs leave free (`framing` in `src/arena/fight-3d.ts`): portrait keeps them between the top bars and the pad, landscape between the two thumb clusters. `FightGame.vue` measures those from the page and re-frames at once on a resize, a turn of the phone or when the pad appears.
- **Smooth.** `src/arena/three/kit.ts` starts at a pixel ratio of min(device, 1.5) and `nextLevel` steps it down (1.5, 1.25, 1, 0.85) when the median of 60 frames is over 22 ms, and up one after 5 s of medians under 14 ms. Antialiasing is off at a ratio of 1 or less. A 60 Hz screen never has a median under 14 ms, so it steps down but does not step back up.
- **Ahead of time.** The Games hub calls `warmFight()`, `warmRace()` and `warmFootball()` (`src/arena/preload.ts`) when it opens and when the browser is idle: each imports its `*-3d.ts` and loads its GLBs. Never on Save-Data or 2G, and never in the first download (the import is dynamic).
- **Caching that updates.** `/assets/` is immutable for a year and the packs keep their names, so every model URL carries `?v=<10 hex of the file's sha256>` from `src/arena/asset-versions.generated.ts`. `npm run assets:versions` rewrites it (the pack preparer does too); the prebuild and `scripts/assets/versions.test.ts` fail when it is stale.
- **Race (`src/arena/race-3d.ts`, pure parts in `race-3d-geo.ts` and `race-units.ts`).** A chase camera behind your car (a viewer follows the leader or the car they tapped), a short low photo-finish angle by the line, the lobby's slow orbit round the grid. A unit of the rules is 0.1 m (a car is 40 units, 4 m; the road 18 m between its kerbs). The road is one vertex-coloured ribbon built from the track's points (asphalt, kerbs on the outside of bends, start line, boost pads, shoulders, a bridge's deck); the Kenney barriers, fences, trees and lamps are instanced and only those within 40 m behind and 170 m ahead of the car are drawn; the Kenney cars are baked to one body mesh and four wheels each (the front pair steer from the car's turn, all roll with its speed, the body leans and noses down from its accelerations), with a blob shadow, brake lights, tyre smoke on a slide, dust off the road, a flame on a boost and sparks on a bump. Measured at 4x CPU throttle with four cars: 1.3 ms of script a frame, 39-43 draw calls, 24,000-28,000 triangles. The rules and the snapshot are unchanged (rev 1): everything above is read from the snapshot.
- **HUD over 3D.** `drawRaceHud` in `race-draw.ts` draws place, lap, time, speed, minimap, names, FINISHED, the countdown and GO on the transparent 2D canvas over the 3D one; with no WebGL, or if the models fail, `drawRace` draws everything in 2D as before. `window.allworldRaceStats()` reports frames, median and 95th-percentile frame time, script cost, draw calls, triangles and the pixel ratio (and the followed car) for a measurement run.
- **Orientation.** `RaceGame.vue` measures the HUD and the thumb clusters and passes them as insets; `bandShift` slides the picture so the car and the road ahead sit in what they leave free: portrait keeps the stage tall with the thumbs below it, landscape frames between the two thumb clusters. A resize, `orientationchange` (measured again 250 ms later) and the pad appearing all re-frame at once.
- **Football's camera** (`src/arena/football-3d.ts`) is chosen by the screen's shape: a tall phone sees the pitch end-on from behind its own goal, high, looking up the pitch (your side always attacks up the screen, the same turn of the stick the 2D view uses, `viewRotation`); a wide one sees it from the side (your side attacks to the right). The tall view keeps the pitch's length, where the play is, along the tall screen and the ball inside the band between the bars and the thumb pad (`framing`, tested by projecting the ball for both teams and for the ball near each goal). A goal cuts to a low camera behind the goal line (`behindGoal`), replays the last second of the play from the frames the view kept at 0.62 speed, and then shows the scorer; a shoot-out is seen from behind the shooter (`penaltyCam`), the same for everyone, and the deciding kick slows down. `globalThis.allworldFootballCamera = 'side' | 'end'` forces one camera, for comparing them in screenshots.
- **Football's HUD** is `drawFootballHud` in `football-draw.ts`, drawn on the transparent 2D canvas over the 3D one: the banners, the carrier's arrow and charge ring, team-coloured name tags (positions the view projects), the shoot-out's score row, its aim mark and its dive arrows; with no WebGL, or if the models fail, `drawFootball` and `drawShootout2D` draw everything in 2D.
- **Football's players** are Kenney's blocky people (no skeleton: the clips move their joints), shaded by giving them normals so the one light shades them like the rest. They ship without a goalkeeper dive, so the dive is a roll of the whole body toward the side named; a slide tackle lays the body back. Team 0 wears the green model and team 1 the yellow one, with a ring in the team's colour under each and a tag in the team's colour above (drawn by the 2D HUD from the positions the view projects, so the text stays crisp and costs no draw call).
