# Unique content contract audit

## Identity

- **Work ID:** `20261015-unique-content-contract-audit`
- **Owner:** `/root/unique_content_contract_audit`
- **Model / effort:** `GPT-6 Luna / medium requested; actual usage unavailable`
- **Thread:** `unique_content_contract_audit`
- **UTC updated:** `2026-10-15`
- **Status:** `ready-for-review`
- **Work state:** `implementation`

## Goal and boundaries

- **Goal:** Audit how to add two genuinely bespoke city episodes while preserving all 568 shared v1 episode definitions and existing saves/collections.
- **In scope:** Read-only review of episode registry/types/runtime, save sanitization, mission proof vocabulary, journey collections, and related current work records.
- **Out of scope:** Source edits, tests/CI, browser, deployment, Git operations, mission/economy tuning, and country-level story authorship.
- **Exclusive file ownership:** `docs/agent-work/unique-content-contract-audit-20261015.md`
- **Input contract:** Checkout at `c42a4757b5580b7cbeaea095b046a7298c257fc`, branch `codex/retention-main-sync`.
- **Output contract:** Exact source pointers, compatibility hazards, proposed minimum typed bespoke-content contract, and audit probes for the integration owner.
- **Dependencies:** None; integration owner owns all source/contracts.

## Repository state

- **Repo:** `JoinAllworld`, `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`
- **Host:** Local Codex checkout
- **Branch / worktree:** `codex/retention-main-sync`
- **Base:** `c42a4757b5580b7cbeaea095b046a7298c257fc`
- **Current commit:** `c42a4757b5580b7cbeaea095b046a7298c257fc`
- **Dirty status:** Clean at inspection; this record is the only intended change.
- **Port/process ownership:** None; no services used.

## Progress

### Done and exact evidence

- Read `docs/AGENT-COORDINATION.md`, current retention/worldwide progression/worldwide production records, `docs/research/worldwide-journey-pattern-2026-10-14.md`, root agent instructions, and technical-autopilot/model-routing guidance.
- Confirmed `src/game/content/episodes.ts` constructs `EPISODES` as two original Lagos episodes plus `WORLD_STORY_SEEDS.flatMap(worldEpisodes)`; `src/game/content/world-episodes.ts` generates two repeated story structures per city. City seed data varies the host, two activities, and place line, while titles, chapter prose, three choice pattern, challenge pattern, and return structure are largely shared.
- Confirmed `src/game/systems/episodes.ts` scopes authored event observations to the current city and matches actual NPC/activity references. `local-conversation`, `local-practical`, and `local-discovery` are already supported proof sources; activity observations can bind exact `activityId`, `venue`, and `spot`.
- Confirmed saved episode runs in `src/game/systems/episodes.ts` are restored only when `episodeById(id)` still resolves and `sanitizeRun` sees matching episode ID and exact version. Mementos similarly require the exact registered memento/episode/reward IDs and version. Definitions are therefore part of the save compatibility surface.
- Confirmed `src/game/systems/episodes.ts:viewOf` shows current-city definitions plus saved runs from other cities, enabling an additive old-run history path if old definitions remain registered.
- Confirmed `src/game/content/journeys.ts` derives the current city and country `local-chapters` members from the shared first-steps/second-chapter v1 IDs and memento IDs; `src/game/journeys.ts` resolves collection progress from those exact receipts.
- Confirmed `MissionDefinition` in `src/types/content.ts` supports generic registry events, tags, paid actions, venue visits, and exact server-observed `activity` proofs. `src/game/content/world-missions.ts` currently generates repeated activity/visit/NPC mission patterns per city, so locally grounded proof exists but prose and goal structure are still template-derived.
- No source, test, CI, browser, deployment, or Git mutation performed.

### Audit findings and proposed direction

