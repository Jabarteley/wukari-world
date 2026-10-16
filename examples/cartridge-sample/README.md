# Sample cartridge: Tug

The smallest complete cartridge: the files an outside builder submits. Read [docs/CARTRIDGES.md](../../docs/CARTRIDGES.md) first.

| File | What it is | On acceptance it goes to |
| --- | --- | --- |
| `cartridge.ts` | The manifest: id, modes, what it reads and writes, the lazy chunk, every asset with its licence | `src/arena/cartridges.ts` (one entry) |
| `rules.ts` | The server-owned deterministic rules (`RealtimeRules`, 20 Hz) | `src/arena/<id>.ts`, listed in `src/arena/registry.ts` |
| `draw.ts` | A plain 2D draw of one snapshot, used by the screen and the replay | `src/arena/<id>-draw.ts` |
| `rules.test.ts` | Determinism, exact replay, bad input, a small snapshot | next to the rules |
| `NOTICE.md` | The credit line of every asset | the repository's `NOTICE.md` (CC BY lines only) |
| `assets/` | The files the game loads | `public/assets/<id>/` |

Not here, and not needed to try the checker: the Vue screen (`src/app/features/arena/<Id>Game.vue`) and its card in `src/arena/catalog.ts`. A
maintainer helps with those on the pull request.

This folder is not registered, never built into the game and adds nothing to the first download.

```
npm run cartridge:check -- --dir examples/cartridge-sample
node --experimental-strip-types --test examples/cartridge-sample/rules.test.ts
```
