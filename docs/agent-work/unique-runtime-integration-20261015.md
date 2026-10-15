# Agent work record

## Identity

- **Work ID:** `unique-runtime-integration-20261015`
- **Owner:** `/root/unique_runtime_integration`
- **Model / effort:** `gpt-5.6-sol / medium`
- **Thread:** delegated worker under retention programme
- **UTC updated:** `2026-10-15T01:39:53Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Add lazy registry-backed factories for accepted bespoke local tales and missions while retaining all legacy definitions and save history.
- **In scope:** central accepted-batch registry (initially empty), episode/mission/journey factories and installers, compatibility filtering for accepted cities, episode proof-start behavior, types needed by those modules, and Vite manual-chunk placement.
- **Out of scope:** authored batch files, content validation/acceptance probes, tests, service/UI/browser work, Git publication, deployment, shared coordination index, rewards/caps/trusted-origin rules.
- **Exclusive file ownership:** `docs/agent-work/unique-runtime-integration-20261015.md`; `src/game/content/local-tales.ts`; `src/game/content/local-episodes.ts`; `src/game/content/local-missions.ts`; `src/game/content/episodes.ts`; `src/game/content/journeys.ts`; `src/game/content/world-missions.ts`; `src/game/systems/episodes.ts`; `src/game/systems/missions.ts`; `src/game/journeys.ts`; `src/types/episodes.ts`; `src/types/journeys.ts`; `vite.config.ts`.
- **Input contract:** source `9b76461af46425d905598a991d95b707db18c9ef`; authored batches remain unaccepted and unimported; `AuthoredContentBatch` contract from `src/types/local-tales.ts`; legacy world-v1 definitions remain canonical.
- **Output contract:** zero accepted batches by default; additive stable authored IDs/collections/missions when the parent later imports whole accepted batches; legacy saved rows remain resolvable; unstarted legacy stories/empty collections are hidden only for accepted cities; cheap TypeScript evidence only.
- **Dependencies:** parent accepts and imports whole-country authored batches later; parent owns validator, acceptance checks, integration, Git and UI verification.

## Repository state

- **Repo:** `kromate/joinallworld`
- **Host:** local Mac
- **Branch / worktree:** `codex/retention-main-sync` at `.codex/worktrees/retention-main-sync/JoinAllworld`
- **Base:** `9b76461af46425d905598a991d95b707db18c9ef`
- **Current commit:** `313e8c266d889194a25c6625449af7c9195520e8`
- **Dirty status:** dirty with this record and the twelve owned runtime/type/chunk files; other agents retain the untracked batch 01/02 records and sources. No batch, schema, validator or test file was edited or imported.
- **Port/process ownership:** none

## Progress

### Done and exact evidence

- Read root instructions, current coordination, parent content contract, technical-autopilot routing/safeguards and source revision — `git rev-parse HEAD` = `9b76461af46425d905598a991d95b707db18c9ef`.
- Added an explicitly empty accepted-batch registry with duplicate/unsupported-city checks and whole-country activation enforcement — `src/game/content/local-tales.ts`.
- Added registry-backed episode and mission factories using existing world seeds for actual hosts, exact activities, venues and NPC greeting proofs — `src/game/content/local-episodes.ts`; `src/game/content/local-missions.ts`.
- Preserved legacy episode/mission lookup while hiding only unstarted generic episodes and retiring only future legacy local deals for accepted cities; started runs, saved rows and pending claims remain valid — `src/game/content/episodes.ts`; `src/game/systems/episodes.ts`; `src/game/systems/missions.ts`; `src/game/content/world-missions.ts`.
- Added separate authored city/country collections; old empty `:local-chapters` collections hide only for accepted identities while started/earned history remains visible — `src/game/content/journeys.ts`; `src/game/journeys.ts`.
- Kept authored content in the lazy progression chunk — `vite.config.ts` manual chunk rule.
- TypeScript verification passed — `npm run typecheck`: 5 projects, 0 errors, 0 baselined JavaScript.
- Empty-registry compatibility probe passed — 570 existing episodes, 528 existing collections, Tokyo legacy collection remains 2 members, and `d-local-tokyo-activity` / `w-local-tokyo-people` still resolve after installation.
- Whitespace verification passed — `git diff --check`.

### In progress / blockers

- Accepted-content behavior is intentionally not exercised in this worker because no batch is accepted or imported; parent owns the prepared temporary acceptance probe after semantic review.

### Immediate resume steps

1. Parent reviews the owned diff and, only after accepting a whole-country batch, adds its explicit import to `ACCEPTED_LOCAL_TALE_BATCHES`.
2. Parent runs the prepared acceptance probe for authored progression/save/agent behavior, then the authorized build/size/smoke/UI gates.

## Release state

- **Local implementation:** `verified-local`
- **Deployment:** `not-requested`
- **Release gate:** parent code review, batch acceptance/imports, validator/probes, build/size/smoke and UI verification.
- **References:** `docs/agent-work/unique-local-content-20261015.md`; `src/types/local-tales.ts`

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| `2026-10-15T01:29:05Z` | `active` | Registered bounded ownership at source `9b76461a`; authored batch files remain foreign and disconnected. | `git status --short`; current coordination and parent record | Implement registry and factories without importing batches. |
| `2026-10-15T01:39:53Z` | `ready-for-review` | Implemented the empty registry overlay, factories, legacy compatibility filters, collection split and lazy chunk routing. | clean `npm run typecheck`; empty-registry compatibility probe; `git diff --check` | Parent review, then accepted-batch probe without changing the empty list beforehand. |
