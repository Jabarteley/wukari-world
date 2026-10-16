# Real-time games (Fight, and the frame for Racing and Football)

Status: phase A. Foundation, invite-link rooms, spectators, rematch, and the first game (Fight) are built. Racing and football are phase B and are added as rules modules without touching the core (see "Adding a game").

## Why not inside the tables service

`server/growth/tables.ts` is turn based and tied to venues: a table belongs to a place, a seat needs your life to be standing there, moves are numbered, a clock runs per move, and results pay rewards and move ratings. A 20 Hz game needs none of that and the turn model would get in the way. So real-time games are a sibling of the tables, not a new table: same shape of contract (pure rules module, server is the judge, registry, thin WebSocket adapter), different engine.

|                | tables (chess, whot, ...)         | arena (fight, race, football)              |
|----------------|-----------------------------------|--------------------------------------------|
| rules contract | `src/tables/rules.ts`             | `src/arena/rules.ts` (`RealtimeRules`)      |
| registry       | `src/tables/games.ts`             | `src/arena/registry.ts`                     |
| host           | `server/growth/tables.ts`         | `server/growth/arena.ts`                    |
| socket module  | `server/ws/tables.ts` (`table-*`) | `server/ws/arena.ts` (`arena-*`)            |
| frames         | `src/types/growth.ts`             | `src/types/arena.ts`                        |
| where you play | a table in a venue                | a private room, joined by link, anywhere    |
| time           | a move, then a move               | a fixed server tick (Fight: 20 Hz)          |

## Node server and Cloudflare Worker

Both hosts build the same socket registry (`buildSocketHandlers` in `server/ws/index.ts`; the Worker imports it, see `deploy/cloudflare-worker.ts`). `server/ws/arena.ts` is registered there, so there is one implementation for both: nothing was reimplemented in `deploy/`. Rooms live in memory of the single Durable Object (one `JoinAllworldState`) like table seats do. A Worker that has nothing pending hibernates and forgets memory; an open room always has a pending timer (the tick timer while playing, the 2 s sweep otherwise), and a pending timer stops hibernation, the same technique the tables use (`ctx.core.hibernates`). Consequences:

- A restart or eviction ends every room (clients get `arena_unknown` on rejoin and show "That game is not on any more"). Nothing is stored, nothing is paid.
- All rooms share one object's CPU. Fight's tick is a few hundred nanoseconds of arithmetic plus one `JSON.stringify` of about 100 bytes, so hundreds of rooms are fine; `TUNING.maxRooms` (300) is the guard. If racing/football need more, the next step is one Durable Object per room (the code derives from the room code) behind the same frames; the rules modules and the client do not change.
- Timing uses `performance.now()`, not `ctx.now()` (which is the test-controlled clock).

## Protocol

Frames (documented in `src/types/arena.ts`, registered in `src/types/protocol.ts`):

- client to server: `arena-create {game, practice?, options?, look?}`, `arena-join {room, look?}`, `arena-watch {room}`, `arena-start {room, bots?}`, `arena-options`, `arena-input {room, i}`, `arena-again`, `arena-leave`.
- server to client: `arena-state` (roster, status, options, result, latest snapshot; sent when something changes, per recipient so `you`/`host` are theirs) and `arena-snap {room, k, s}` (one per tick, identical for everyone).

`arena-join` is idempotent and is also how a dropped socket returns to its seat (same device = same public id = same seat).

## The room

- Code: `g-` plus six characters from an alphabet with no look-alikes (about 8.9e8 values). The code is the invitation; there is no listing of rooms.
- Status: `lobby` (people arrive; the first is the host; full seats start by themselves; the host can start against the computer), `playing`, `over` (result stays; rematch when every person seated asked), `closed`.
- Needs no venue, city or life: only an authenticated socket (a guest session is enough).
- A socket is in one room at a time: creating or joining another leaves the previous one (during a game that is a forfeit).

### Invite links

