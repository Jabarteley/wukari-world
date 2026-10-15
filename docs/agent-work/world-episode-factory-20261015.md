# World episode content factory

## Identity

- **Work ID:** `world-episode-factory-20261015`
- **Owner:** `/root/world_progression_audit`
- **Model / effort:** `not exposed by execution host / low`
- **Thread:** `/root/world_progression_audit`
- **UTC updated:** `2026-10-14T23:54:55Z`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Produce city-grounded story definitions and city-scoped mission content from the frozen `WorldStorySeed` contract.
- **In scope:** `src/game/content/world-episodes.ts`, `src/game/content/world-missions.ts`, this record, and cheap source import/construction checks.
- **Out of scope:** Shared types, runtime engine/registry implementation, city seed selection, mission selector integration, journey/UI integration, tests/build/browser, Git mutations.
- **Exclusive file ownership:** `src/game/content/world-episodes.ts`, `src/game/content/world-missions.ts`, `docs/agent-work/world-episode-factory-20261015.md`.
- **Input contract:** `src/types/world-progression.ts` `WorldStorySeed`; parent-owned `EpisodeDefinition` and `MissionDefinition` extensions.
- **Output contract:** `worldEpisodes(seed)` returns two locally grounded definitions; mission exports provide three daily and weekly rows per non-Lagos city and an explicit install function.
- **Dependencies:** Parent-owned episode and mission types, proof observation support, episode engine and mission registry.

## Repository state

- **Repo:** JoinAllworld, `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`.
- **Host:** local.
- **Branch / worktree:** `codex/retention-main-sync`.
- **Base:** `c0d77b94c5ca102470527014291e1942286957a8`.
- **Current commit:** `c0d77b94c5ca102470527014291e1942286957a8`.
- **Dirty status:** Parent-owned `docs/AGENT-COORDINATION.md`, `docs/agent-work/worldwide-progression-20261015.md`, and `src/types/world-progression.ts` are already dirty/untracked. Preserve them.
- **Port/process ownership:** none.

## Progress

### Done and exact evidence

- Read `AGENTS.md`, the current coordination index, the worldwide progression owner record, and the frozen `WorldStorySeed` type.
- Implemented `worldEpisodes(seed)` with the exact stable IDs, prerequisite, two distinct four-chapter narrative patterns, the three non-student choice routes, proof links, authored challenges and explicitly fictional mementos.
- Kept the factory isolated from `content/episodes.ts`; only type imports are used.
- Parent-owned episode unions and optional activity observation venue arrived in the shared tree before validation.
- Cheap runtime import/construction check passed against the generated source seeds: `node --experimental-strip-types --input-type=module -e '…'` printed `constructed 568 stories for 284 cities`.

### In progress / blockers

- Type-level checks, engine observation behavior and city-reference validation remain parent integration work; no tests or builds were run for this bounded content task.

### Immediate resume steps

1. Review `src/game/content/world-episodes.ts` against the final parent type and engine changes.
2. Validate every factory definition against the city seed references in the parent-owned coverage pass.

## Release state

- **Local implementation:** `verified-local` (construction/import scope only).
- **Deployment:** `not-requested`.
- **Release gate:** Parent integration and city-reference validation remain separate.
- **References:** `src/types/world-progression.ts`, `src/types/episodes.ts`, `src/game/content/episodes.ts`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-14T23:54:55Z | ready-for-review | Factory built and imported across all generated city seeds; 568 story definitions constructed. | `src/game/content/world-episodes.ts`; runtime import/construction check | Parent reviews and runs catalogue/reference integration checks. |

## Next bounded module: city mission catalogues

