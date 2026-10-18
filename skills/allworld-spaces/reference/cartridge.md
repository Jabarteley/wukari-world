# Making a real-time game (a cartridge)

A cartridge is a game the Allworld server runs live for 2 or more players. It is code, so it goes in by a pull request the owner
reviews. The full guide is `docs/CARTRIDGES.md` in the repository ("Player-made games").

## Lite game or cartridge?

- **Try a lite game first.** If the game can be written as a lite game (`reference/lite-game.md`), make that: it is data, the player
  imports it the same day, and nobody has to review code.
- **Make a cartridge** only when the lite schema cannot express the game: its own physics, its own bot, its own screen.

## The contract in plain words

A game is one object, a `RealtimeRules` (`src/arena/rules.ts`):

- `id` (2-16 lower-case letters), `label`, `hz` (ticks a second, 1-30), `seats` (min and max), `options` (lobby choices, each with
  allowed values and a default).
- `start(seats, rng, options)` makes the first state: plain JSON, whole numbers.
- `parseInput(raw)` turns what a player sent into an input, or throws `ArenaInputError`. Accept only a few small values.
- `idle()` is the input of a seat that sent nothing or left.
- `step(state, inputs, rng)` runs one tick with one input per seat. The same state, inputs and random draws always give the same result.
- `outcome(state)` is `null` until the end, then winners, draw, reason, a sentence with `{0}`, `{1}` for names, scores and `places`.
- `snapshot(state)` is what everyone sees each tick: arrays of small whole numbers, under 300 bytes.
- `bot(state, seat, rng)` plays any seat: alone mode, empty seats, a player who dropped for a moment.
- `forfeit(state, seat)`: the seat left for good; the others play on or win.

The server is the only judge. No `Math.random`, no clock, no network, no files in the rules: randomness only from `rng`.

## The template

Copy `src/arena/examples/coconut.ts` (Coconut Dodge) and `src/arena/examples/coconut.test.ts`. Every contract rule is marked
`CONTRACT:` in the game file. The test file checks input, bots, determinism, snapshot size, bots finishing, forfeits and an exact
replay, and holds a sample cartridge entry.

1. Copy them to `src/arena/<id>.ts` and `src/arena/<id>.test.ts`; change the game.
2. Draw it in `src/arena/<id>-draw.ts` (reads snapshots only) and a lazy screen `src/app/features/arena/<Id>Game.vue` that uses it;
   the replay view uses the same drawing module.
3. Add the entry to `src/arena/cartridges.ts`, the rules to `src/arena/registry.ts` and a card to `src/arena/catalog.ts`.

## The commands

```
node --experimental-strip-types --test src/arena/<id>.test.ts src/arena/cartridge.test.ts
npm run typecheck
npm run build && npm run cartridge:check
```

All must pass before the pull request.

## Pull-request checklist

Open it against `main` of `kromate/joinallworld` with the Cartridge template. Write one line each for:

- [ ] the manifest: the entry chunk (`<Id>Game`), any lazy chunks, every asset with its path
- [ ] `rev` (1 for a new game; raise it whenever `start`, `step` or `bot` change a match)
- [ ] venues and modes (live or planned)
- [ ] the licence of every asset (CC0, CC BY, MIT or your own); CC BY lines also written in `NOTICE.md`
- [ ] the size: at most 1,500,000 bytes brotli, first download unchanged
- [ ] rules deterministic and server-owned; randomness only from `rng`; the test replays a match exactly
- [ ] AI seats always marked as AI
- [ ] game naira only; no betting words, no odds, no fees
- [ ] no real people, no other games' names or art, no secrets or personal data
