# Wukari geographic gameplay prototype

This phase delivers a local, single-player demonstration on original Wukari OSM geometry. It is **not a completed FUW campus**, a public-access map, or real-world navigation guidance. No Nigeria download, importer rebuild, PostgreSQL, merge or deployment is involved.

## Launch and test

From the repository root, with the existing locked dependencies installed:

```powershell
npm run wukari:play
```

Open **http://127.0.0.1:5196/**. The committed small studies make this work without the original national PBF or a database. Town demo starts a third-person character at the reviewed, owner-approved *simulation-only* spawn. WASD/arrows walk, Shift sprints, drag or Q/E rotates the follow camera, and wheel adjusts camera distance. Reset returns to the original node. Explore removes the character and enables orbit/pan/zoom. On mobile, hold the directional buttons, toggle Sprint, and drag the 3D view to look. Releasing/cancelling a touch or losing focus clears movement. The compass is the camera's view bearing; the minimap stays north-up.

**FUW location review** loads its own bounded data on demand and starts with an interactive source map. Select any original OSM road line/footprint for its ID, tags and distance. FUW character spawning remains disabled. The map's square is a display window, never a campus boundary. Opening the map pauses movement; closing it restores game focus.

```powershell
node --test src/wukari/*.test.ts scripts/typecheck.test.ts
npm run wukari:build
# With the loopback server running and local Chrome installed:
node scripts/wukari/play-browser.ts
```

Browser QA uses an isolated temporary Chrome profile under ignored `.cache/wukari/`, closes its owned browser and writes screenshots/results to `docs/wukari/evidence/`. `CHROME` may identify another installed compatible Chromium executable. No accounts or live game services are used. Build output is self-contained static content under `dist/wukari-play/`, including the attributed small geographic databases; this is not a deployment.

## FUW geolocation review

