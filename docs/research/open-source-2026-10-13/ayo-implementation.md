# Ayo implementation

Implemented 13 October 2026 as an original table game inside Allworld’s existing authoritative table service.

## Playable result

- `Ayo` is a two-player table game with an explicit `Oware rules` variant. The board and help text state that Ayo house styles vary.
- The rules use two rows of six cups, four seeds per cup, anticlockwise sowing, origin skipping on every circuit, backward capture from the opponent’s row on two or three seeds, grand-slam cancellation, and must-feed play when the opponent’s row is empty.
- A player wins after capturing more than 24 seeds; 24 each is a draw. Starvation, a third identical board-and-turn position, or 200 turns without a capture ends the game and gives each player the seeds remaining on their own row.
- The server commits a whole move through the existing `TableRules` engine and existing move-number retry boundary. The client receives a plain-JSON replay record for a short sow/capture animation. Reduced-motion clients show the accepted result immediately.
- The deterministic house player scores each legal move by its immediate capture against the opponent’s strongest immediate capturing reply. The search is bounded to at most six moves by six replies.
- The Games Phone app opens a private `phone-ayo` table against a house player. `/games/ayo` resolves to the same table and has Ayo-specific page metadata.
- Lagos has one explicit `park-ayo` table at the park. Ayo was not added to the worldwide derived-table rules.

## Source changed

- Rules and registry: `src/tables/ayo.ts`, `src/tables/games.ts`, `src/tables/howto.ts`, `src/tables/places.ts`, `src/tables/city-places.ts`, `src/types/growth.ts`.
- Server integration: `server/growth/tables.ts`.
- Board and table UI: `src/app/features/tables/AyoBoard.vue`, `src/app/features/tables/TablesApp.vue`, `src/app/features/tables/tablesBoundary.ts`.
- Games entry and short address: `src/app/features/games/GamesApp.vue`, `src/paths.ts`, `src/app/features/start/pathIntroModel.ts`, `server/path-meta.ts`.

The existing passive `play-ayo` activity, starter goals, result-claim transaction, rewards, mission semantics, ratings, and financial rules were not changed.

## Non-UI verification

- A temporary Node probe exercised opening seed conservation, immutable application, origin skipping across multiple laps, backward multi-cup capture, grand-slam cancellation, must-feed legality, repetition collection, the 200-turn bound, rejected wrong-turn and malformed-cup moves, and a complete deterministic bot-versus-bot game. All checks passed; the sampled game ended by starvation after 162 turns with all 48 seeds conserved.
- Vue SFC parsing and compilation succeeded for `AyoBoard.vue`, `TablesApp.vue`, and `GamesApp.vue`.
- A route probe confirmed `/games/ayo` parses as the Ayo game, maps to `phone-ayo`, remains canonical, indexable, and carries Ayo metadata.
- `git diff --check` passed.

## Remaining acceptance

- Browser acceptance is owned by the parent task: Phone Games → Ayo → Play the computer, one accepted human sow, the house reply, legal-cup and capture presentation, reduced-motion behavior, and the physical `park-ayo` entry.
- The parent task also owns the repository’s baseline-aware full typecheck and build. No service was started or restarted for this implementation pass.

## Parent integration checkpoint

See [TESTING.md](TESTING.md) for the verified browser journeys and final integration checks. Full typecheck is clean and the production build passes with the documented heap setting. Existing source changes in `characters.ts` remain preserved.
