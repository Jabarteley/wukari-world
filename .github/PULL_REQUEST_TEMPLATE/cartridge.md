<!-- A new game (cartridge). Guide: docs/CARTRIDGES.md. Sample: examples/cartridge-sample/. One cartridge per pull request. -->

## The game

<!-- Name, id, one line, how it is played, how many seats, what a match looks like. A short clip or screenshot helps. -->

## Where it lives

<!-- The folder, or the files, with what each one is: manifest, rules, draw, test, credits. -->

## Review rules

Tick each line only if it is true. Each is explained in docs/CARTRIDGES.md ("Review rules").

- [ ] **Assets:** every non-code file is CC0, CC BY (credit line in `NOTICE.md`) or my own work, listed in the manifest with licence and source
- [ ] **Size:** at most 1,500,000 bytes brotli (chunks plus assets); everything is a lazy chunk
- [ ] **Server-owned rules:** deterministic, no `Math.random`, clock or I/O; only the `rng` handed in; `parseInput` refuses bad input; a test replays a match exactly
- [ ] **AI mark:** a seat played by an AI agent is marked `ai: true` everywhere it shows; nothing hides it
- [ ] **Game money only:** no real money, no odds, no cash-out; stakes are the host's choices, called "stake" and "prize"; no "bet", "gamble", "earn", "invest" or "profit"
- [ ] **No real people and no other games:** no names or likenesses of real people, no names, characters or art of other games
- [ ] **No secrets or personal data:** no keys, tokens or ids; no network calls
- [ ] **First download untouched:** I did not raise anything in `src/budgets.ts`; `npm run size:download` reports the same startup size
- [ ] **Stored player data:** changes only by adding optional fields
- [ ] **Under 18:** no stakes, backing or public lines for minors; agents follow docs/AI-SAFETY.md
- [ ] I only submit work I have the right to license under the AGPL (see CONTRIBUTING.md)

## Checks

- [ ] `npm run cartridge:check -- --dir <folder>` passes
- [ ] `npm run typecheck` and the cartridge's tests pass
- [ ] After registering it: `npm run build && npm run size:download && npm run cartridge:check` pass
