# Agent work record

Compatibility audit of the upstream house-agent and public-romance work against the retention progression authority boundary at `899c6043`.

## Identity

- **Work ID:** `agent-play-integration-20261015`
- **Owner:** `/root/episode_engine`
- **Model / effort:** `gpt-6.1-sol / high`
- **Thread:** `/root/episode_engine`
- **UTC updated:** `2026-10-14T23:13:34Z`
- **Status:** `complete`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** verify that upstream house routines and authenticated agent play cannot mint human-day, rhythm, or season participation while preserving ordinary agent access and public-romance contracts.
- **In scope:** read-only source audit of house actions/runner, execution-origin propagation, life/progression recording, retention routes, host integration and agent routing; focused existing house, agent, romance, registry, and protocol tests.
- **Out of scope:** production edits, test edits, broad suites, builds, distribution artifacts, browser work, deployment, and unrelated acceptance failures.
- **Exclusive file ownership:** `docs/agent-work/agent-play-integration-20261015.md`
- **Input contract:** canonical integration checkout at `899c60439022b2cb7082a1e88c930a3e4c41db36`, including upstream `c921b8d9` house-agent/public-romance work and the uncommitted retention integration.
- **Output contract:** one source-backed compatibility classification, focused test evidence, and actionable defects if found.
- **Dependencies:** parent owns source integration, type checks, builds, and GitHub synchronization.

## Repository state

- **Repo:** JoinAllworld, canonical retention integration checkout.
- **Host:** local.
- **Branch / worktree:** `codex/retention-main-sync`, managed integration worktree.
- **Base:** `899c60439022b2cb7082a1e88c930a3e4c41db36`
- **Current commit:** `899c60439022b2cb7082a1e88c930a3e4c41db36`
- **Dirty status:** dirty with coordinated retention integration and upstream compatibility changes; this audit adds only its owned record.
- **Port/process ownership:** none.

## Progress

### Done and exact evidence

- **House routines cannot enter the life/progression write path.** `server/house/actions.ts` is pure clock-to-slot scheduling. The runner's in-memory `Agent` has no session, life, progression, or wallet. Its heartbeat updates room presence, emits bounded written lines, and may read gist rows; it never calls `ctx.settle`, `ctx.act`, `applyLifeAction`, or a write transaction. See `server/house/runner.ts:69-82`, `server/house/runner.ts:222-245`, and `server/house/runner.ts:391-405`.
- **Both hosts drive house routines through an in-process heartbeat only.** Node emits `heartbeat` in `server/server.ts:772`; the Worker does the same in `deploy/cloudflare-worker.ts:906`; the runner subscribes at `server/house/runner.ts:391`. Public venue lines from AI participants are excluded before the house listener in `server/ws/rooms.ts:987` and again inside the runner at `server/house/runner.ts:372-388`.
- **Agent origin is established at the authenticated MCP boundary.** `server/agents/mcp.ts:78-95` creates the agent request and sets `delegated-agent` for an own-character key or `agent-character` for a separate AI character. The portable request contract states this field is never parsed from HTTP headers or JSON (`server/types.ts:989-995`), and repository search found no other production assignment.
- **Origin follows the complete action transaction.** `server/prepared-city-transaction.ts:28-41` binds the trusted request origin to the stored session before the operation and resets it to `system` in `finally`. Agent `do_action` uses the ordinary `executeCommand` pipeline (`server/agents/tools.ts:103-114`); agent `call_api` derives its request from that same trusted wrapper (`server/agents/tools-more.ts:61-77`).
- **Human-day and rhythm advancement reject agent work.** `applyLifeAction` reads the bound session origin and only attempts `recordHumanDay` after a successful, identified, meaningful action (`server/life-service.ts:168-196`). `recordHumanDay` returns immediately unless origin is exactly `human` and the session is not an agent character (`server/progression.ts:93-113`). Rhythm advancement is nested behind that guard and also requires an already opted-in rhythm.
- **Agents cannot enroll rhythm or season state.** Both mutation routes resolve the authenticated request origin and return `human_required` for delegated agents and agent characters (`server/routes/retention.ts:30-45`, `server/routes/retention.ts:48-80`). Rhythm state is created only inside the guarded rhythm route. Season state is created only by the guarded `join` operation. `noteSeasonDay` returns when no saved enrollment exists (`src/game/season.ts:26-30`).
- **Ordinary agent access remains broad and uses the game's rules.** The action allow-list still comes from the player-action registry and the short deny list remains explicit (`server/agents/access.ts:1-40`). Focused agent tests passed for registry-derived action access, MCP modes and lifecycle, player-facing routes, presence, chat, growth separation, boards, politics, operator controls, privacy, storage compatibility and public pages.
- **Public-romance contracts remain intact.** The four dedicated cases passed: adult/private-contact/day-limit consent flow; addressed consenting adults only; consent never lifts sexual, money, contact, meet-outside, human-claim or link rules; blocking clears consent and a confirmed-adult Bae counts. The broader agent-safety suite also passed its under-18, unanswered-age, direct/public chat, blocking, reporting and suspension cases.
- **Accepted focused test command:**

  ```sh
  node --experimental-strip-types --test --test-concurrency=1 server/house/runner.test.ts server/house/live.test.ts server/agents/agents.test.ts server/agents/agents-open.test.ts server/agents/public-romance.test.ts server/agents/safety.test.ts server/registry.test.ts src/types/protocol.test.ts
  ```

  Result: 74/74 passed in `/tmp/allworld-agent-play-accepted.log` (SHA-256 `ca9b11de93d6ca65f77029b2492703593d00b9a0cf4f9c57884266243ff7e585`). This includes the real-server house lifecycle, complete runner behavior, ordinary agent access, MCP lifecycle and modes, public-romance and wider safety contracts, route/socket registries, typed route/frame coverage, Worker registry parity and protocol wire shapes.
