# Geography and reproducible workflow

## Distinct extents

| Extent | Current state | Acceptance |
| --- | --- | --- |
| Taraba ADM1 | Existing pinned geoBoundaries source verified by SHA-256 | State context only |
| Wukari LGA / ADM2 | Pinned national bytes acquired and exact source feature `59680162B18982121994254` selected; source-backed, not field-verified | Coordinates/identity/license retained, Taraba vertex checks and exact source reproduction pass; contemporary legal/field review remains separate |
| Wukari town | Unknown, `geometry: null` | A sourced legal town boundary if available; otherwise a clearly named built-up/study area with method and date. Never equate it to the LGA |
| FUW campus | Unknown; synthetic candidate only in fixture | Identify source way/relation, corroborate public institutional information and ground observations, establish campus edges/gates and public-access limitations |

The handoff supplies the name/address context, not verified campus coordinates. No Wukari origin/spawn was typed by hand. The importer derives its display origin from a recorded polygon vertex. It is not an entrance or gameplay spawn.

## Run the development lab

From the existing checkout (no extra worktree):

```sh
cd /workspace/wukari-world
node scripts/wukari/verify-boundary.ts
npx --no-install vite --config scripts/wukari/preview.config.ts
```

The default Phase 2 view uses the committed real administrative context, **not a FUW map**. The preserved synthetic fixture is at the equator/prime meridian and visibly labeled **NOT WUKARI**; generate it with `node scripts/wukari/import.ts --synthetic` and explicitly select it using `WUKARI_PREVIEW_MODE=foundation` when starting Vite. It tests ingestion/rendering, not coverage. The lab binds loopback port 5194. Use local HTTP/browser checks; do not publish it as a completed campus.

```sh
node --test src/wukari/*.test.ts
npx --no-install vite build --config scripts/wukari/preview.config.ts
```

The isolated build writes to ignored `dist/wukari-preview/` (the existing release policy excludes compiled `dist/` output). It checks compilation; its static output does not bundle the dataset endpoint. Run the Vite development server for inspection. The main build may replace `dist/`, so regenerate this lab output when needed. Full repository check: `NODE_OPTIONS=--max-old-space-size=8192 npm run check`. Known baseline failures are recorded in [VALIDATION.md](VALIDATION.md).

## Acquire real inputs when network access is available

The pinned ADM2 URL in `scripts/wukari/sources.ts` must yield **9,422,551 bytes** with SHA-256 `bef7f2cfa45e012f4772eaa61c7b99e5188aeba4d5c6badae7e9f9aae8c02fcd`. Git LFS pointer text is not a substitute. Do not change the expected checksum or disable TLS checks to make a download pass.

1. Retrieve that exact geoBoundaries release and record acquisition time. The GitHub raw endpoint may return only a Git LFS pointer; obtain the LFS payload through the official media endpoint.
2. Execute `data/wukari/discover-fuw.overpassql` against the documented Overpass endpoint. Record query, exact response, SHA-256, retrieval time and OSM base timestamp. A failed, empty or timed-out discovery proves no campus extent. Investigate spelling/coverage separately.
3. Inspect mapped university candidates and independently corroborate them. Derive a bounded campus study query from source geometry and fetch mapped roads/paths/buildings/landuse/water/public POIs using `out meta geom`. Preserve the discovery record too. Do not substitute centroids for gates or invent missing features.
4. If only relations are available, retain them and implement/test proper ring assembly before using them as a campus extent. Do not flatten holes or substitute a rectangle.
5. Import from recorded files. Replace the capitalized tokens below with recorded values, not guesses:

```sh
node scripts/wukari/import.ts \
  --adm2 /path/to/geoBoundaries-NGA-ADM2.geojson \
  --adm2-retrieved-at RECORDED_BOUNDARY_ISO_TIMESTAMP \
  --osm /path/to/campus-features.json \
  --osm-sha256 RECORDED_SHA256 \
  --retrieved-at RECORDED_ISO_TIMESTAMP \
  --query /path/to/exact-campus-query.overpassql \
  --campus-way RECORDED_UNIVERSITY_WAY_ID
```

Omit `--campus-way` if no eligible way is verified as a candidate; campus stays unknown. Import writes only the dedicated ignored `.cache/wukari/` tree (`--out` may select a child directory). Keep source inputs outside generated output paths. These generated outputs can be replaced by subsequent imports; preserve reviewed snapshots separately.

The real **FUW/OSM importer** path has not executed successfully because no campus source response is available. The real administrative-boundary acquisition/selection path has executed and reproduced successfully; see [PHASE2_ACQUISITION.md](PHASE2_ACQUISITION.md). Imports fail closed for wrong byte counts/hashes, missing acquisition/query evidence, ambiguous/wrong-level boundaries, malformed coordinates/rings, duplicate OSM identities, inconsistent node positions, incomplete selected campus geometry, or a candidate outside the LGA. No output is promoted to a playable city.

## Precision and uncertainty

WGS84 positions are `[longitude, latitude]`; raw bytes are retained. No rounding, axis swap or quantisation is applied to source features. OSM numeric IDs are validated as safe integers and namespaced by type; node refs and relation members are kept. Missing way geometry can be resolved from retained node records; missing nodes do not become straight-line approximations.

World positions use x east, y up, z south, with one unit per metre. The adapter subtracts an unrounded source-derived origin from the shared Nigeria frame, then multiplies its 100-metre map units by 100. Roundtrip tests check numerical reversibility to 1e-12 degrees, orientation and approximate metre scale. This tolerance is a software property, not a claim that source positions are accurate to that distance. Elevation is unknown; all preview linework is flat.

The lab has no completed Wukari/FUW game map. One real administrative feature is preserved; FUW/OSM coverage remains unknown. Fixture or rendered-element counts must never be used to claim campus coverage.
