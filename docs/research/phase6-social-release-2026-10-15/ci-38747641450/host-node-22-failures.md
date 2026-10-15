# `full-node (22, host)` failures — job 116465391673

Observed from the completed GitHub Actions job log for run `38747641450`, exact head `5bb46a442a2b6d1236b988a67d09c653f61ea766`. Summary: 1574 tests; 1566 pass, 5 fail, 3 skipped.

1. `server/new-player.test.ts:9` — `the new-player journey runs to the end with every assertion holding`. Assertion at `scripts/new-player.ts:313:12`: `one of today’s missions can be done: d-local-lagos-tale-life, d-gem, d-local-lagos-tale-social` (expected true).
2. `server/node-city-content.test.ts:12` — `Node host serves a real city life and loads every authenticated payload from the built checkout dist directory`. `deepStrictEqual` mismatch for `accra` at line 51; surfaced difference includes `business.markets.accra-market-game.known.footfall: 1` and Accra starter business data. Full serialized diff omitted.
3. `server/seo.test.ts:15` — `index.html head: one title, one description, a canonical, Open Graph and Twitter tags, robots, icons`. Expected regex `/<noscript>.*Allworld.*Lagos.*<\/noscript>/` did not match generated `index.html`; stack at `server/seo.test.ts:38:10`.
4. `server/seo.test.ts:113` — `the page, the manifest and the readme say which cities are open, and say it the same way`. Actual description was `A digital world to live in. Real-world places to explore: work, travel, make friends and play. Free in your browser, no download.`; expected regex mismatch, assertion at line 118.
5. `server/two-players.test.ts:8` — `the two-player script runs to the end with every assertion holding`. `deepStrictEqual` expected state keys `civic, politics, sessions, social, version, walletEffects`; actual additionally contains `growth`. Stack at `scripts/two-players.ts:510:12`.

