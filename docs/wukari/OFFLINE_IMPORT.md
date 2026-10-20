# Offline OSM import and FUW source acquisition

The working import path accepts **OSM 0.6 XML (`.osm`) and Overpass OSM JSON**. It needs no live API. PBF is supported through an explicit external `osmium` conversion step, not an embedded PBF parser. Arbitrary GeoJSON is not accepted as OSM: inventing node references would lose identity. geoBoundaries GeoJSON remains the pinned administrative boundary input. No dependency manifests or game stack were changed; the XML adapter uses Python 3's standard library.

## Obtain a permitted extract

Outside this cloud environment, use an authorized provider such as [Geofabrik Nigeria](https://download.geofabrik.de/africa/nigeria.html), [BBBike](https://extract.bbbike.org/), or a successful bounded Overpass response. Respect provider limits and source licenses. Save the original bytes, download URL, actual retrieval time, extraction scope and SHA-256. Do not treat an error body, Git LFS pointer or synthetic fixture as geographic data.

For a regional PBF, install `osmium-tool` locally using its official distribution. First verify that provider's ODbL attribution. Retain the original PBF, its hash and the tool version. Crop using the **committed real Wukari administrative polygon**, not guessed campus coordinates. The selected GeoJSON is a FeatureCollection understood by current osmium-tool releases:

```sh
osmium --version
osmium extract -p data/wukari/verified/wukari-adm2.geojson \
  --strategy complete_ways nigeria-latest.osm.pbf -o wukari.osm.pbf
osmium cat wukari.osm.pbf -f osm -o wukari.osm
sha256sum nigeria-latest.osm.pbf wukari.osm.pbf wukari.osm
```

These are external preparation instructions, **not commands executed or validated against a real PBF in this environment**. Complete ways may extend outside the polygon; the importer deliberately rejects such geometry rather than clipping, shifting or inventing positions. Review/crop an appropriate smaller campus extract after obtaining a source-backed campus boundary. Preserve original files and transformation history. Inputs are limited to 32 MiB; national PBF/XML must be cropped externally. Relations are retained, not assembled or silently rendered as footprints.

Create `receipt.json` with actual values, replacing every placeholder:

```json
{
  "sourceUrl": "https://download.geofabrik.de/africa/nigeria-latest.osm.pbf",
  "retrievedAt": "ACTUAL_ISO_UTC_RETRIEVAL_TIME",
  "license": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors",
  "sha256": "SHA256_OF_EXACT_INPUT_XML_OR_JSON",
  "mode": "source-data",
  "scope": "Actual source query or extraction polygon and preparation commands",
  "derivedFrom": {"file": "original-provider-extract.pbf", "sha256": "ORIGINAL_DOWNLOAD_HASH", "tool": "ACTUAL_OSMIUM_VERSION"}
}
```

`derivedFrom` is retained as supplied provenance; it is not independently authenticated by the importer. Keep the original PBF alongside the receipt outside Git if large. No placeholder timestamp/hash passes validation. A receipt documents the operator's source claim; it does not independently establish truth or field verification.

```sh
mkdir -p .cache/wukari
node scripts/wukari/offline.ts --input /path/wukari.osm \
  --receipt /path/receipt.json --format osm-xml \
  --out .cache/wukari/offline-fuw-review
# For a complete Overpass response, use --format osm-json instead.
WUKARI_PREVIEW_MODE=offline \
WUKARI_OFFLINE_DIR="$PWD/.cache/wukari/offline-fuw-review" \
npx --no-install vite --config scripts/wukari/preview.config.ts
```

The output must be a **new** directory under `.cache/wukari`; sources and existing outputs are not overwritten. It preserves exact `source.bin`, receipt, full original relevant OSM fields/tags/IDs, WGS84 numeric precision, dataset, provenance and coverage report. Identical repeated IDs deduplicate; conflicting repeated IDs fail. Invalid coordinates, XML DTD/entities, deleted objects and conflicting historical versions, malformed rings, self-intersecting footprints and geometry outside the actual LGA fail. Boundary validation checks segment intervals, including crossings through holes. Missing node references and unassembled relations are reported and omitted from rendering, never inferred. Very small/degenerate geometry may fail conservative numeric validation and needs source review.

By default the campus remains **unknown**. Only after inspecting a closed `amenity=university` way named Federal University Wukari can `--campus-way ACTUAL_ID` be provided. It remains an **OSM candidate**, not a field-verified/legal campus outline. Multipolygon campus relations require future tested assembly; do not flatten holes or guess boundaries. The preview shows source lines/footprints using the existing renderer, not a navigable campus or architectural reconstruction. Geometry, source-only identity and imported counts are separate from geographic completeness. No automatic character spawn, collision mesh, navigation graph or DEM is created.

## Current coverage and access

The committed real data still consists only of the Wukari LGA administrative boundary, CC BY 4.0, with zero imported FUW OSM features and zero field-verified features. Roads, paths, buildings, entrances, hostels, sports grounds, campus boundary and elevation remain **unavailable**, not evidence those features do not exist.

Fresh Phase 3 observations (20 October 2026): primary and alternative Overpass queries timed out after 15 seconds; Geofabrik and BBBike requests were proxy CONNECT 403; the institutional site returned 421. The official OSM capabilities API now returns **200**, so the previous blanket OSM-API proxy blocker is no longer current. Capabilities are not campus geometry. One Nominatim name lookup was proxy CONNECT 403. No campus coordinate/bounding box was guessed to compensate, no restricted request was bypassed and no public national extract was downloaded. Existing acquisition retry/hash/rate-limit logic and immutable Phase 2 reports remain intact.

Precise next input: an attributed ODbL OSM extract containing the FUW university boundary/candidate and complete referenced nodes for campus ways, roads/paths and building footprints, plus source URL/query, actual acquisition time and hashes. If no boundary is mapped, obtain a permitted independently corroborated campus extent before claiming campus coverage. A separately licensed elevation dataset is still needed for real terrain. Once imported/reviewed, implement relation assembly where required, road/building meshes, safe spawn, navigation/collisions, character controls and minimap in the next milestone.
