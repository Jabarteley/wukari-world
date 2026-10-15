# Final focused integration check — 8affbb212333edd61954e5c6ed32e9c30682fe51

Observed 2026-10-15 14:36:28Z UTC. Checkout: `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`, branch `codex/retention-main-sync`, exact HEAD `8affbb212333edd61954e5c6ed32e9c30682fe51`. Parent's residents-everywhere merge: `9321b79e`.

One heavy-lease command ran once with `--test-concurrency=1`, over 17 distinct existing test files: the prior eight-file agent compatibility slice (`server/house/runner.test.ts`, `server/house/live.test.ts`, `server/agents/agents.test.ts`, `server/agents/agents-open.test.ts`, `server/agents/public-romance.test.ts`, `server/agents/safety.test.ts`, `server/registry.test.ts`, `src/types/protocol.test.ts`), all five `server/residents/*.test.ts` files (`bonds`, `everywhere`, `resident`, `roster`, `voice`), and `server/new-player.test.ts`, `server/node-city-content.test.ts`, `server/seo.test.ts`, `server/two-players.test.ts`.

Result: **174 passed, 0 failed, 0 cancelled, 0 skipped**, 27.59 seconds. Full portable log: `focused-tests.log`, SHA-256 `ffb7efb802d3fe4e81b4d5e5e6d3a6a60a3b37e448715f6cfdc6ea699873b722`. The selected house/agent and residents tests exercised their existing in-room presence and agent-room behavior; no source, tests, or product data were edited in this check.

CI evidence is distinct from this local suite:

- CI `38747641450` targeted older SHA `5bb46a442a2b6d1236b988a67d09c653f61ea766`. Parent reports cancelling the run at approximately 14:35Z after both full builds/downloads passed, both Worker suites reproduced nine failures, Node 22 host had five failures, and Node 22 tooling passed. API snapshot after cancellation: run completed `cancelled` at the run level; the job-level snapshot is `ci-38747641450-final-snapshot.json`. Node 22 game was already cancelled at 14:26:18Z; the integration-repairs job had been cancelled at 14:16:15Z. Do not attribute those earlier cancellations to parent. Full exact job states are in the JSON snapshot.
- CI `38752624193` targets this exact `8affbb...` SHA. At 14:36:28Z, `release-policy` passed; `typecheck-fast` and `build-and-smoke-fast` were in progress; broad full, host, Worker, UI, and integration jobs were skipped. Snapshot: `ci-38752624193-snapshot.json`. This was not a terminal CI result.

Workspace status before/after the check: no product/source edits; only this agent record, its evidence, and the previously observed unrelated untracked screenshot are present.
