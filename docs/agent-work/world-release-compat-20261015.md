# Agent-play release compatibility audit

## Identity

- **Work ID:** `world-release-compat-20261015`
- **Owner:** `/root/world_release_compat`
- **Model / effort:** `requested gpt-6-luna / medium; actual provider usage unavailable`
- **Thread:** `/root/world_release_compat`
- **UTC updated:** `2026-10-15T00:55:22Z`
- **Status:** `complete`
- **Work state:** `deployment`

## Goal and boundaries

- **Goal:** Assess compatibility between worldwide progression on current main and the separate, unfinished Phase 11 agent-play branch.
- **In scope:** Read-only source and branch-contract comparison plus the assigned focused tests; record findings and deployment considerations.
- **Out of scope:** Source/test edits, branch integration, Git mutation, deployment, browser/UI work, service lifecycle, and nested agents.
- **Exclusive file ownership:** `docs/agent-work/world-release-compat-20261015.md`, `docs/research/worldwide-production-2026-10-15/agent-compat.log`
- **Input contract:** Current checkout `abec6f54ba42f1d9d2afb55c053019bc1b3b9567`; inspect available `origin/claude/alive-p11-missions` without merging.
- **Output contract:** Factual compatibility classification, focused test result, risks, and release considerations for the parent.
- **Dependencies:** Parent owns release, deployment, and interactive verification.

## Repository state

- **Repo:** JoinAllworld
- **Host:** local
- **Branch / worktree:** `codex/retention-main-sync`, managed integration worktree
- **Current main:** `ac407c2c251c196e3539885d23df0143ac67bd51`
- **Compared branch:** remote `claude/alive-p11-missions` freshly verified at `c4d157d66f47922ac924a43f22c8c86617cea048`; common base with current main `c4e93ee73c9114b0e26adfde18844c6a91f6ed07`. The branch was fetched to its remote-tracking ref only; no merge or checkout.
- **Dirty status:** Only the two owned audit artifacts were added; another concurrent parent-owned record appeared during the audit and was preserved.
- **Port/process ownership:** none

## Findings

### Compatibility classification: current main is compatible with existing agent play

- The assigned serial command passed **40/40** on current main. The durable log is [`agent-compat.log`](../research/worldwide-production-2026-10-15/agent-compat.log), SHA-256 `4b4674f1654009ed21681b1c140e8504cd6688871e78f6cf05233aa7e4223e48`.
- Current main's progression expansion adds city-local mission definitions, stories, and durable journeys while preserving the existing action origin and reward interfaces. Runtime agent access is derived from the action registry and excludes `serverOnly` actions (`server/agents/access.ts:36-40`). MCP binds `delegated-agent` or `agent-character` as trusted execution origin (`server/agents/mcp.ts:79-93`); `recordHumanDay` explicitly returns for either origin and for agent-character sessions (`server/progression.ts:93-95`). The existing server-only action boundary, route/socket registries, idempotent receipts, saved-life shape, and Worker portability passed their assigned focused cases.
- Phase 11's latest remote branch is based on `c4e93ee7`, and `6e5f4fd8` (worldwide progression runtime) is an ancestor of the branch. From that common base, current main changes no overlapping game/server source contracts; the main-side source change is confined to `src/app/features/start/CreatorApp.vue`. The main-side docs/evidence additions do not overlap the branch's source paths. No shared source-contract conflict is identified by this ancestry/path comparison. The new Phase 11 feature still needs its own review and focused checks; this is not an integration acceptance.

### Phase 11 remains outside release acceptance

- `AGENT.md` records Phase 11 as being built. The branch is not merged or qualified by this audit. Current main does not expose agent errands or held-quote purchases; deploying current main releases the worldwide progression only.
- The branch extends `src/game/systems/missions.ts`, `src/types/life.ts`, `src/types/actions.ts`, and house-agent routing. It adds optional `missions.agent` / `missions.deal` fields, allows the new `missions.server` action only through server-side registration, and keeps existing daily/weekly mission pools. Its desk reads the settled person's life and refuses `session.agent`, while the new mission state enforces its own task/reward limits. These are promising compatibility boundaries, but they are source-review observations on unmerged code, not accepted feature evidence.
- Phase 11 branch is behind current main in documentation/evidence. Refresh it from current main and review shared documentation during later integration. Do not treat the branch's own tests or status as a release result from this audit.
- The specified 40 tests run against current main only. They do not include Phase 11's new `agent-missions`, `errands`, `desk`, `runner` changes or its end-to-end house mission test. Phase 11 needs its own review and focused checks on the refreshed integrated source before release.

