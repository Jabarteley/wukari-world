# Phase 2 campus milestone — blocked

**The verified, explorable FUW campus milestone is not complete.** No FUW roads, gates, building footprints, campus outline, sports areas or terrain were acquired. No player, estimated campus buildings or invented roads were added to conceal those gaps.

Development branch: `feat/fuw-campus-map`, based on confirmed foundation `f2e0dea50f4e0e2fc6075dc0290ffb4cdc1db3e1`. PR #1 was reviewed through the GitHub API: draft, open, foundation → main. It is unchanged and unmerged. Phase 2 is a separate stacked draft targeting the foundation branch.

## What was implemented

- Reusable public HTTPS acquisition with size/time bounds, exact byte/hash verification, bounded retries, rate-limit handling and structured errors/receipts. No TLS relaxation, credential guessing or access bypass.
- Reproducible real Wukari LGA selection from the exact pinned geoBoundaries national source; original WGS84 coordinate values and source identity are retained. Public license metadata corroborates GRID3, year 2022, NGA ADM2 and CC BY 4.0.
- Small committed source snapshot and provenance, offline integrity/license/uncertainty checks, optional exact reproduction from the original national bytes, and explicit coverage report.
- Source review renderer showing the real LGA plate/outline, compass, cursor coordinates, source selection and attribution, with campus exploration visibly disabled. Synthetic foundation mode remains separately selectable.
- Shared metre-frame tile addresses for future FUW/town geometry and region presence namespaces, bounded tile neighborhoods, explicit unknown coverage/spawns. These are tested addressing contracts, **not** an implemented streaming world or changed multiplayer protocol.

## Geographic coverage

| Requested information | Source status | Field verification / implementation |
| --- | --- | --- |
| Wukari LGA | geoBoundaries feature `59680162B18982121994254`, NGA ADM2 2022 | Source-backed; no independent field/current legal verification. It is not the town or campus boundary |
| Taraba context | Existing pinned ADM1; all selected Wukari vertices checked inside it | Vertex membership check, not a formal all-edge topology proof |
| FUW campus outline | Not acquired | Unknown; no legal-campus claim |
| Entrance gates | Not acquired | Unknown; no character spawn selected |
| Campus roads/paths and connections toward town | Not acquired | No road mesh or navigation graph generated |
| Academic/admin building footprints and names | Not acquired | No building geometry/height/material estimates created |
| Hostels/residential and sports/open spaces | Not acquired | Unknown; no sensitive/private facilities invented |
| Elevation/DEM | Not acquired; public DEM registry metadata denied by proxy | License not independently verified; flat display plate is not terrain |
| Wukari town extent/tiles | Not acquired | Region namespace only; no claim LGA equals town |

There are **zero field-verified features**. OSM feature coverage is **unknown**, not zero real roads/buildings. The dataset contains zero imported OSM elements because there is no successful OSM response. Source IDs and coordinate values are real only for the recorded administrative feature. Failure diagnostics are not geographic data.

## Network diagnosis

The original geoBoundaries and GitHub restrictions are resolved in the running instance: both source metadata and the media/LFS payload now return 200, and the GitHub API can read PR #1. Overpass has a different problem: 502 provider-capacity responses, 406 status response, and timed-out bounded GET/POST/discovery queries. The acquisition pipeline exhausted three sequential 25-second attempts with 1s/2s backoff; those actual events are preserved.

The alternative Overpass mirror, official OSM API, FUW institutional site, Geofabrik, BBBike and a public DEM registry returned proxy CONNECT 403. See [the structured network report](../../data/wukari/verified/network-report.json). Additional mirror/API/institution domain requirements were saved additively in environment settings. No new credential is assumed necessary for these public-source requests.

## Architecture and remaining acceptance gates

The browser still uses Vue, TypeScript and Three.js; the existing Node/WebSocket game, city registry and saved state are untouched. The administrative renderer reuses the existing shared map projection. `regions.ts` bridges local map origins into one metre-based global frame; 256 m tile keys and bounded neighborhoods can later address campus/town asset loads and region presence without rewriting game mechanics.

Before exploration can be implemented: acquire/corroborate a FUW campus way/relation, preserve its IDs/tags/query/receipt, support tested relation assembly if necessary, obtain actual paths/footprints and public access information, then derive an authorized spawn, connected navigation and polygon collisions. Use existing movement/camera/avatar contracts when appropriate; their current units/scene assumptions were audited, but no adapter is activated without a real floor. Numeric coordinate roundtrips do not establish survey precision or eliminate the shared frame’s known scale distortion.