- **Work ID:** `world-mission-factory-20261015` (same owner and checkout; appended checkpoint)
- **Status:** `ready-for-review`.
- **Goal:** Produce three city-scoped daily and weekly missions for each non-Lagos generated seed, with Lagos content untouched and explicit opt-in registration.
- **Exclusive source ownership:** `src/game/content/world-missions.ts`; this record remains the only documentation file owned here.
- **Input contract:** `WORLD_STORY_SEEDS`; parent-owned `MissionDefinition` extensions and `registerMissionDefinitions(daily, weekly)`.
- **Output contract:** `WORLD_DAILY_MISSIONS` and `WORLD_WEEKLY_MISSIONS`, each with 849 rows (283 non-Lagos cities × 3), plus `installWorldMissions()` that only registers when called.
- **Current dirty state:** Parent and other workers have independent edits in coordination, episode types/engine/content, city coverage, generated seeds, and the progression generator. Preserve them; this module is the sole source write.
- **Validation:** With parent-owned mission type/registry wiring visible, a cheap Node source import checked 849 daily and 849 weekly rows for 283 non-Lagos cities, one row per kind and city; weekly venue discovery has `fresh: true`, `count: 3`, and no `venueId`. Import alone did not register rows; explicit `installWorldMissions()` registered the Ibadan rows in the disposable check process. No tests, builds, browser or Git operations.
- **Next step:** Parent reviews and integrates these catalogues with the world mission selector.

| 2026-10-14T23:57:04Z | ready-for-review | Added per-city mission rows without changing the Lagos catalogue; verified expected counts and opt-in registration in a disposable Node process. | `src/game/content/world-missions.ts`; import/count/registration check | Parent review and selector integration. |

## Direct-engine world mission acceptance

- **Work ID:** `world-mission-acceptance-20261015` (same owner and checkout; bounded diagnostic)
- **Status:** `ready-for-review`; no source or tracked-test edits.
- **Evidence:** `docs/research/worldwide-progression-2026-10-15/mission-acceptance.json` contains the exact per-city proof, checksums, environment, and dirty-scope snapshot.
- **Source revision:** `64155f399ec79ac7f7b550325a5024c60fbf80fa` (`codex/retention-main-sync`); Node.js `v24.14.1`.
- **Probe:** temporary `/tmp/mission-acceptance.mjs`, invoked with `node --experimental-strip-types /tmp/mission-acceptance.mjs`; all 283 non-Lagos seeds passed. It loaded all 284 city content packs and emitted engine registry events with `executionOrigin: 'human'` and the documented server event payload shapes. This is an engine fixture, not full player action/UI or server delivery verification.
- **Evidence counts:** 849 world daily + 849 world weekly definitions; each exercised city selected exactly one life, discovery, and social mission for both periods; the discovery was city-local. Each city had at least 20 actual local regulars and 12 venues. Two deal outcomes selected `event.attended`, both in cities with calendars; no calendar-less city received that requirement.
- **Assertions passed per city:** wrong activity, wrong venue, and foreign-city context did not advance local proofs; exact configured activity, venue and distinct local-NPC proofs did. Repeated NPC and previously visited place did not inflate counts. Three different venues and two/four unique actual residents reached their configured thresholds. Six pending rewards had frozen cash 3×₦250 and 3×₦1,000; duplicate claim attempts were refused and cash increased by exactly the existing ₦750 daily / ₦3,000 weekly ceilings. Completed entitlements survived rollover/reload. An incomplete city-A row stayed at zero after a city-B persisted move and foreign event; an already-earned city-A reward survived reload, remained claimable in city B, and retry was refused. Raw lives with only new local mission IDs required full progression rules, and an existing `d-meal` pending entitlement survived load/reload.
- **Limits:** Cross-city movement was represented with a persisted city change, not a played travel action; full human gameplay, UI navigation and host/server delivery remain separate integration checks. No test, build, browser or Git mutation was run.

| 2026-10-15T00:02:52Z | ready-for-review | Direct engine acceptance completed for all 283 non-Lagos mission catalogues with scoped negative controls, rollover/reload, cross-city pending rewards, single-use claims and unchanged v1 cash ceilings. | `docs/research/worldwide-progression-2026-10-15/mission-acceptance.json`; temporary `/tmp/mission-acceptance.mjs` | Parent reviews JSON evidence and performs remaining integration checks. |
