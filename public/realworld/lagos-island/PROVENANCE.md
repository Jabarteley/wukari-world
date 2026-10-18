# Lagos Island core, OpenStreetMap via Overpass

- Box (south, west, north, east): 6.445, 3.383, 6.462, 3.403
- Fetched: 2026-10-16 from https://overpass-api.de/api/interpreter
- File: osm-2026-10-16.json, sha256 fb52798e69bdc75b56f1abfc52709200cedee06d15c22beeffd63a9a2bba0f4d, 1612986 bytes
- Elements: 645 highway ways (196 named), 3573 buildings (1290 with height or building:levels), 19 water features, 57 land-use features
- Licence: ODbL 1.0, © OpenStreetMap contributors (https://www.openstreetmap.org/copyright). Compiled street tiles made from this file are a derivative database and are published under ODbL beside the game's AGPL source.

# Lagos Island core, Overture Maps buildings (fill for missing OpenStreetMap footprints)

- Box: the same as above (6.445, 3.383, 6.462, 3.403), selected by the `bbox` struct only.
- Release: Overture Maps `2026-09-23.1`, buildings theme, `s3://overturemaps-us-west-2/release/2026-09-23.1/theme=buildings/type=building/*` (anonymous, us-west-2). Query: `scripts/geo/fetch-lagos-island-overture.py`.
- File: overture-buildings.geojson, sha256 68b1b6b691ee805793d9fe0e832f704b9570cb7ae80445bf55d49564a5b3b77f, 2057757 bytes, 6018 rows (id, height, num_floors, class, subtype, source dataset names, exterior ring at 7 decimals).
- Merge (scripts/street/compile-mapped.ts): OSM footprints stay. An Overture footprint is added only if its centroid is not in an OSM ring, no OSM centroid is in it, its bounding box overlaps no OSM box by more than 30 % of the smaller box, and it does not touch a road centre-line buffer (half the drawn width plus 0.5 m). Added ones are `ovt:` ids; height is `height`, else `num_floors` x 3 m, else 6 m (residential), 9 m (commercial) or 7.5 m. Result: 1449 added (Google Open Buildings 1246, Microsoft ML Buildings 189, OpenStreetMap-via-Overture 14), 3928 skipped as overlapping OSM, 572 skipped on roads, 69 dropped by ring simplification (under 12 m2 or over 28 points).
- Licence: ODbL 1.0, © OpenStreetMap contributors, Overture Maps Foundation. Compiled street tiles are a derivative database published under ODbL.

## Overture Places (named shops, churches, offices), fetched 2026-10-16

`overture-places.json`: 4,410 places inside the same box, from Overture Maps release `2026-09-23.1`, theme `places`, type `place`
(`s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*`, bbox filter on `bbox.xmin/xmax/ymin/ymax`), read with
DuckDB (`/tmp/overture-places.py`, kept out of the repo). Fields kept: `names.primary`, `basic_category`, `confidence`, lon, lat.
Licence: CDLA-Permissive 2.0 (Overture places theme). Attribution: "© Overture Maps Foundation". Top categories: fashion and apparel
stores 533, professional services 254, real-estate services 235, Christian places of worship 120, financial services 107.

## Open Buildings 2.5D Temporal heights (sampled 2026-10-16)

`open-buildings-heights.json`: a measured height for each of the 4,980 compiled footprints in `mapped.json` (ids identical: `osm:way:N`, `ovt:uuid`).
Dataset: Open Buildings 2.5D Temporal Dataset, Google Research, year 2023 (30 June 2023 composite), v1, 0.5 m GeoTIFFs in EPSG:32631 with bands
`building_fractional_count`, `building_height` (metres) and `building_presence` (0-1); effective resolution about 4 m.
Source: `gs://open-buildings-temporal-data/v1/geotiffs/103bc_2023_06_30/tile_qNSfrvnK9X8.tif` (964,442,493 bytes, GCS generation 1730366383158781,
md5 `9AfrFCqRByTrXTKp1mxRHQ==`, crc32c `8lOq/g==`). The covering tile is 964 MB, over the 400 MB budget, so it was NOT downloaded whole: the file is a
cloud-optimised GeoTIFF and only the box window (cols 14654-19363, rows 9468-13400, about 2.4 x 2.0 km at 0.5 m) was read with HTTP range requests
(cached as `/tmp/open-buildings/window-tile_qNSfrvnK9X8.npz`, 10.4 MB, sha256 b0e733fb944a103dd2254a895e2213129c86c11d38e2b3c194b8c65d22c4ac1f; so no sha256 of the whole tile exists, use the md5 above).
The neighbouring tile `103c4_2023_06_30/tile_HKIm1T8zqO4.tif` (59,867,088 bytes, sha256 e6821ca9f80a7281a09c1e4395d1f028640489d1d2470a11d4699cab19c6db11) was downloaded and
checked: it is nodata over the whole box, so it is not used. Manifest: `v1/manifests/11_EPSG_32631_2023_06_30.json`.
Output file sha256 3388d1bac0028f912e7ed403aeedea8b9a5c10377271b887ce59d7d90da1d468.
Method (`scripts/geo/sample-open-buildings-heights.py`): each ring is converted from street metres to lon/lat (`src/geo/frame.ts`, origin 3.4E 6.45N) and projected to UTM 31N; the
polygon is rasterised onto the 0.5 m grid (all pixels touched); `height_m` is the 75th percentile of `building_height` over in-footprint pixels with `building_presence` > 0.5
(roofs, not ground), rounded to 0.1 m; `presence` is the mean presence over all in-footprint pixels; `pixels` counts the pixels used. Footprints under 4 pixels would use a 9 x 9 pixel
neighbourhood of the centroid (none needed). `height_m` is null where no pixel passes the presence test (557 footprints).
Licence: CC BY 4.0 (chosen over ODbL). Attribution: "Open Buildings 2.5D Temporal Dataset (c) Google, CC BY 4.0" (https://sites.research.google/gr/open-buildings/temporal/).

## Roof colours from aerial imagery (sampled 2026-10-17)

`roof-colours.json`: one colour (#rrggbb) for each of the 4980 compiled footprints in `mapped.json`, merged by `scripts/street/compile-mapped.ts` as each building's `roof`.
Source: Maxar 2019 Lagos Mosaic (acquired 2019-06-05, 0.5 m, EPSG:32631, cloud-optimised GeoTIFF with 512 px JPEG tiles), published on OpenAerialMap:
https://oin-hotosm-temp.s3.amazonaws.com/5ea1b2b4411bed00056803b1/0/5ea1b2b4411bed00056803b2.tif (2,322,792,310 bytes; NOT downloaded whole: only this area's
window was read with HTTP range requests and cached at /tmp/roof-colours/window-lagos-island.npz, outside the repo).
Method (`scripts/geo/sample-roof-colours.py`): each ring converted from street metres to lon/lat (src/geo/frame.ts) and to UTM 31N, shrunk 0.6 m inward,
rasterised; a per-channel levels stretch over the window (1st and 99.5th percentiles) removes the haze cast; the darkest quarter and brightest twentieth
of the pixels are dropped and the per-channel median of the rest is the colour.
File sha256 d2120bab3c7ba14d37d4b6f3e517d71c91873cb644b567496cecf5bca782464d.
**Licence: CC BY-NC 4.0 (non-commercial use only).** Attribution: "Imagery (c) 2019 Maxar Technologies, CC BY-NC 4.0, via OpenAerialMap".
The owner decided on 2026-10-17 that the game is non-commercial for now and may use non-commercial sources for roof colours. If the game becomes
commercial, delete this file and recompile (the facade falls back to its palettes); the published street packs then carry no imagery-derived data.
