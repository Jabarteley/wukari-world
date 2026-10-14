# Worldwide city progression seed coverage

- Work ID: `world-city-coverage-20261015`
- Owner: `/root/world_city_coverage`, bounded city progression seed generator/data lane.
- Status: active — generator milestone complete; running a bounded direct-engine acceptance probe for parent-owned episode wiring.
- Canonical checkout: `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`, branch `codex/retention-main-sync`.
- Base: `c0d77b94c5ca102470527014291e1942286957a8`.
- Source type contract: `src/types/world-progression.ts`, supplied by the integration owner in the dirty working tree.

## Scope and ownership

Own only `scripts/city/build-progression-content.ts`, `src/game/content/world-progression.generated.ts`, this record, and `docs/research/worldwide-progression-2026-10-15/coverage.json`. Generate finite `WorldStorySeed[]` data for every open city module. Do not edit shared engine/types/UI, tests, or other coordination records.

For every city, load its rules and content serially. Use actual country IDs (normalize `nigeria` to `ng`), actual public venue/regular/activity IDs and labels. Select a regular at an always-open public venue and two distinct zero-cost, positive-duration unconditional activities at public always-open venues, preferring separate venues and non-medical/non-job/non-purchase/non-faith activities. Include the existing guide line or venue prose. Never invent an action when source content has no eligible candidate; stop and report the first city that lacks the required pair.

## Acceptance and output contract

- Deterministic `--check` compares expected generated text without writing; default execution writes the generated source and coverage evidence.
- Exactly one explicit seed per `playableCityIds()` entry; reserved closed cities are excluded.
- Validate city/country identity, host venue/regular references, activity venue/spot/activity references, required eligibility, unique seed IDs, and total counts.
- Coverage JSON records the source HEAD, open/reserved/loadable counts, country/territory IDs and identity count, and one full selection row per city.
- Generated source imports only the `WorldStorySeed` type.

## Repository state and resources

- Checkout: `/Users/anthonyakpan/.codex/worktrees/retention-main-sync/JoinAllworld`.
- Observed branch/SHA: `codex/retention-main-sync` / `c0d77b94`.
- Dirty state at registration: parent-owned `docs/AGENT-COORDINATION.md`, `docs/agent-work/worldwide-progression-20261015.md`, and `src/types/world-progression.ts`. Preserve them.
- No ports or processes owned.
- No tests, builds, browser sessions, or Git mutations in this lane.

## Progress

### Done and exact evidence

- Read current coordination section and parent-owned progression record; inspected the frozen seed interface and city registry/content builder APIs.
- Added a serial city-content selector and deterministic `--check` mode in `scripts/city/build-progression-content.ts`.
- Generated 284 explicit seeds covering 284 open/playable/loadable modules and contents across 243 authoritative country IDs. Zero cities lacked the required host/activity selections; all activity/host references and unique city IDs validate in the generator.
- Wrote per-city module/content-entry/seed hashes and full selected seed rows to `docs/research/worldwide-progression-2026-10-15/coverage.json`. The report records 0 closed catalogue rows and 0 effective exclusions. `RESERVED_CITIES` still declares `kaduna`, but the same ID is open and playable in the generated index at the recorded source revision.
- Exact check: `node --experimental-strip-types scripts/city/build-progression-content.ts --check` — PASS, 284 cities and 243 authoritative country IDs.

### In progress / blockers

- None in the owned generator/data scope. Parent integration remains separate.

### Immediate next steps

1. Parent may import the type-only generated seed catalogue and integrate it into the episode factory.
2. If city source content changes, rerun the generator and its deterministic check to refresh the coverage source hashes.

## Release state

- Local implementation: verified-local.
- Deployment: not-requested.
- Release gate: integration and runtime acceptance are owned by `/root`.

## Checkpoint history

| UTC | Status | Change or finding | Evidence | Next step |
|---|---|---|---|---|
| 2026-10-15 | active | Registered bounded generator/data ownership after source audit | `c0d77b94`; `src/types/world-progression.ts` | Confirm selectors and implement |
| 2026-10-15 | complete | Generated and checked explicit seed data for all 284 playable cities | `scripts/city/build-progression-content.ts --check`; `docs/research/worldwide-progression-2026-10-15/coverage.json` | Parent integration |

## Direct-engine acceptance follow-on

- Follow-on owner: `/root/world_city_coverage`; owned files are limited to this record and `docs/research/worldwide-progression-2026-10-15/engine-acceptance.json`. Temporary probe/log: `/tmp/allworld-world-progression-acceptance.ts` and `/tmp/allworld-world-progression-acceptance.log`.
- Observed source remains `c0d77b94`; parent-owned dirty episode/type/content files expose `worldEpisodes`, `episodesForCity`, `emit`, and the `episodes.*` actions. The generated seed catalogue is wired through `src/game/content/episodes.ts`. No source edits are assigned here.
- Acceptance target: all 284 cities × two episodes × three choices = 1,704 direct-engine completion paths, emitting actual proof-shaped events through `src/game/registry.ts`; plus wrong-city proof rejection, prerequisite refusal, finish idempotency, save/reload, and representative delegated-agent assistance.
- Scope boundary: a direct-engine fixture demonstrates rule wiring and persisted receipts. It does not establish real activity execution, HTTP/UI path, production behavior, or human playthrough.
- No tests, builds, browser sessions, network/account activity, or Git mutations are authorized in this follow-on.