- **Concurrency diagnostic:** an earlier parallel multi-file invocation recorded 64 passes and 10 fixture failures in `/tmp/allworld-agent-play-integration.log`. All ten were confined to the real-server house, registry and protocol fixtures and showed shared-state symptoms such as city-loading `503` responses and an empty cast. Running those three files serially passed 19/19 in `/tmp/allworld-agent-play-sequential.log`, then the complete accepted serial command above passed 74/74. No source change was made.
- **Classification:** compatible. No actionable production defect was found in this bounded audit.

### In progress / blockers

- None for the requested compatibility audit.
- There is no dedicated existing agent test that asserts the three retention refusals and stored progression state in one case. The trusted-origin and mutation guards establish the boundary in source, while the focused suites establish that the surrounding agent and protocol contracts still work. A future regression test would be useful only if the coordinator separately authorizes test additions.

### Immediate resume steps

1. Parent may use this source and focused-test evidence in the integrated acceptance report.
2. Keep registry/protocol/real-house fixture files serialized when combining them manually; use the repository's normal suite orchestration for broader checks.
3. If a later source change moves retention enrollment or human-day recording, re-audit the MCP request origin and `recordHumanDay` guard together.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** parent-owned type checks, builds, broader tests, synchronization, and release decision remain separate.
- **References:** `server/house/actions.ts`, `server/house/runner.ts`, `server/execution-origin.ts`, `server/agents/mcp.ts`, `server/life-service.ts`, `server/progression.ts`, `server/routes/retention.ts`, `server/agents/public-romance.test.ts`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-14T23:13:34Z | `active` | Trusted agent origin and house runner remain outside human progression authority. | Source lines listed above. | Run focused existing tests. |
| 2026-10-14T23:13:34Z | `active` | Concurrent combined run had 10 fixture-state failures while 64 cases passed; the affected three files then passed 19/19 serially. | `/tmp/allworld-agent-play-integration.log`, `/tmp/allworld-agent-play-sequential.log` | Run the complete focused set serially. |
| 2026-10-14T23:13:34Z | `complete` | Complete focused serial run passed 74/74; no compatibility defect. | `/tmp/allworld-agent-play-accepted.log` | Parent acceptance and broader checks. |
