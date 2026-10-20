# Validation record

Cloud checkout baseline: `4d229318e67667970b157e4798c533c4b5be0fad`. Node 24.19.0, npm 11.9.0. Branch: `feat/wukari-geographic-foundation`. This record distinguishes a working development environment from a passing upstream test suite and a verified real map.

## Executed checks

| Check | Result |
| --- | --- |
| `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` | Passed; 91 packages, lockfile unchanged |
| Baseline `npm run typecheck` with 8 GB heap | Passed; five projects, zero errors |
| Baseline `npm run build` with 8 GB heap | Passed; 5,204 transformed modules; circular/manual chunk and mixed static/dynamic-import warnings retained |
| `npm run dev` and full `npm run smoke -- http://127.0.0.1:5173` | Passed: 295 checks, 578 requests, 284 cities, guest state, WebSocket/Weave dictionary and duplicate-action behavior. Runner explicitly skips production headers/chunks on dev server |
| Saved startup’s representative smoke (`SMOKE_CITIES=lagos,abuja`) | Passed: 13 checks, 14 requests |
| `npm run test:smoke` after lab output-path correction | Passed: 18 tests, zero failures/skips; entry/download, release policy and protocol checks |
| `node --test src/wukari/*.test.ts` | Passed: 8 tests, 0 failures/skips; geometry, precision, source integrity, OSM references and CLI repeatability |
| `node scripts/wukari/import.ts --synthetic` | Passed and repeated; outputs retained in ignored `.cache/wukari/` with explicit synthetic mode |
| `npx --no-install vite build --config scripts/wukari/preview.config.ts` | Passed; development lab bundle, existing Three.js dependency, warning for >500 kB isolated chunk |
| Chromium via externally installed Playwright | Passed: WebGL canvas rendered; synthetic warning/unknown town shown; no page errors; 1200×850 desktop and 390×844 mobile, no horizontal overflow. Screenshots inspected locally. Browser tooling installed outside checkout; no dependency changes |
| Full baseline `NODE_OPTIONS=--max-old-space-size=8192 npm run check` | Incomplete at GitHub handoff; reached the expensive `src/game/cities/allCities.test.ts` shared-contract/generator checks. Existing failures present; not a passing suite and no final total claimed |
| Final whole-repository typecheck | Passed: five projects, zero TypeScript/Vue errors |
| Strict focused Vue/TypeScript check of current Wukari modules | Passed after the final source/provenance and build-path edits |
| Real Wukari source import | Blocked before import by geographic download HTTP 403; no real geometry validated/rendered |

## Reproduced baseline findings

No existing source/test files are changed by this branch. These failures occur in existing modules that do not import `src/wukari`:

| Test file | Observed failure |
| --- | --- |
| `scripts/assets/cartridge-assets.test.ts` | `lite has assets` assertion fails |
| `scripts/city/worker-content-budget.test.ts` | Worker bundle 4,661,774 bytes exceeds existing release limit |
| `scripts/scene-factory/layout-host.test.ts` | Expected 12 crowd entries; received 4 |
| `server/admin/links.test.ts` | Expectation names `gpt-5.6-luna`; actual configured string names `gpt-6-luna` |
| `server/agents/agents-open.test.ts` | Registry action `story.mode` missing from generated agent documentation |
| `server/city-content-upgrade.test.ts` | Stored/restored state differs with native character appearance normalization |
| `server/civic/logic.test.ts` | “valid state round-trips unchanged” fails with native character appearance normalization |
| `server/comeback.test.ts` | Idle path performs 3 store accesses; test expects 0 |
| `server/new-player.test.ts` | Quick-start probe calls `must(presetLook(preset))` for an unavailable preset and throws `value is missing` |
| `server/onboarding.test.ts` | Legacy-only look expectation differs from the added normalized native appearance |
| `server/two-players.test.ts` | Avatar equality probe expects a legacy-only look; server supplies normalized native appearance too |
| `src/airport-refinery.test.ts` | Airport scene exceeds the existing triangle-budget assertion (38,172 triangles, 19 meshes, 2 lights) |
| `src/app/cityCatalogue.test.ts` | Fictional city scene test calls the renderer before its scenes are loaded |

The first five were reproduced in one focused run (42 tests: 37 pass, 5 fail). The next three were reproduced in another (31 tests: 28 pass, 3 fail), the following two in a third run (4 tests: 2 pass, 2 fail), and the last three in a fourth run (9 tests: 6 pass, 3 fail). These are behavioral/expectation mismatches in the baseline, not missing npm packages. They were not repaired, suppressed or excluded to make this milestone appear green. The broad run has also reported legacy onboarding/look and existing Story/boutique/Sim UI expectation failures; their final runner diagnostics and totals are not yet available at this checkpoint. Do not claim the table is an exhaustive final failing-test inventory or that all scheduled tests completed.

## Reproduce and interpret

All commands run from repository root. The full build/test prehooks generate ignored assets; generated tracked manifests stayed byte-identical. Source inputs and lockfile are unchanged. No budget or assertion was weakened. New foundation tests are covered by the existing `src/**/*.test.ts` glob.

During concurrent lab validation, the release JavaScript inventory check also found generated preview JavaScript under `.cache/`, which it scans despite Git ignoring that directory. This was caused by our initial lab output path. The lab build was moved into the existing policy-supported `dist/wukari-preview/` output path, and only our obsolete `.cache/wukari/preview-build/` output was removed. After rebuilding there, `node --test server/release.test.ts` passed **5/5**; no assertion or existing test is changed.

The isolated lab is only an ingestion/rendering prototype. Browser canvas checks do not prove campus geometry, navigation, multiplayer, survey accuracy or legal boundary/access. The original game's runtime smoke does not validate the new geographic source data. Worker integration/edge tests and public deployment were not selected for this development milestone.

Install/start instructions and geographic-domain requirements are saved in the environment draft; publication and restoration into a new task are not verified. See [SOURCES.md](SOURCES.md) for exact access prerequisites.
