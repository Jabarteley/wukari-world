# FUW acquisition retry — 20 October 2026, 13:27–13:29 UTC

**Still blocked; no FUW geographic data acquired and no playable-campus completion.** This retry uses the existing acquisition tools without rewriting the importer, adding another transfer workflow or fabricating geography. No gameplay/rendering changes were justified by the available data.

Base `feat/fuw-data-transfer` verified at `201634b49985cfd1f8a839cdfb89571537da1ea4`; retry branch `feat/fuw-acquisition-retry`. No previous PR, database, economy, branch inventory, source snapshot or deployment changed.

Fresh, machine-recorded [evidence](evidence/fuw-acquisition-retry-20261020.json) includes original queries, source URLs, timestamps, hashes, attempt histories and observed transport errors:

| Source | Observed result |
| --- | --- |
| Existing `node scripts/wukari/acquire.ts` | Exit 2, campus incomplete; national boundary and metadata succeeded, primary Overpass discovery failed after bounded retries |
| Explicit alternative Overpass (`overpass.private.coffee`) | One 15-second attempt, timeout; no automatic endpoint hopping |
| Geofabrik Nigeria / BBBike | Proxy CONNECT 403, transport code 56; zero downloaded bytes |
| Official OSM capabilities API | HTTP 200; service metadata only, no university location/features |
| geoBoundaries metadata | HTTP 200; administrative source only |
| One Nominatim FUW name lookup | Proxy CONNECT 403 |
| Wikipedia coordinates lookup | Proxy CONNECT 403 |

Connectivity is **partially working**, not unrestricted. HTTP 200 for capabilities or administrative metadata does not supply campus geography. No source-backed university location was obtained, so no campus bounding box was guessed for the official map API. No bulk editing-API extraction, authentication bypass, proxy evasion or repeated requests against unchanged denials were attempted. The existing bounded primary retry and one alternative request were exhausted; further geographic download attempts stopped.

## Coverage and validation

The existing `FUW_COVERAGE_REPORT.md` was regenerated into a separate temporary file and compared byte-for-byte: unchanged, still accurate. It records **zero imported roads, buildings and named landmark records**; campus extent, geographic coverage, pedestrian access/spawn and terrain remain unknown. This is not a zero-percent survey or evidence of absent real-world features. Original source/licensing/hash provenance is preserved.

- Geographic/import/coordinate/transfer tests: 35 passed.
- Source/hash/license verification and coverage reproduction: passed.
- Focused strict TypeScript/Vue checks: passed; no TypeScript/Vue source changed. The five-project whole-project check passed on the unchanged source in Phase 4; it was not unnecessarily repeated here.
- Existing preview build and 18 smoke tests: passed; existing Three.js chunk-size advisory remains.
- Chromium: existing real administrative context rendered, uncertainty/disabled exploration/source selection visible, desktop/mobile without overflow or page errors. No new UI to screenshot; [existing desktop](evidence/phase4-context-only-desktop.png) and [mobile](evidence/phase4-context-only-mobile.png) remain representative.
- Lagos/Abuja integration smoke: 13 checks / 14 requests passed.
- Navigation/collision/gameplay tests: not implemented/run, because no supported navigable FUW geography was acquired. Broad baseline suite remains separately documented in VALIDATION.md; no assertions or budgets were weakened.

Only three files changed: this status, `docs/wukari/evidence/fuw-acquisition-retry-20261020.json`, and `docs/agent-work/fuw-acquisition-retry-20261020.md`. Existing working source and source datasets remain untouched.

Next dependency remains actual access to an authorized FUW extract or a supplied licensed extract via the already implemented DATA_TRANSFER.md route. A subsequent retry requires a meaningful provider/network-policy change; capability-endpoint success alone is insufficient. A safe spawn still requires public-access evidence after acquiring geometry. No further importer/documentation framework is needed before that input.
