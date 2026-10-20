# Phase 4 — reproducible transfer delivered; playable campus blocked

Base: `feat/wukari-audit-offline-import` at `43fb0031f189c569c90c5601ff8ca7419c523f4e`, verified against the remote before branching. New feature: `feat/fuw-data-transfer`; draft review targets that exact base branch. Previous PRs and all existing game/economy/AGPL/source data are unchanged. No merge, deployment, PostgreSQL, branch cleanup or economy modification.

## Outcome

**The playable-campus milestone is not complete.** No authentic FUW roads, paths, buildings, campus outline or safe public spawn were acquired. Consequently no character, collision/navigation, fictitious campus floor, estimated building extrusion or minimap was added. The existing compass/coordinate/source-review interface remains available; screenshots show only the genuine administrative context.

The separately allowed **working transfer outcome is implemented**: a portable one-file package transports original XML/OSM JSON and exact receipt bytes, records whole-file and nested hashes, rejects corruption and synthetic receipts, and invokes the existing offline importer. New coverage tooling generates counts, OSM-reference graph components, licenses/hashes and explicit unknown coverage. This extends the Phase 3 implementation without reimplementing its importer or repeating branch cleanup.

## Fresh acquisition evidence

The existing `node scripts/wukari/acquire.ts` was run first. National/metadata retrieval and integrity checks succeeded; Overpass discovery exhausted its existing three attempts (two timeouts and HTTP 502). An explicit permitted alternative Overpass request timed out. Geofabrik Nigeria, BBBike and the OSM website returned proxy CONNECT 403. No restrictions were bypassed. The structured [Phase 4 evidence](evidence/phase4-acquisition.json) preserves exact queries, attempt timestamps, failures and URLs. These are diagnostics, not geographic source features.

The original source snapshots/provenance remain unchanged. Source-backed LGA coverage does not establish campus coverage. See the generated [FUW coverage report](FUW_COVERAGE_REPORT.md): **0 imported roads, 0 building footprints, 0 named source-backed landmark records; campus extent/connectivity/coverage unknown, zero field-verified features.** These counts describe imported data, not absent real-world features.

## Exact reproduction

Follow [DATA_TRANSFER.md](DATA_TRANSFER.md) for provider acquisition, original-license/hash validation, external offline validation, package creation, attachment/workspace transfer, receiving/importing, coverage generation and preview. It specifies the exact missing external input and explains operation without a known campus boundary.

```sh
node --test src/wukari/*.test.ts
python3 scripts/wukari/branches_test.py
node scripts/wukari/verify-boundary.ts
node scripts/wukari/coverage.ts data/wukari/verified/context.dataset.json /tmp/FUW_COVERAGE_REPORT.md
cmp docs/wukari/FUW_COVERAGE_REPORT.md /tmp/FUW_COVERAGE_REPORT.md
npx --no-install vite build --config scripts/wukari/preview.config.ts
npm run test:smoke
NODE_OPTIONS=--max-old-space-size=8192 npm run typecheck
```

Use a new report filename if `/tmp/FUW_COVERAGE_REPORT.md` already exists; report/receive/package outputs never overwrite prior files. Start the preview with the existing Vite command or the offline-mode environment variables in DATA_TRANSFER.md. Browser checks used installed Chromium and temporary Playwright outside the repository; desktop 1200×1000 and mobile 390×844, canvas/source selection/visible uncertainty/no overflow/no page errors. The preview port is 5194. Screenshots: [desktop](evidence/phase4-context-only-desktop.png), [mobile](evidence/phase4-context-only-mobile.png).

## Validation

- Geographic/import/coordinate/geometry/transfer tests: **35 passed**, zero failed/skipped; includes the prior 27 and eight new transfer/coverage tests.
- Hash-identical XML and JSON receive/import tests use explicitly named **empty unit-test input**, not claimed real campus geography. Synthetic graph fixtures only test reference connectivity. Invalid geometry, corrupted transfer/nested hashes, unsupported PBF, synthetic receipts, size limits and overwrite protection are exercised. Real campus ingestion/gameplay remain untested because no source was acquired.
- Five existing branch safety tests passed with mocks, no deletion.
- Offline boundary/license/provenance verification passed; generated report matches committed source and known boundary hash.
- Focused strict TypeScript/Vue checks passed.
- Whole-project typecheck: five projects clean, zero TypeScript/Vue errors.
- Preview build passed with the existing Three.js bundle advisory; 18 smoke tests passed. Lagos/Abuja runtime smoke passed 13 checks / 14 requests.
- Chromium desktop/mobile checks passed. No new 3D gameplay behavior is claimed.
- Earlier broad `npm run check` remains an incomplete, already failing baseline run; no duplicate unbounded full run was started. Existing unrelated failures are documented in VALIDATION.md. Assertions/budgets were not weakened.

## Files changed

All ten files are new; existing source files and imports were not rewritten:

- `scripts/wukari/transfer.ts`
- `scripts/wukari/coverage.ts`
- `src/wukari/transfer.test.ts`
- `docs/wukari/DATA_TRANSFER.md`
- `docs/wukari/FUW_COVERAGE_REPORT.md`
- `docs/wukari/PHASE4_STATUS.md`
- `docs/wukari/evidence/phase4-acquisition.json`
- `docs/wukari/evidence/phase4-context-only-desktop.png`
- `docs/wukari/evidence/phase4-context-only-mobile.png`
- `docs/agent-work/wukari-phase4-20261020.md`

Next executable dependency: obtain and attach a permitted `fuw-transfer.json` plus its separately recorded package SHA-256, containing actual FUW-area features and receipt. Run receive/import and review campus association/public ground independently; then implement actual meshes, safe spawn, walking/sprinting/collision and minimap against those reviewed features. A missing campus boundary need not block review of separately corroborated roads/buildings, but it must never be guessed.
