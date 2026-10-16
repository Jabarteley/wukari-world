# Board games and the word puzzle

Chess, Weave (word tiles) and Oro (a word a day), added to the table system (`src/tables/**`, `server/growth/tables.ts`).

## Where they are
- **Tables.** `src/tables/derive.ts` adds a chess table at every venue whose scene kind is a park, lounge (buka), rooftop, viewing centre, beach, campus quad, lakeside or the campus, and a Weave table at lounges, rooftops, quads, lakesides and the campus. Landmark scenes (`outcrop`, `tower`) get none: they are at their triangle budget. Table ids are `<venue>-chess` and `<venue>-weave`; existing Lagos tables are unchanged. Server, scenes, HUD chip and share links all read the same function.
- **Phone, Games app.** Oro (daily and practice), and `phone-chess` / `phone-weave`: a private table per player against the house's bots, anywhere, with no venue. It is never listed or watchable by anyone else and is forgotten when empty. Inviting a friend to a game is the existing table share (a venue table); a "Join game" message button is not done.

## Table-system additions (all optional on a rules object, `src/tables/rules.ts`)
`side(move)` (resign, draw offers: any seat, any time, no clock change, not a real move), `clockMs(state)` and `charge(state, seat, elapsedMs)` (a game with its own clock; the server measures the time). A game ended by `resign` or `time` before everyone has moved twice is called off like a forfeit.

## Chess
Standard rules (castling, en passant, promotion with a choice, check, mate, stalemate, threefold repetition, fifty-move rule, insufficient material). Clocks: 5+3, 10+0, or relaxed (3 minutes a move). Draw offers: one pending, three per seat, a bot ignores them. Bot: alpha-beta with quiescence, node budget only (deterministic, no wall clock): easy ~170 nodes, medium 12,000, hard 40,000; about 1 to 3 million nodes a second, so a hard move is about 20 ms (max about 50) on a laptop. The bot runs on the table's host (Node or the Worker) within that budget.

## Weave
13x13 board, 4-fold symmetric premium squares of its own design, 98 tiles (2 blanks), rack of 7, 30-point all-tiles bonus, exchange when the bag has 7, pass, six scoreless turns end the game, the server checks every word against the list. 2-4 players, 120 s a turn, three missed turns forfeit. Tables are in memory only, so the game is synchronous; a persistent mode would need the match state stored per move (rows per move) and a turn-notification path.

## Oro
Same word for everyone each Lagos day, six guesses, hard mode, streaks. The answer is chosen on the server from a salted permutation (the growth salt); responses never carry it before the puzzle ends. A guess in progress is kept in memory only (a restart loses an unfinished puzzle, not a finished one). Stored: `growth.players[id].oro = { stats: { played, won, streak, best, last, dist[6] }, today: { no, guesses, won, hard } }`, written once when a puzzle finishes (one growth-collection transaction, the cost of a finished table game). Word data and licence: `docs/WORDS.md`.

## Rewards
No new faucet. A win against a real player in a free game is paid by the existing table rule (cap four a day, three per pair). A staked game pays no win reward (the pot is the other player's stake). Bot games and Oro pay nothing. Missions: "Win a game of chess" and "Solve today's word" (event `table.played` with `where` flags).

## Stakes

The real-time games (Fight, Race, Football) can be played for the same stakes, and people watching can back a side; same rules and shared day limits: see [CARTRIDGES.md](CARTRIDGES.md#stakes-and-backing).
Optional stakes of **game naira** on a two-player table game: a pot the winner takes, never real money (red line in [REAL-VALUE.md](REAL-VALUE.md#red-lines); the Market's rules in [MARKET.md](MARKET.md) apply to the naira). Pure rules and every sentence: `src/game/table-stakes.ts`; numbers: `TABLE_STAKES` in `src/game/content/growth.ts`; the service: `server/growth/tables.ts`; the life's side: the server-only action `tables.server` in `src/game/systems/growth.ts`. Tests: `src/game/table-stakes.test.ts`, `server/table-stakes.test.ts`.

- **Which games.** Whot, Ayo, chess, penalties and Weave, between exactly two real players (a four-seat Whot or Weave table seats two once it is staked). The list is `TABLE_STAKES.games`: a game of chance is never added to it. No stakes against house bots (`table-start` with bots is refused at a staked table), none on the Phone's tables.
- **Agreement.** `table-stake { stake }` from the first to sit, alone at an open table (0, 100, 500, 1000 or 2000). `table-sit { stake }` names the stake the player saw; a table whose stake is another one refuses the seat (`stake_changed`). Once two players sit, the stake and the game's options cannot change (`stake_locked`). A rematch is a new agreement: the table opens free, and a stake is chosen again by whoever sits first.
- **Who may.** Players who answered "18 or older" (`ctx.checks.adult`, the one home of the age answer: `growth.players[id].consent.age`; not answering, or answering "under 18", is refused with the reason and, in the Tables app, a one-tap "I am 18 or older" that records the same answer as Stay in touch). Not players who have blocked each other, nor two who share a device (copied from `server/business/service.ts`). Within the gift rule's allowance, with ₦1,000 worked for first (`stakeBlock`). At most ₦2,000 a game, ₦5,000 a Lagos day staked between the same two players, ₦10,000 a Lagos day per player. The table tells a player why they cannot sit; the opponent is told only that the other player cannot.
- **Money.** `takeStakes`: one store transaction settles both lives, checks everything again on them, takes both stakes (`tables.server` op `stake`, "Table stake: Whot with Ada") and writes `growth.tables.pots[matchId]` and the day's counts, or changes nothing. `settlePot`, in the transaction that records the result: a win pays the whole pot (op `pot`, "Won the pot: …") and deletes the record; a draw, or a game nobody moved in, refunds both (op `refund`, "Table stake returned: …"; a game nobody moved in also gives the day's limit back); after play began a player who leaves, forfeits or times out has lost. The record is the receipt, so a pot is paid once however often anything is repeated. Start is refused while stakes are being taken (`starting`), so two Starts at once take them once.
- **Restart.** The pot is in the saved record. A match in memory is `owned`; `sweepPots` returns every pot that is not (at start-up before requests, and on a heartbeat after a failed write or a cleared table). A result that cannot be saved also returns both stakes.
- **The gift rule.** A stake is paid from the allowance gifts and shop purchases share (`allowance`, `passedOn`): `state.growth.tables.staked` counts own stakes on a table or lost; a refund or a win takes the own stake back out, so a lost stake alone stays. A win never raises `social.earned`, repays no loan from earnings and so can never be given onward.
- **Words.** "Stake", "play for", "pot", "winner takes the pot", and on every staked table "Play money only — game naira, never real money." Never "bet", "gamble", "earn", "invest" or "profit": a test runs `FORBIDDEN_WORDS` over every sentence a stake can make.

## Sound hook
Boards emit `window` event `jaw:table` with `{ game, event }` (`move`, `capture`, `check`, `castle`, `promote`, `end`, `play`, `bingo`, `exchange`, `pass`, `guess`, `win`, `lose`). No audio is played here.

## Not done
A rematch for the same stake without sitting down again; stakes for three or four players; Ayo / draughts; a "Join game" message button; Oro at a table with friends; Weave persistent (asynchronous) games.