1. Keep all 568 `city-<city>-first-steps` and `city-<city>-second-chapter` v1 definitions and their memento IDs/titles/reward IDs byte-for-byte stable. Do not repurpose those identities or bump their versions. A version bump would cause existing `sanitizeRun` records to be dropped; removing definitions would also make saved runs/mementos unresolvable.
2. Add two new episode IDs per city under a distinct authored namespace/slug and register them alongside the legacy shared v1 set. Widen the episode and memento ID types only as needed. New content should have new memento IDs/reward IDs. Existing runs stay visible in Passport via saved-run projection; new episode availability should not overwrite the existing Tokyo/Japan 2/2 collection or its “Familiar face in Tokyo” title.
3. Leave the current `local-chapters` journey definition and its receipt members unchanged. Add a separate collection identity for bespoke chapters if they need collection recognition; decide explicitly whether it contains the two bespoke mementos only. Never silently replace old members, which would change prior completion counts/titles and make earned Tokyo/Japan 2/2 appear incomplete.
4. Minimum typed authored unit per new episode: stable unique ID and version; country/city/place geography; locally grounded premise; exactly four authored chapter records with distinct title, speaker, and text; three authored approaches, each with its own proof binding and callback; a unique challenged decision with three non-placeholder option IDs/labels and one correct response; a supported finale with a solo route; distinct permanent memento metadata and reward ID. Keep the current generic engine fields (intro, observations, destinations, choices, challenge, finale, recap) but make the per-city content finite authored records rather than invoking `worldEpisodes(seed, second)` for new IDs.
5. Keep each proof pinned to `seed.cityId`, a real venue, stable spot/activity ID, and supported resident/action. NPC intro should reference an existing city regular at its actual venue; activity proof must reference the exact loaded activity. Do not infer a real-world historical claim from guide prose; premise/chapters should be explicitly fictional and locally grounded.
6. Current proof vocabulary is sufficient for this minimum contract: `local-conversation`, `local-practical`, and `local-discovery` with city-qualified real references, plus `quiet-support` finale. New challenge options are authored resolution choices, not new mission rewards or evidence. If a new episode requires a distinct action kind, add a bounded event/proof contract and trusted server emitter; do not accept client-supplied story proof.

### Suggested audit probes

- Coverage manifest: exactly two new episode IDs per each of the 284 supported cities (568 new definitions), zero duplicate episode/memento/reward IDs; all 568 legacy v1 IDs and member references remain present and unchanged.
- Contract fields: four nonempty authored chapter texts per new episode; normalized prose fingerprint must reject identical chapter/choice/challenge/finale text reused across cities, allowing only proper nouns in data fields. Require a short human-reviewed uniqueness note for premise and challenged decision.
- Proof resolution: for every new definition, resolve city/country/place, host NPC and venue, exact activity venue/spot/ID, and finale proof against loaded city modules and current server-observed events. Reject fallback to unrelated city activities or generic labels.
- Branch coverage: each of the three approaches has a unique proof/callback and a distinct challenge/options set; every accepted choice plus solo/quiet finale settles through engine rules. Validate correct option belongs to the authored option list.
- Save compatibility fixture: load a pre-change save with an unstarted, partially completed, and completed old v1 episode; after sanitization each old ID/version/chapter receipts/memento remains identical and playable/readable. Include the exact Tokyo/Japan prior 2/2 receipt state.
- New-save semantics: start/complete both new city episodes, reload, retry duplicate finish/grant, travel away/back, and verify only the new collection changes while old Tokyo/Japan 2/2 and earned titles stay unchanged.
- Mission uniqueness: existing exact activity proofs can support city-local tasks, but audit unique goal semantics and wording beyond substitution of city/venue/activity names. Preserve existing mission receipt IDs/pending claims and reward/cap policy; no new economy semantics are required for story uniqueness.

### In progress / blockers

- No blocker. Parent owns architecture choice and implementation.

### Immediate resume steps

1. Parent reviews this record and picks the additive ID/collection scheme.
2. Content implementation owner adds reviewed per-city authored records and focused coverage probes while retaining legacy definitions.

## Release state

- **Local implementation:** `not-started`
- **Deployment:** `not-requested`
- **Release gate:** This is a read-only audit; it provides no implementation, CI, browser, or runtime acceptance evidence.
- **References:** `src/game/content/episodes.ts`, `src/game/content/world-episodes.ts`, `src/types/episodes.ts`, `src/game/systems/episodes.ts`, `src/game/content/journeys.ts`, `src/game/journeys.ts`, `src/types/content.ts`, `src/game/content/world-missions.ts`, `docs/agent-work/worldwide-progression-20261015.md`, `docs/agent-work/worldwide-production-20261015.md`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15 | ready-for-review | Read-only audit complete; additive compatibility contract and probes recorded | Source pointers in this record; checkout `c42a4757` | Parent chooses ID/collection shape and assigns implementation |