The candidate point is **9.775° E, 7.8436111111111115° N** (source DMS converted arithmetically). A [2023 FUW-affiliated field study](https://fjs.fudutsinma.edu.ng/index.php/fjs/article/download/1169/1835/) reports historical campus sampling coordinates; [FUW's journal, 2025](https://ftstjournal.com/uploads/docs/101Article%2033%20pp%20214-217.pdf) gives the same approximate institutional study location. Repeated reporting is not independent field verification. The [Ministry report](https://education.gov.ng/wp-content/uploads/2023/09/FEDERAL-UNIVERSITY-WUKARI-Report-2011-2015.pdf) supports the Katsina-Ala Road address, not a polygon. See the [source registry and four historical points](../../data/wukari/phase7/sources.json).

Confidence is **moderate for an approximate historical university location**, insufficient for a surveyed campus extent, current gate or named building. Published whole-second coordinates have unknown datum/instrument error; WGS84 is an explicit display interpretation, not a survey certification. The studies also contain questionable wider-region notation; that notation is not used. No commercial map or journal map is traced, no coordinate corrected by guesswork, and no hull of sample points becomes a campus boundary.

The [Wikidata university pin](https://www.wikidata.org/wiki/Q100872718) at 9.779° E, 7.8773° N is unreferenced and conflicts with the historical research cluster by approximately 3.8 km. It is retained as disputed context and excluded from the FUW selection/spawn. No precise legal boundary was acquired. All surrounding OSM features are explicitly **nearby, ownership unverified**.

## Coverage and actual OSM records

| Scope | Window | Road ways | Footprints | Shared-reference graph components | Character |
|---|---|---:|---:|---:|---|
| Town study, centred on original Wukari place node 501490428 | 760 × 760 m | 20 | 209 | 5 | Approved virtual-only spawn |
| FUW candidate vicinity | 1,300 × 1,300 m | 24 | 571 | 7 | Non-spawning exploration |

These subsets contain only complete original ways wholly within each display window; crossing ways and relation geometry are omitted, without clipping or reconstruction. Counts are not geographic completeness, campus coverage or unique venues. Components describe each selected subset; omitted crossing ways can split connectivity. Crossings without shared original nodes are not connections. Larger original extracts and all nine previously validated imports remain unchanged locally.

Nearest mapped roads to the reported FUW point:

| Original OSM way | Tags | Distance to recorded line | Subset component |
|---|---|---:|---:|
| [673416540](https://www.openstreetmap.org/way/673416540) | highway=unclassified | 103.9 m | 4 |
| [673416546](https://www.openstreetmap.org/way/673416546) | highway=unclassified | 170.0 m | 5 |
| [1432594451](https://www.openstreetmap.org/way/1432594451) | highway=service | 181.8 m | 4 |
| [673416543](https://www.openstreetmap.org/way/673416543) | highway=unclassified | 188.2 m | 4 |
| [673416545](https://www.openstreetmap.org/way/673416545) | highway=unclassified | 190.0 m | 4 |

Nearest recorded footprint edges:

| Original OSM way | Tags | Display distance |
|---|---|---:|
| [1523018673](https://www.openstreetmap.org/way/1523018673) | building=yes | 3.1 m |
| [1523013727](https://www.openstreetmap.org/way/1523013727) | building=yes | 14.1 m |
| [1523019300](https://www.openstreetmap.org/way/1523019300) | building=yes | 24.2 m |
| [1523016515](https://www.openstreetmap.org/way/1523016515) | building=yes | 31.5 m |
| [1523022609](https://www.openstreetmap.org/way/1523022609) | building=yes | 32.1 m |

These are approximate projected point-to-segment distances, including footprint **edges**, not centroid/ownership measurements or survey accuracy. Original positions/tags/node IDs, per-road connectivity and every selected footprint's distance are retained in [the generated inventory](evidence/phase7-inventory.json). [FUW review map screenshot](evidence/phase7-fuw-review.png) and the interactive map show the source geometry and research points with citations/unknowns.

## Virtual spawn and movement review

The owner explicitly approved simulation-only spawning on 21 October 2026. Original **node 1965491146**, on **way 558733005** (`highway=residential`, `surface=unpaved`), was selected for connected original road references, mapped-building clearance, no restrictive mapped tags/bridge/tunnel/ford, distance from mapped major-road centre lines, and nearby visible mapped buildings. Absence of restrictive tags does **not** establish public access. Legal/pedestrian access, traffic, surface condition, survey accuracy and physical safety remain unverified.

The motor permits only a 2 m virtual corridor around selected residential/service/path/footway/pedestrian/living-street centre lines after restriction checks. This is a software rule, not a measured width. It rejects footprint interiors/edge clearance and study bounds, normalises diagonal input, substeps motion to prevent tunnelling, and caps frame gaps. Walking is 2.4 virtual m/s; sprint is 6. Unknown or restricted ground is not freely traversable. Explore is available without spawning; no real-world entry recommendation is made.

## Rendering and loading limits

Recorded road lines and footprint positions remain exact source coordinates; local projection occurs at display time. Terrain is a flat illustrative plate. Road widths/joins, default 3.6 m building extrusions and the original simple avatar are illustrative, not reconstructed architecture. Valid source `height` tags are used when present. No invented campus facility, road, building, surveyed elevation or public access is added.

The initial town database is about 151 KiB; the FUW database is about 401 KiB and is fetched only when selected. No 460k-record/national source is loaded by the browser. Shared meshes batch roads, footprints and roofs, pixel ratio is capped at 1.5, resizing and resource disposal are explicit, and follow-camera rays shorten at building meshes. Browser telemetry records actual draw counts/triangles. Headless software-renderer FPS is **not** a physical-phone performance result.

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0. [Editable geographic databases and licence offer](../../data/wukari/phase7/README.md). Code remains AGPL-3.0-or-later with upstream Allworld credit. The study source hash pins the existing Phase 6 aggregate; the original national PBF, local sources and importer were not modified.

## Validation status

The focused suite passes **52 tests**, including actual town spawn movement/clearance and real-footprint refusal, projection/LGA containment, thin-wall and concave-footprint collision checks, sprint/diagonal/frame-gap behavior, restriction/bounds and compass checks, and Windows diagnostic parsing. Strict focused Vue/TypeScript checks and the final static build pass. Browser acceptance verifies real-road walking and sprinting, camera rotation, corridor blocking without building penetration, map pause, FUW spawn refusal, touch movement/release/look, exploration and no horizontal overflow/runtime/network errors. The final town renderer uses 13 draw calls and 5,652 triangles in the recorded browser run; this is not a physical-device performance certificate. The existing >500 KiB build-chunk advisory remains.

Screenshots: [desktop](evidence/phase7-desktop.png), [mobile 390 × 844](evidence/phase7-mobile.png), [FUW map](evidence/phase7-fuw-review.png). Machine evidence: [browser checks](evidence/phase7-browser.json).

The **full-project checker remains incomplete**, not green. One resumed full run was stopped after sustained local resource pressure; an earlier session was interrupted. Targeted investigation reproduced ES-only `fetch` context errors in existing festival/world-event browser modules, the installed Worker library's required `ignoreBOM` option on the existing token constructor expression, and strict-JS fixture parameter typing. The full token import graph also exhausted a roughly 4 GiB heap in an isolated attempt. These findings and exact validation limits are in [the type investigation record](evidence/phase7-types.json).

Only the narrow Windows CRLF diagnostic-parser bug and wrapper-test environment portability were repaired here. Fixture module type is now explicit; signal termination assertions check the real Windows exit metadata. No baseline was expanded and no source error, timeout, assertion, or project was disabled. Two intermediate wrapper fixtures timed out while competing with the full compiler; the same tests/timeouts pass without that contention. Broader host-library and test-ownership contracts are documented for follow-up rather than changing unrelated account/festival behavior in a geographic prototype.
