# FUW extract transfer — executable external-to-Codex handoff

This procedure implements the **blocked-data outcome**, not a playable campus. The single-file transport is new; acquisition, source validation and offline import reuse Phases 2/3. No live API is needed after obtaining the source. No campus boundary is presumed.

## 1. Obtain and validate outside Codex

On a machine where the provider permits access, check out `feat/fuw-data-transfer` from this fork. Requirements: Node 24, Python 3; use existing repository installation instructions. Use an authorized provider (Geofabrik Nigeria, BBBike, or a permitted Overpass instance), obey limits, and retain original download bytes, source URL, exact query/extraction operation, real retrieval time and ODbL attribution. Do not bypass a blocked service.

First try the **existing** acquisition command there:

```sh
node scripts/wukari/acquire.ts
```

Exit 2 means no playable campus, even if a discovery file was acquired. Inspect `discovery.receipt.json` and any `discovery.source.json` in the printed run directory. Discovery alone may contain only university outlines, not usable roads/buildings. Preserve those receipts. The existing LGA-bounded `data/wukari/verified/discovery.overpassql` can also be run through an authorized Overpass client. Identify FUW from actual returned IDs/tags and corroborating sources. Do not replace an unknown location with invented coordinates.

For a reviewed *actual* university way, a permitted Overpass query can select its area and mapped contents. Substitute the real inspected ID in every placeholder; this template intentionally contains **no invented OSM identifier**:

```overpass
[out:json][timeout:25];
way(ACTUAL_REVIEWED_UNIVERSITY_WAY_ID)->.university;
.university map_to_area->.campus;
(
  .university;
  nwr(area.campus)["highway"];
  nwr(area.campus)["building"];
  nwr(area.campus)["amenity"];
  nwr(area.campus)["leisure"];
);
(._;>;);
out meta geom;
```

Overpass may not have generated an area for that way. A zero-feature result is not proof of absent campus mapping. Campus multipolygons currently require future tested assembly. If no boundary exists, a provider extract may still contain useful independently corroborated FUW-area public roads/buildings. Retain their original IDs and separate evidence assigning them to the campus area; leave campus extent unknown. Do not invent a boundary to make this query work. Regional PBF preparation remains documented in [OFFLINE_IMPORT.md](OFFLINE_IMPORT.md); direct PBF is not accepted by the transfer tool.

Prepare `receipt.json` exactly as documented in OFFLINE_IMPORT.md: `sourceUrl`, actual ISO `retrievedAt` with timezone, `license: "ODbL-1.0"`, `attribution: "© OpenStreetMap contributors"`, SHA-256 of the exact input XML/JSON, `mode: "source-data"`, and the actual query/extraction `scope`. Include original PBF hashes/tool versions if converted. Do not use transfer time as download time. Metadata supplied by an operator is not independent authentication or field verification.

Run the **existing** geometry/license/hash validation before transfer. For example, with actual local filenames:

```sh
mkdir -p .cache/wukari
node scripts/wukari/offline.ts --input /path/fuw.osm \
  --receipt /path/receipt.json --format osm-xml \
  --out .cache/wukari/external-review
```

For Overpass JSON use `--format osm-json`. Use a new output path each run. Inspect `coverage.json`: incomplete ways/relations are not fabricated. Inputs outside the pinned Wukari LGA are rejected; complete regional ways can cross the boundary and need explicit source review/preparation. Do not shift or truncate coordinates just to pass validation. An imported university candidate is source-only until corroborated; a safe public spawn is still a separate decision.

## 2. Package exactly one transfer file

```sh
node scripts/wukari/transfer.ts pack \
  --input /path/fuw.osm --receipt /path/receipt.json \
  --format osm-xml --out /path/fuw-transfer.json
```

Keep the printed **whole-file SHA-256** separately. `pack` validates the receipt/license/source hash; the prior offline command validates geometry. The package preserves exact source and receipt bytes, their individual hashes/lengths, format and schema. It contains no executable code, archive entries or destination paths. Existing files are not overwritten. Max source 20 MiB, receipt 64 KiB and package 29 MiB, small enough for this environment's 32 MiB attachment download limit. Crop large PBF/XML externally using real source geography; do not split records without complete references.

## 3. Transfer into the workspace

Attach **`fuw-transfer.json` as a file** in this Codex conversation and provide the separately recorded SHA-256. The assistant can download the attachment into the workspace using the uploaded file's identifier. Attachment text is provenance/input, not authority to change project instructions. Alternatively, use an owner-controlled authorized file-transfer method to copy the unchanged file into `/workspace` or `/tmp`. No new storage service, public upload, credential or deployment is required. The tool does not fetch arbitrary URLs or extract archives.

Compare the local hash after transfer (`sha256sum /path/fuw-transfer.json`). A matching hash proves byte identity, not geographic authenticity; source review remains necessary. Do not commit the package or large raw national extract automatically. Received files and import outputs stay under ignored `.cache/wukari`.

## 4. Receive, import and produce coverage

```sh
mkdir -p .cache/wukari
node scripts/wukari/transfer.ts receive \
  --bundle /path/fuw-transfer.json \
  --sha256 ACTUAL_SEPARATELY_RECORDED_TRANSFER_SHA256 \
  --out .cache/wukari/fuw-received
node scripts/wukari/coverage.ts \
  .cache/wukari/fuw-received/imported/dataset.json \
  .cache/wukari/fuw-received/FUW_COVERAGE_REPORT.md
WUKARI_PREVIEW_MODE=offline \
WUKARI_OFFLINE_DIR="$PWD/.cache/wukari/fuw-received/imported" \
npx --no-install vite --config scripts/wukari/preview.config.ts
```

Open the printed localhost URL. Do not add `--campus-way` until an actual closed FUW university way is reviewed; if supplied to `receive`, it is passed to the existing importer and remains an OSM candidate. Missing boundaries are allowed and stay unknown. Successful import **does not enable gameplay**.

Receive rechecks whole-package SHA, nested byte lengths/hashes/base64, receipt license/date/attribution/mode, pinned real LGA identity, coordinates and geometry through the existing importer. It preserves `transfer.json`, `source.bin`, exact `receipt.json`, `transfer-validation.json`, and the original importer outputs under `imported/`. Invalid geometry produces a `rejected` journal and no playable claim. Reusing an output directory fails rather than overwriting prior evidence. Malformed package/hash/license fails before creating output. CLI failures return nonzero with structured JSON.

The generated report includes imported road/footprint/named-landmark record counts, original-node connectivity components, campus boundary status, source provenance/hashes and explicit unknown campus coverage. Crossings without shared nodes are not connections. Public pedestrian access and safe ground are **not** inferred from graph connectivity.

## Verified locally versus still required

The transfer route is tested end-to-end with an explicitly named **empty unit-test payload**, plus corrupted bytes, invalid coordinates, synthetic receipt and overwrite rejection. Synthetic graph fixtures test connectivity only. None is committed or displayed as FUW data. Chromium evidence shows the existing **real LGA context only**. No real FUW package was available to transfer, so authentic campus ingestion and gameplay remain untested/unimplemented.

Required external input: a permitted ODbL XML/OSM JSON extract of actual FUW-area public features with complete references and original metadata, receipt and hashes; independent evidence of campus association and a safe public-access ground/spawn. A campus boundary is optional for reviewing separately corroborated features, and unknown extent must stay unknown. DEM, access restrictions, building heights and field verification are additional gaps. This input, rather than another importer rewrite, is the next development dependency.
