# Retention acceptance evidence

The runtime implementation is commit `bcbfd549cb5d4e28b57003ae0eb741708bf81a77`. Combined source `376285c0314dba05e0703a4e43b8666037384c8e` merges upstream `b8e4f8f0` (cache-first UI and model-router settings). The manifest identifies artifact bytes and source provenance; it is not a production-release certificate.

## Final combined-source checks

- `allworld-cache-merge-build.txt`: production build passed, 4312 transformed modules and 284 city content assets. The existing navigation/campus-rules circular-chunk warning remains.
- `allworld-cache-merge-typecheck.txt`: five TypeScript/Vue projects, zero errors.
- `allworld-cache-merge-focused.txt`: 22 existing cache tests passed.
- `allworld-cache-merge-smoke.txt`: 17 smoke checks passed, including every-city startup raw/gzip limits.
- `allworld-cache-merge-startup.txt`: Lagos startup 614596 raw JS, 221567 gzip JS, 194060 Brotli overall; unchanged limits are 615000, 223000, 195600. Overall Brotli includes HTML and CSS; it is not a JS-only number.
- `allworld-cache-merge-size.txt`: all measurable download budgets pass across 284 cities; wardrobe/street-tile patterns with no matching artifact remain unmeasured. Combined source was pushed to GitHub main and remote SHA read back as `376285c0314dba05e0703a4e43b8666037384c8e`.

## Retention implementation checks

These were run before the final cache-first merge. The later upstream diff does not modify their progression, mission, persistence, project or trusted-origin implementations.

- `allworld-main-sync-focused.txt`: 84 existing retention/engine/state tests passed.
- `allworld-agent-play-accepted.txt`: 74 existing agent-play/protocol checks passed, run serially. This proves local contracts, not a production agent session.
- `allworld-mission-host-guard.txt`: 11 mission/browser-profile checks passed.
- `allworld-lazy-readers-check.txt`: 10 mission/event-identity checks passed. The command also named a nonexistent regions file; this is not atlas coverage.
- `allworld-atlas-split-check.txt`: 19 of 20 atlas/registry tests passed. The Antarctica placeholder expectation also fails on clean `94bd77d4`; see `allworld-map-entries-baseline.txt` (3 of 4).
- `allworld-main-sync-progression.txt`: deterministic direct-engine probe for both episodes, choice callbacks, prerequisite, solo finish, duplicate receipts, no-clock reconstruction, pin/plaque and cross-city preservation. This is not an HTTP or full browser playthrough.
- `allworld-main-sync-project-check.txt`: real local HTTP project proofs, owner-role race deduplication, guest uniqueness exclusion, rollback, quiet fallback and once-only memento.
- `allworld-main-sync-cadence-http-check.txt`: local HTTP cadence projection, enrollment rollback/retry, no-login credit, action stamping and opt-out; pure rest/lapse transitions.
- `allworld-main-sync-season-check.txt`: local HTTP enrollment/claim rollback/retry, meaningful-day gate, in-app plan, late join, archived claim, frozen window and travel. Canonical project receipts are seeded to isolate season eligibility.
- `allworld-main-sync-*-final*.txt`: build, typecheck, smoke and full download report for retention before cache-first integration. The earlier startup result was 614255 raw JS / 221428 gzip JS / 194142 Brotli overall.

Counts overlap; do not sum them into a unique total. Synthetic actors and fixtures do not establish human retention lift.

## Browser and remaining gates

[UI evidence](../retention-ui-evidence-2026-10-14/README.md) distinguishes responsive captures, the actual midnight reward rollover, and the latest saved-character reload. Production deployment, physical-phone acceptance and observed cohorts remain separate gates. The daily milestone and rhythm flags default off; the season start defaults unset.

The older-base broad Node run was stopped at the all-city module barrier and is incomplete. Three failures reproduce on clean `8ac05891`. The older Worker sweep is 185/190: four emulator-eviction failures reproduce on baseline; the zero-row invariant fails on both but current four collection writes versus baseline two remains unexplained. See [the Worker finding](../../agent-work/worker-row-budget-20261015.md). These are not waived green checks.

## Historical provenance

The `allworld-integrated-*`, `allworld-progression-acceptance.txt`, registry, phone-art, baseline and poll artifacts retain their original earlier `8ac05891` provenance. Do not present them as runs of the final combined commit. Temporary source probes remain host-local diagnostics, not committed regression fixtures. Recreate or transfer them explicitly if rerunning is necessary.

All archived logs are UTF-8 with LF endings and trailing line whitespace removed. Verify each file against `manifest.json`; a host-local `/tmp` path alone is not portable evidence.