Building heights and road widths may use explicit visual estimates only after genuine feature geometry exists. Terrain needs a licensed DEM or a conspicuously disclosed flat fallback. Then implement third-person walking/sprinting, camera following, collisions, minimap/landmark picking and measured tile/geometry LOD. No such behavior is claimed by this blocked milestone.

## Checks and artifacts

- `node --test src/wukari/*.test.ts`: **20 passed**, none skipped/failed (8 preserved foundation + 12 Phase 2 tests).
- Offline source verification and `--master` national-byte reproduction: passed. Fresh HTTPS acquisition → selection → curation → exact verification was also repeated successfully in a separate cache directory.
- Isolated preview build: passed; expected Three.js bundle-size advisory remains.
- Chromium: real context rendered, exact unofficial notice and disabled-campus state visible, no page errors, desktop/mobile without horizontal overflow, source selection/coordinates and read-only data endpoint checked.
- `npm run test:smoke`: **18 passed**, no failures/skips; unchanged entry/download, protocol and release checks.
- Whole-project typecheck: **five projects clean**, zero TypeScript/Vue errors. Strict focused current-module typecheck also passed.
- The already-running broad Phase 1 `npm run check` remains an incomplete, failing baseline run. It was not restarted or described as green; known unrelated asset/budget/legacy-look/UI failures are in `VALIDATION.md`. No existing budgets, assertions or gameplay tests were weakened.
- Road geometry, footprint-to-building generation, navigation graph integrity, player/collision tests and **campus** Chromium exploration are unimplemented/unrun because no FUW source geometry is available. Passing boundary tests do not validate them.

Screenshots show **administrative context only**: [desktop](evidence/phase2-boundary-desktop.png), [mobile](evidence/phase2-boundary-mobile.png). Reproduction and acquisition commands: [PHASE2_ACQUISITION.md](PHASE2_ACQUISITION.md).

## Next actionable task

Apply the saved alternative public-data domain requirements, then run the explicit mirror discovery command. Retry the original Overpass provider only after a meaningful service recovery/backoff. Alternatively obtain an attributed, licensed FUW OSM extract through an authorized provider and retain its exact source/query/retrieval/hash records. Inspect and corroborate returned candidates before importing. **Do not mark this phase complete or draw a synthetic campus while this prerequisite is missing.**

## Phase 2 file inventory

The draft PR diff is authoritative: **20 new files and 14 modified files**. Existing synthetic fixtures, dependency manifests/lockfiles, game/city code, multiplayer and AGPL text are unchanged.

| Status | File |
| --- | --- |
| New | `data/wukari/verified/context.dataset.json` |
| New | `data/wukari/verified/coverage.json` |
| New | `data/wukari/verified/discovery.overpassql` |
| New | `data/wukari/verified/network-report.json` |
| New | `data/wukari/verified/nga-adm2.metadata.json` |
| New | `data/wukari/verified/provenance.json` |
| New | `data/wukari/verified/wukari-adm2.geojson` |
| New | `docs/agent-work/fuw-campus-phase2-20261020.md` |
| New | `docs/wukari/PHASE2_ACQUISITION.md` |
| New | `docs/wukari/PHASE2_CAMPUS_STATUS.md` |
| New | `docs/wukari/evidence/phase2-boundary-desktop.png` |
| New | `docs/wukari/evidence/phase2-boundary-mobile.png` |
| New | `scripts/wukari/acquire.ts` |
| New | `scripts/wukari/acquisition.ts` |
| New | `scripts/wukari/record-boundary.ts` |
| New | `scripts/wukari/verify-boundary.ts` |
| New | `src/wukari/acquisition.test.ts` |
| New | `src/wukari/boundary.test.ts` |
| New | `src/wukari/regions.test.ts` |
| New | `src/wukari/regions.ts` |
| Modified | `NOTICE.md` |
| Modified | `data/wukari/README.md` |
| Modified | `docs/wukari/ARCHITECTURE.md` |
| Modified | `docs/wukari/CHANGES.md` |
| Modified | `docs/wukari/GEOGRAPHY.md` |
| Modified | `docs/wukari/LEGAL_AND_ATTRIBUTION.md` |
| Modified | `docs/wukari/PROJECT_BRIEF.md` |
| Modified | `docs/wukari/ROADMAP.md` |
| Modified | `docs/wukari/SOURCES.md` |
| Modified | `docs/wukari/VALIDATION.md` |
| Modified | `scripts/wukari/preview.config.ts` |
| Modified | `scripts/wukari/sources.ts` |
| Modified | `src/wukari/preview/App.vue` |
| Modified | `src/wukari/preview/scene.ts` |
