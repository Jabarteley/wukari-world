# Sources and provenance

Status checked 2026-10-20. “Pinned” means a known expected identity/hash; “retrieved” means bytes actually available. A checksum does not establish survey accuracy, contemporary boundaries or legal access.

| Source | Licence | Evidence and status |
| --- | --- | --- |
| [geoBoundaries gbOpen Nigeria](https://www.geoboundaries.org/api/current/gbOpen/NGA/) | CC BY 4.0 collection; repository records original GRID3, year 2022 | API request returned HTTP 403. The latest API was not used to replace the pinned release |
| Nigeria ADM1, release `9469f09` | CC BY 4.0 | Existing repository file verified: 2,289,696 bytes, SHA-256 `64fa218ac3d453cc1e66412ff461c5dfa1a4a1ade0da93b239a9891b587d28f9`. Taraba identified by `shapeISO=NG-TA`, `shapeID=27671186B83252759475924`, `shapeType=ADM1`, `shapeGroup=NGA` |
| [Nigeria ADM2 payload](https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2.geojson) | CC BY 4.0 | **Not retrieved**. Expected 9,422,551 bytes, SHA-256 `bef7f2cfa45e012f4772eaa61c7b99e5188aeba4d5c6badae7e9f9aae8c02fcd`. Pin agrees between upstream `scripts/geo/nigeria-boundaries.ts` and retrieved Git LFS pointer. Wukari shapeID/geometry not yet verified |
| [GitHub raw ADM2 pointer](https://raw.githubusercontent.com/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2.geojson) | Source pointer, not map geometry | Retrieved 132-byte Git LFS pointer identifying the expected ADM2 SHA-256/size; **not imported as GeoJSON**. Simplified GeoJSON and metadata endpoints also returned LFS pointers |
| [OpenStreetMap / Overpass](https://overpass-api.de/api/interpreter) | ODbL 1.0, © OpenStreetMap contributors | Discovery request returned proxy CONNECT HTTP 403. No Wukari OSM objects, IDs, coordinates, capture date, coverage or university way/relation verified. Committed query is an acquisition recipe only |
| FUW official institutional information | Website text/media may retain copyright | Required for corroboration. No page retrieved or campus boundary established in this task. Handoff’s Katsina-Ala Road address is context pending source capture, not a geocoded entrance |
| Ground observations / licensed elevation | Unknown until acquired | Not acquired; no access, height, gate, terrain or building-use claim |
| `data/wukari/fixtures/*.synthetic.json` | Original project fixture, AGPL-3.0-or-later | Invented geometry/IDs explicitly marked synthetic, located away from Wukari. No geographic evidence |

Canonical source URLs/pins are in `scripts/wukari/sources.ts`; existing ADM1 data is `scripts/geo/sources/nigeria-adm1-9469f09.geojson`. Full upstream geographic/asset attributions remain in `NOTICE.md`.

## Network evidence and outstanding action

API/Overpass/media requests returned HTTP 403 in this running instance; the Overpass response explicitly reported a failed proxy CONNECT tunnel. These results do not establish that the datasets are absent. GitHub’s small raw pointer files were accessible. No authentication token is required or requested for these public datasets.

The environment draft records required custom domain additions: `www.geoboundaries.org`, `overpass-api.de`, `media.githubusercontent.com`. The owner subsequently requested a draft pull request; `api.github.com` was also added after the GitHub API returned Forbidden (Git access to the fork works). The existing package-manager preset is preserved. Review and save those settings, then publish the environment; saving a draft does not make the running proxy permit requests. Retry the exact affected operations after the configuration takes effect. Alternate data must have a documented licence and independent pin; never bypass integrity checks.

## Provenance contract

For real import, store source URL, release where applicable, exact bytes/hash, actual retrieval timestamp, exact Overpass query and query hash, OSM base timestamp and original node/way/relation IDs, tags/references, raw WGS84 numbers and transformation notes. Import time is separate from retrieval time. Generated `.cache/wukari/dataset.json` embeds this record; raw boundary/OSM files are retained beside it. The ADM2 pin identifies the national input; the selected feature retains its original shapeID.

The importer verifies the caller-supplied OSM checksum against the supplied bytes; it does not authenticate the caller’s acquisition claims or independently prove they came from Overpass. Human source review and query/response audit remain required. For a different provider or a newer boundary release, review and update source requirements deliberately rather than accepting an arbitrary file by name.

Before promoting real data, add a reviewed coverage inventory: campus-boundary status, road/path/building counts, unassembled relations, incomplete ways, unmapped areas, stale or conflicting names, access uncertainties, and every deliberate simplification. Rendered OSM ways remain source geometry; no topology repair or geometry clipping is silently applied.
