# Local Nigeria PBF review

This milestone continues `feat/fuw-data-transfer` on Windows. Generated source data stays in ignored `.cache/wukari/`; the national download remains unchanged in Downloads. Code and compact audit evidence are committed separately from the ODbL source database.

## Original download

- File: `nigeria-261019.osm.pbf`, 711,541,464 bytes.
- SHA-256: `d3e80afbf39da31e660d5f13fbb092bd246cdf8830c149f9d1bee4902e0c92bb`.
- Provider [dated checksum file](https://download.geofabrik.de/africa/nigeria-261019.osm.pbf.md5) was fetched over HTTPS and exactly matches the local MD5 `9c106726b749dac15c9a2fbdaaf005f5`. MD5 is an additional provider download-integrity comparison; the stronger local SHA-256 above pins the bytes used throughout this workflow.
- URL recovered from Windows `Zone.Identifier`: <https://download.geofabrik.de/africa/nigeria-261019.osm.pbf>.
- First PBF BlobHeader identifies `OSMHeader`; PyOsmium reads its header as generator `osmium/1.16.0`, replication sequence `4937`, OSM timestamp `2026-10-19T20:21:11Z`. This agrees with the provider's Nigeria listing inspected during the session.
- Original file creation: `2026-10-20T13:35:28Z`; last write: `2026-10-20T13:45:24Z`. Last write is used as an explicitly qualified download-completion estimate in the import receipt. The original HTTP retrieval receipt is unavailable. Neither the filename, browser metadata nor a self-computed checksum independently authenticates the provider's bytes.
- OSM license: ODbL 1.0; © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). No geographic coordinates are inferred from names.

## Method and reproducibility

Approved PyOsmium 4.3.2 is installed only under `.cache/wukari/python-tools`, outside the Node dependency graph. `scripts/wukari/local-pbf.py` verifies the exact committed LGA polygon hash, parses the national input, selects nodes within that actual polygon, then collects complete touching ways and original referenced nodes in subsequent passes. Relations touching selected objects are retained unassembled and may be incomplete. This is a polygon-node/complete-way selection, not a geometric intersection crop: ways crossing the polygon without any inside node can be missed. No source positions are clipped or moved. The original file hash is checked again after extraction.

`scripts/wukari/review-local.ts` prepares the existing strict offline importer. Crossing, malformed or incomplete ways are recorded in `excluded.json`, preserved unchanged in the complete regional extract, and excluded from the import. Untagged nodes used only by excluded features are omitted. Original source metadata, tags, versions, timestamps and references are retained in selected records; relation geometry is not fabricated. Exclusion counts cannot be interpreted as absent mapping.

PowerShell reproduction from repository root (choose fresh output directory names):

```powershell
$env:PYTHONPATH=(Resolve-Path .cache/wukari/python-tools).Path
python scripts/wukari/local-pbf.py --input (Join-Path $env:USERPROFILE 'Downloads/nigeria-261019.osm.pbf') --out .cache/wukari/local-pbf-20261020
node scripts/wukari/review-local.ts .cache/wukari/local-pbf-20261020/wukari-complete.json .cache/wukari/local-pbf-review-20261020 2026-10-20T13:45:24Z
node scripts/wukari/import-local-batches.ts .cache/wukari/local-pbf-review-20261020 .cache/wukari/local-pbf-import-20261020
```

Windows portability fixes use native path separators, `fileURLToPath` for file URLs and `python` on Windows. `.gitattributes` prevents byte-pinned geographic snapshots from acquiring CRLF line endings during checkout. Expected hashes and validation rules are unchanged.

## Campus identity evidence

A separate full-national `amenity=university` name search returned no Wukari-named university. A separate full-national `name` search for Wukari returned the city node, administrative relation and three road names, with no FUW feature. This is evidence about this snapshot's tags, not proof that no campus infrastructure is mapped under another name or without a name.

