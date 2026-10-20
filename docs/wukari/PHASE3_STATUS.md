# Phase 3 delivery and geographic coverage

Branch: `feat/wukari-audit-offline-import`, based on verified Phase 2 head `fe29b65daf43c100c42377b8b44714c7f5afc7a8`. Review: [draft PR #3](https://github.com/Jabarteley/wukari-world/pull/3), stacked onto `feat/fuw-campus-map` so PR #1/#2 diffs remain unchanged. Source checkpoint `57848f4ea` is pushed. No merge, deployment, branch deletion, PostgreSQL, dependency manifest or game/multiplayer change.

## Delivered

- [Complete branch audit](BRANCH_AUDIT.md): 608 remote heads, exact upstream-tip comparison, reachability evidence and full CSV/JSON/Markdown inventories. 276 proposed safe deletions; 328 branches retain unique work and require review; four active/retained heads. No protection/rulesets reported at audit time. Candidate list is **not approved**.
- Reproducible read-only audit and guarded cleanup command; all 276 candidates passed a live **dry run**. Five mocked safety tests exercise execution gating, changed SHA/protection/PR/rules, preservation and atomic SHA lease.
- [Offline import](OFFLINE_IMPORT.md): source SHA/license/attribution/date/scope gate, XML and OSM JSON, exact raw-byte preservation, original IDs/tags, deduplication, malformed geometry and complete segment/boundary checks, explicit missing reference/relation counts and coverage/provenance outputs. Structured CLI errors and no source/output overwrite.
- Offline preview mode reads a fixed local cache directory. Existing boundary-context and explicitly synthetic foundation modes remain separate. No synthetic fallback; current map still shows the actual administrative context. Uncertainty wording now remains visible even if a campus candidate is imported.

## Geographic completeness

| Layer | Current source coverage | Uncertainty / next input |
| --- | --- | --- |
| Wukari LGA | Pinned geoBoundaries ADM2 polygon, original IDs/coordinates, CC BY 4.0 | Administrative context only; not town/campus boundary or field verification |
| FUW boundary | Unavailable | Need source-backed named university way or supported multipolygon, then corroboration |
| Roads / footpaths / gates | Unavailable | Need attributed OSM ways/nodes, public-access review and connectivity |
| Buildings / hostels / sports areas | Unavailable | Need actual footprints/tags; unknown names/heights must remain unknown or explicitly estimated |
| Elevation | Unavailable | Need licensed DEM and vertical reference; flat preview is not terrain |
| Wukari town | Unavailable | Existing shared coordinate/tile-address contracts only |
| Navigation / character / collisions / minimap | Not implemented | Requires usable reviewed campus floor/geometry and a legitimate spawn |

**Real FUW campus acceptance criteria are not met.** Zero campus features were acquired and zero features are field-verified. This is a validated import/safety milestone, not a completed campus. The source-only LGA renderer and screenshots must not be advertised as a campus model.

Network improvements and blockers are detailed in OFFLINE_IMPORT.md. Official OSM capabilities now work; name discovery/Overpass/candidate extract access still failed. No campus coordinates, roads or buildings were guessed. Existing acquisition receipts, retries, license pins and failed response history are unchanged.

## Validation

| Check | Result |
| --- | --- |
| `node --test src/wukari/*.test.ts` | 27 passed, zero failed/skipped: 20 existing geographic/acquisition/tile tests + 7 offline tests |
| `python3 scripts/wukari/branches_test.py` | 5 passed; mocked Git/GitHub only |
| Cleanup against candidate list | 276 dry-run results, zero deletions; journal committed |
| `node scripts/wukari/verify-boundary.ts` | Passed source/hash/license/provenance, Taraba membership and honest context coverage |
| Focused strict TypeScript/Vue check | Passed |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run typecheck` | Five projects clean, zero TypeScript/Vue errors |
| `npx --no-install vite build --config scripts/wukari/preview.config.ts` | Passed; existing Three.js chunk-size advisory remains |
| `npm run test:smoke` | 18 passed |
| Lagos/Abuja runtime smoke on existing dev server | 13 checks / 14 requests passed |
| Chromium desktop/mobile | Real administrative polygon rendered; source selection, visible uncertainty, no horizontal overflow or page errors |
| Offline-mode Chromium | Cached real boundary context rendered; dataset/coverage/provenance return 200, POST returns 405; no page errors |
| Invalid offline CLI input | Exit 1 with structured failure JSON; no output directory created |
| Broad `npm run check` baseline | Earlier full run is still incomplete and already failing; no duplicate full run started. Known unrelated failures remain separately listed in VALIDATION.md |

The broad-suite baseline includes asset/Worker budgets, legacy appearance and gameplay/UI failures. No limits or assertions were weakened. The new campus navigation/geometry gameplay checks remain unavailable because those systems were not implemented without source geography. PBF conversion is documented but not tested against a real extract; XML/JSON import tests do not establish external source authenticity.

Screenshots (administrative context only): [desktop](evidence/phase3-source-review-desktop.png), [mobile](evidence/phase3-source-review-mobile.png).

## Next actionable milestone

Obtain a permitted FUW OSM extract outside this environment with source URL/query, original bytes, SHA-256, actual retrieval time and ODbL attribution. Run the offline import, review the named university way/relation and complete road/building references, then implement building/road geometry, navigation/collisions and character controls against that source. Review deletion candidates separately; do not delete unmerged legacy work or establish `develop/wukari-life` until the PR chain is integrated by its owner.

## File inventory

New files:

- `docs/agent-work/wukari-phase3-20261020.md`
- `docs/wukari/BRANCH_AUDIT.md`
- `docs/wukari/OFFLINE_IMPORT.md`
- `docs/wukari/PHASE3_STATUS.md`
- `docs/wukari/branches/inventory.json`
- `docs/wukari/branches/inventory.csv`
- `docs/wukari/branches/inventory.md`
- `docs/wukari/branches/candidates.json`
- `docs/wukari/branches/dry-run-results.json`
- `docs/wukari/evidence/phase3-source-review-desktop.png`
- `docs/wukari/evidence/phase3-source-review-mobile.png`
- `scripts/wukari/branches.py`
- `scripts/wukari/branches_test.py`
- `scripts/wukari/offline.ts`
- `scripts/wukari/osm-xml.py`
- `src/wukari/offline.test.ts`

Modified files: `scripts/wukari/preview.config.ts`, `src/wukari/preview/App.vue`.
