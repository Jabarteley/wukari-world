# Wukari geographic inputs

No Wukari geographic extract has been imported yet. `fixtures/` contains original **synthetic test data at the equator/prime meridian**, not real locations. Fixture IDs are invented test identifiers, never actual OSM references. They cannot pass the real importer’s pinned ADM2 checksum.

The existing pinned Taraba ADM1 source is in `scripts/geo/sources/nigeria-adm1-9469f09.geojson`; it is state context, not a Wukari or campus outline. Exact source pins: `scripts/wukari/sources.ts`. Coverage and download evidence: `docs/wukari/SOURCES.md`.

`discover-fuw.overpassql` is a discovery query, not a campus verification or a complete town extract. Keep its exact response and acquisition timestamp. Inspect returned university ways/relations and corroborate them before choosing a campus candidate. A node or relation is not automatically converted into a campus boundary. A relation needs a tested multipolygon assembler in a later milestone.

After verified campus discovery, query roads, paths, buildings, landuse, water and public POIs in a deliberately bounded campus study area derived from the recorded geometry. Save that exact query as well. Do not treat the study box as a legal campus/town extent. Obtain a suitable licensed extract for the whole town/LGA instead of issuing an unbounded Overpass request.

Imported raw bytes, dataset, hashes, timestamps, exact OSM query, IDs and coverage are retained in ignored `.cache/wukari/`. Inspect and curate source records for review before committing real data; do not commit an unreviewed national dump.