The share link is `/?table=g-xxxxxx`. It reuses the existing `table` link capture (`captureLink` in `src/quick-start/entry.ts` stores it across the quick start), so a brand-new visitor taps Play now, gets a guest life, and the landing (`src/app/features/landing/landingStore.ts`) recognises the `g-` code and opens the Games app on the room (`open('games', {room})`). `GamesApp.vue` then mounts the Fight screen, which sends `arena-join`. An existing player skips the quick start and lands in the room. If both seats are taken the same link makes the visitor a spectator, so one link serves "play me" and "come and watch". The hub also has a paste box ("Join / Watch") for a link or bare code.

### Spectators

`arena-join` with no free seat, or `arena-watch`, attaches the socket as a watcher: same snapshots and result, input ignored. At most `TUNING.maxWatchers` (20) per room. A late watcher is sent the latest snapshot in `arena-state` so the screen is not blank.

### Rematch, leaving, disconnect

- `arena-again` from every person seated starts the next match (`match` counts up). Bots agree automatically.
- `arena-leave` during a game forfeits (the rules' `forfeit`): the other player wins at once. The empty seat is freed for a newcomer once the game is over.
- A seat whose last socket closed is marked `away`. While playing, the seat's bot steers it for up to `awayForfeitMs` (15 s) and the person takes it back on reconnecting; only then does it forfeit. Otherwise it is released after 30 s. See [CARTRIDGES.md](CARTRIDGES.md) for the cartridge contract, replays and clips.
- A room with no connected socket closes after 60 s; a lobby after 15 min; a finished room after 10 min. The room closes at once when no person is left.

### Anti-abuse

- Create: 8 rooms per player per minute (`ctx.allow`), 300 rooms in all.
- Input: `parseInput` is strict (Fight: an integer 0..4095) and a bad input is dropped silently; per seat a token bucket of 30 burst, 24 per second; inputs from watchers or outside a game are ignored. The host already limits a player to 600 frames a minute and closes the socket beyond that (`server/server.ts`), so clients must send inputs when they CHANGE, not per frame. `InputPipe` (`src/arena/client.ts`) coalesces at most one frame per 60 ms and never loses a tap (taps travel as "pressed since last frame" bits, so releases need not be prompt); held buttons are re-sent every 500 ms so a lost frame heals.
- Names are the session's public name, rendered as text. `look` is four short ids, untrusted, looked up in a palette on the client only.
- Rules can never be driven by the client beyond their own parsed input; every hit is decided in `step`.

## The engine

`src/arena/rules.ts` defines `RealtimeRules<State, Input, Snap>`:

```
id, label, hz (1..30), seats {min,max}, options
start(seats, rng, options) -> State
parseInput(raw) -> Input          // untrusted, throws ArenaInputError
idle() -> Input
reduce?(held, incoming) -> Input  // fold inputs that arrive between ticks (latch taps)
settle?(consumed) -> Input        // what stays pending after a tick (clear latched taps)
step(state, inputs[], rng) -> State  // one tick; may mutate; deterministic
outcome(state) -> Outcome | null  // non-null stops the room's ticking
snapshot(state) -> JSON           // public, compact, same for all
bot(state, seat, rng) -> Input
forfeit(state, seat) -> State
```

The room host (`server/growth/arena.ts`) per tick: gathers one input per seat (bot, held input, or idle for a seat that left), calls `step`, calls `snapshot`, and broadcasts `arena-snap {k, s}` only when the snapshot text changed (plus once a second as a keep-alive). It schedules ticks with drift-corrected timers, catches up at most 4 ticks, and resynchronises rather than replaying a long stall. `TUNING.speed` multiplies the tick rate for tests only.

Randomness comes only from the `rng` the room seeds from `ctx.randomId()`; the same inputs and rng give the same game (tested).

### Client

- `src/arena/client.ts`: the socket (own connection to `/socket`, backoff reconnect, heartbeat-ack for the Worker) and `InputPipe`.
- `src/arena/interp.ts`: `Timeline`, a jitter buffer. It estimates the server clock from the fastest packet, draws a frame for "now minus 2 ticks", always between two snapshots already received, so 20 snapshots a second render smoothly at 60 fps and a late packet costs nothing.
- Game renderers draw with Canvas 2D from procedural shapes (`src/arena/fight-draw.ts`). No assets.
- All of it is a lazy chunk: `GamesApp.vue` loads `features/arena/FightGame.vue` with `defineAsyncComponent`. The startup bundle only gained a regex branch in `landingStore.ts` (itself already a lazy chunk); `src/types/protocol.ts` additions are types and two short name lists no startup module imports.

## Bandwidth on 3G

Fight snapshot (`{p,c,r,w,t,q,f:[[x,y,face,action,at,hp,flags]x2],e:[]}`) is about 100 bytes; the frame with its envelope is 130 to 160 bytes (the server test asserts under 260). At 20 Hz that is at most 3.2 KB/s, about 26 kbit/s downstream, and far less in practice because unchanged ticks are not sent (two standing fighters cost one frame a second). Upstream, inputs are about 40 bytes each at a handful per second. Slow 3G (about 400 kbit/s) has more than ten times the room. Latency, not bandwidth, is the issue: with a 300 ms round trip the player sees their own punch about 400 ms after pressing. Known gap: local prediction of the own fighter's start-up animation.

## Adding a game (Racing, Football)

1. `src/arena/<id>.ts`: default-export a `RealtimeRules`. Pick `hz`; keep `snapshot` under about 300 bytes (arrays and small integers; send positions as whole numbers; put one-off events in the snapshot of the tick they happen and nowhere else). Use `reduce`/`settle` if your input has taps. Put a bot in. Cover it with a stepping test like `src/arena/fight.test.ts` (scripted inputs, a replay for determinism).
2. `src/arena/registry.ts`: import it and add it to `ARENA_GAMES`. That is the only server change: create, join, watch, rematch, forfeit, limits, links work for it unchanged. A game with more than two seats uses `seats {min,max}`; the room starts when full or when the host starts it (`arena-start`, with `bots` to fill with computer players).
3. Client: a renderer `src/arena/<id>-draw.ts` (Canvas 2D) and a screen `src/app/features/arena/<Id>Game.vue` modelled on `FightGame.vue` (it is about 200 lines: socket, `Timeline`, `InputPipe`, canvas loop, lobby/over cards). The lobby, share link, rematch and result cards can be copied; consider extracting them into a shared `RoomShell.vue` when the second game lands.
4. Hub: add a section to `GamesApp.vue` with `openFight`-like entry points. Invite links need nothing new: the `g-` code names a room whatever the game; the room's `state.game` tells the client which screen to mount (today the landing opens the Fight screen; when there are two games, `GamesApp` should switch on `state.game` after the first `arena-state`, or the link should carry the game).
5. Racing specifics worth knowing: all cars in one `State`; `snapshot` should carry positions along the track as one number per car plus lap/finish order; `outcome` returns the finish order in `winners` (first is the winner) and `scores`; a race with a start countdown keeps it inside `step` (see Fight's `intro` phase). Spectators already work for it. Football: ball and players are the snapshot; goals are events.
6. Not supported by the contract on purpose: per-seat hidden information (snapshots are public). Add an optional `view(state, seat)` if a game needs it.

## Tests

- `src/arena/fight.test.ts`: tick-by-tick rules (movement, walls, jump, hit/miss, block, trade, no combos, KO, best of 3, time up, draw, forfeit, determinism, bot, snapshot size).
- `src/arena/interp.test.ts`, `src/arena/client.test.ts`: jitter buffer, input budget.
- `server/arena.test.ts`: real server and sockets: create/join by code, auto start, a whole fight to a result seen identically by a late watcher, rematch, leave and forfeit, reconnect within grace and drop after it, practice room, host-only start/options, limits (unknown game/room, creates per minute, watchers, one room per socket), input flooding, empty-room cleanup.
- `src/types/protocol.test.ts`: the frame lists match the registered handlers.

Run: `node --experimental-strip-types --test src/arena/*.test.ts server/arena.test.ts src/types/protocol.test.ts`.

## Known gaps (phase A)

- No local prediction: the own fighter reacts after a round trip.
- No rating, rewards or missions for fights; nothing is stored.
- No spectator-only link (the shared link seats the first two arrivals; extra visitors watch).
- A guest arriving by link sees the usual quick start first (Play now), then lands in the room.
- Link previews (Open Graph) for `g-` links are the generic ones.
