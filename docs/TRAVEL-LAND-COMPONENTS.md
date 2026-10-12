# Generated road land components

Generated roads require two city endpoints on the same known component of pinned Natural Earth 10m land geometry. This is a necessary land condition for beta game travel estimates. It does not establish a surveyed road, legal border access or a bus schedule. Authored road and rail links retain priority; air admission, fare formulas and timetable clamps are unchanged.

The compact table records exact city IDs, catalogue coordinates and country IDs. A new or changed endpoint without matching evidence receives no implicit road. An unresolved source membership is recorded as `null`; it does not block air travel or authored links. Maputo's current centre is unresolved in this reference coastline and remains unchanged.

Regenerate the table whenever the city catalogue, endpoint coordinates, country identities or generator change. Use the cached full source, including Nigeria, with SHA-256 `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255` and byte count `13287234`. Its pinned upstream reference is [Natural Earth at ca96624](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_admin_0_countries.geojson). Keep that raw source and the proof outside the repository.

```sh
python3 scripts/city/build-land-components.py \
  --source "$LAND_SOURCE" \
  --catalogue src/game/cities/catalogue.generated.ts \
  --out "$LAND_PROOF" \
  --typescript src/game/cities/land-components.generated.ts
npm run cities:land:check
```

`LAND_SOURCE` is the local pinned source path; `LAND_PROOF` is a private output JSON path. The generator requires Python 3 and its standard library. Neither generation nor the freshness check downloads data. No nearest-coast buffer or changed city coordinate is allowed to resolve an unknown point.

Review unresolved and ambiguous city memberships in the proof before integrating the generated table. Shared positive-length source edges connect polygons, including enclave borders; different islands are separate. Exact collinear interval overlap handles split boundary vertices, while point-only contact does not join land. Unsupported wrapped segments fail closed.

`prebuild` and `pretest` check catalogue and generator hashes plus every endpoint before running. The check performs no geometry processing and loads no raw global source. All continent integrations must run regeneration after their catalogue update and include the resulting compact table in the reviewed change.