## Progress and evidence

- Read `AGENTS.md`, `AGENT.md`, `docs/AGENT-COORDINATION.md`, `docs/agent-plans/world-alive/README.md`, `STATUS.md`, `PHASES.md`, `docs/agent-work/agent-play-integration-20261015.md`, and the model-routing reference.
- Focused command: `node --experimental-strip-types --test --test-concurrency=1 server/agents/agents.test.ts server/agents/agents-open.test.ts server/registry.test.ts` — **40 passed, 0 failed**, exit 0.
- Initial source comparison: `HEAD=abec6f54`; Phase 11 ref `5120eb05`; common ancestor `c4e93ee7`.
- Fresh remote check at `2026-10-15T00:55:22Z`: `git ls-remote` returned `c4d157d66f47922ac924a43f22c8c86617cea048`; fetched only that remote branch ref. Current main is `ac407c2c251c196e3539885d23df0143ac67bd51`; common base remains `c4e93ee73c9114b0e26adfde18844c6a91f6ed07`. `git merge-base --is-ancestor 6e5f4fd824318fd9baf524cdfabbe828631688ab <fresh-branch>` succeeded. No merge or checkout.
- Cost and token usage: unknown; unavailable in tool output.

## Live smoke follow-up

After the release owner confirmed public health had adopted the target, the authorized canonical live smoke passed:

- Command: `SMOKE_CITIES=lagos,tokyo,accra,nairobi,suva node --experimental-strip-types scripts/smoke.ts https://joinallworld.com`.
- Health build: `joinallworld-abec6f54ba42f1d9d2afb55c053`; exit 0; 16 checks passed; 1,992 requests; 223.5 seconds.
- Five synthetic life fixtures loaded Lagos, Tokyo, Accra, Nairobi and Suva. Pulse reported 284 cities. The smoke fetched 1,910 files across all 284 open-city chunks. Socket pulse, private Weave and harmless spot action/replay passed.
- Full output: [`live-smoke.log`](../research/worldwide-production-2026-10-15/live-smoke.log).
- Scope: release health and runtime smoke only. This does not establish actual non-Lagos progression play; Astra owns that separately.

## Release state

- **Local implementation:** `verified-local` for the assigned existing agent compatibility subset.
- **Deployment:** Parent-owned release completed; assigned live smoke verified.
- **Release gate:** This audit supports current-main worldwide progression release independent of Phase 11. It does not approve or block current-main worldwide progression on Phase 11 grounds. New agent missions require separate branch review, focused tests, integrated progression coverage, and normal release verification.
- **References:** `AGENT.md`, `docs/agent-plans/world-alive/STATUS.md`, `docs/agent-plans/world-alive/PHASES.md`, `docs/agent-work/agent-play-integration-20261015.md`, `docs/research/worldwide-production-2026-10-15/agent-compat.log`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15T00:36:41Z | `complete` | Existing agent compatibility on current main passes 40/40; Phase 11 source is based on the same source revision and remains unmerged/unqualified. | Focused log and read-only branch comparison | Parent performs current-main release and separate live/UI verification. |
| 2026-10-15T00:50:49Z | `complete` | Canonical public smoke passed 16/16 after health adopted `abec6f54`; five city fixtures and all 284 city chunks verified. | `docs/research/worldwide-production-2026-10-15/live-smoke.log` | Astra's actual non-Lagos progression playthrough remains separate. |
| 2026-10-15T00:55:22Z | `complete` | Fresh remote Phase 11 ref is `c4d157d6`, contains worldwide progression `6e5f4fd8` as an ancestor, and has no identified overlapping source contract changes against current main. | `git ls-remote`, ref-only fetch, ancestry and changed-path comparison | Phase 11 still requires separate feature review and checks. |