Institutional identity/address is corroborated by the [Federal Ministry of Education's FUW 2011–2015 report](https://education.gov.ng/wp-content/uploads/2023/09/FEDERAL-UNIVERSITY-WUKARI-Report-2011-2015.pdf) and the [university contact page](https://fuwukari.edu.ng/contact-us/): Katsina-Ala Road, Wukari. These establish address context, not a georeferenced boundary, gate, public access, footpath assignment or safe spawn. No geometry is traced from these sources. The university website's current unrelated injected links/placeholder-looking information are not used to establish facilities or access.

Campus gameplay is conditional on a reviewed geographic association and suitable mapped ground. Counts for the LGA cannot be advertised as FUW campus counts. Elevation, unmapped features, building heights, access and survey verification remain separate unknowns.

## Completed extraction and import

- Entire national PBF parsed: 134,849,010 nodes, 21,689,506 ways, 54,213 relations. Original SHA-256 unchanged after extraction.
- Polygon selection: 423,290 inside nodes; complete regional extract retains 478,822 records and 44,017 ways, including crossing originals. Regional PBF: 1,306,103 bytes, SHA-256 `1286ba72cc4ed9b902821afdf69340ec3603af23723e7b93b2d053ea197e0d47`. JSON: 72,587,585 bytes, SHA-256 `f33d8596d3506cf720ff21b69061c6f8c00a7b4caca19bbb19a122122d0c1cf1`.
- Strict review excludes 230 original ways; exact IDs/reasons are in [the exclusion journal](evidence/local-pbf-exclusions.json). No geometry was repaired or clipped. Original excluded records remain in the regional PBF/JSON.
- Reviewed source: 460,398 records / 62,942,775 bytes. Because this exceeds 32 MiB, **nine reference-complete batches** passed the existing offline importer independently, preserving its size, license, hash, geometry and boundary checks. Tagged standalone nodes and unassembled relations occur only in batch 1; shared node records may repeat unchanged across batches. A separate exact-content/identity-union check passed for all 460,398 records and the aggregate dataset. Batch receipts and hashes are retained.
- Imported LGA mapping: **2,644 road/path ways, 40,496 building footprints, 2 named amenity/tourism landmark records, 39,681 road graph nodes / 94 components**, 21 unassembled relations, zero incomplete ways in the retained import. Named landmarks do not identify FUW. These are source record counts across the LGA, not campus coverage.
- [Updated generated coverage report](LOCAL_PBF_COVERAGE_REPORT.md), [source validation](evidence/local-pbf-source.json), [extraction audit](evidence/local-pbf-extraction.json). The previous `FUW_COVERAGE_REPORT.md` remains the reproducible Phase 4 administrative-context baseline.

Campus extent, FUW feature association, public pedestrian access and safe spawn remain unsupported. **No playable campus was implemented.** A permitted, georeferenced campus extent or corroborated campus feature selection is needed to assign the existing anonymous geometry to FUW. This is a data-association gap, not an absence of real LGA mapping. No database, city registry, existing PR or branch was changed.

Local artifacts: `.cache/wukari/local-pbf-20261020/` contains complete regional PBF/JSON; `local-pbf-review-20261020/` contains strict source and receipt; `local-pbf-import-20261020/` contains nine batch imports, aggregate dataset and generated report. These remain on the originating Windows machine and are not included in Git. The preview can use any batch's `imported/` directory through the documented offline mode; the full 460k-record aggregate has not been browser/performance-tested.

## Validation and limits

All **37 geographic/transfer/review tests pass**, as do pinned boundary verification, strict focused TypeScript checks and the isolated preview build. The node lookup is now shared within each import/report/preview operation rather than rebuilt for every way; missing-reference and precision behavior is tested unchanged. Existing preview chunk-size warning remains. No real-data browser/rendering or gameplay acceptance is claimed.

Whole-project serial typecheck was attempted once with a 3584 MiB heap. It reports existing errors in `src/festivals/client.ts` (missing `fetch` type), `scripts/guard-joinallworld-package.test.mjs` (implicit-any parameter), and `server/accounts/token.ts` (`TextDecoder` options), plus test compiler exit 134 under that cap. Focused new/changed geographic code typechecks cleanly. No unrelated baseline, assertion or memory limit was changed to conceal these failures.

The original extraction completed all file writes and the final original-hash comparison, then failed only while printing Arabic tags through Windows cp1252 stdout. Saved JSON is UTF-8 and its hashes were verified before import. Console output now escapes Unicode; the national scan was not repeated merely to reprint its summary.
