# FUW geographic coverage report

Generated from exact dataset SHA-256: `9dece439bd87b8f4883d7e42f3704275bf1102f98310d6e0cb09b181e3398750`. Counts describe imported source records, not independently surveyed coverage.

| Measure | Result |
| --- | --- |
| Imported roads / footpaths | 2644 |
| Imported building footprints | 40496 |
| Source-backed named landmark records (whole extract) | 2 |
| Campus landmark assignment | Unknown: no campus extent or corroborated campus feature selection |
| Independently field-verified features | 0 |
| Campus boundary | unknown |
| Road graph nodes / components | 39681 / 94 |
| Estimated campus geographic coverage | Unknown; no supported denominator |
| Incomplete ways / unassembled relations | 0 / 21 |
| Elevation / playable campus | Unavailable / no |

Connectivity uses original shared OSM node references, not visual intersections or proximity. It does not establish public access, pedestrian connectivity or a safe spawn. Named records may describe the same landmark; counts are not unique real-world venues. Imported non-campus features must not be advertised as FUW.

## Sources, licenses and hashes

Original provenance is preserved below. OSM records are source-backed, not field-verified. The administrative boundary is Wukari LGA, not a campus extent.

```json
{
  "sourceUrl": "https://download.geofabrik.de/africa/nigeria-261019.osm.pbf",
  "retrievedAt": "2026-10-20T13:45:24Z",
  "retrievalTimeBasis": "Original Windows file LastWriteTimeUtc: download completion estimate, not an authenticated HTTP retrieval receipt",
  "license": "ODbL-1.0",
  "attribution": "© OpenStreetMap contributors, https://www.openstreetmap.org/copyright",
  "sha256": "de8808ae5ab14fbad5b0eab96918a75fb773eca563caf7162add5e5f657791bd",
  "mode": "source-data",
  "scope": "Pinned Wukari LGA polygon node selection and complete ways; strict contained valid ways retained unchanged. Crossing/invalid ways journaled in excluded.json; full originals remain in complete regional PBF/JSON. Untagged unused nodes omitted; relations retained unassembled.",
  "derivedFrom": {
    "schemaVersion": 1,
    "sourceFile": "nigeria-261019.osm.pbf",
    "sourceBytes": 711541464,
    "sourceSha256": "d3e80afbf39da31e660d5f13fbb092bd246cdf8830c149f9d1bee4902e0c92bb",
    "validatedAt": "2026-10-20T22:58:36.384458+00:00",
    "header": {
      "generator": "osmium/1.16.0",
      "osmosis_replication_timestamp": "2026-10-19T20:21:11Z",
      "osmosis_replication_sequence_number": "4937",
      "osmosis_replication_base_url": "https://download.geofabrik.de/africa/nigeria-updates"
    },
    "nationalRecords": {
      "nodes": 134849010,
      "ways": 21689506,
      "relations": 54213
    },
    "boundarySha256": "fdf3cf2421d730ca7bb0f0297b8a0b8a32058f5d95b4c1a4ced6e8c959c7a1fc",
    "tool": "PyOsmium 4.3.2",
    "command": [
      "python",
      "scripts/wukari/local-pbf.py",
      "--input",
      "Downloads/nigeria-261019.osm.pbf",
      "--out",
      ".cache/wukari/local-pbf-20261020"
    ],
    "selectedPolygonNodes": 423290,
    "completeWays": 44017,
    "extractedRecords": 478822,
    "relations": "touching selected nodes/ways; not recursively completed or assembled",
    "operation": "Polygon node selection, complete original ways, complete referenced nodes; no clipping or coordinate changes",
    "outputs": {
      "wukari-complete.json": {
        "bytes": 72587585,
        "sha256": "f33d8596d3506cf720ff21b69061c6f8c00a7b4caca19bbb19a122122d0c1cf1"
      },
      "wukari-complete.osm.pbf": {
        "bytes": 1306103,
        "sha256": "1286ba72cc4ed9b902821afdf69340ec3603af23723e7b93b2d053ea197e0d47"
      }
    }
  },
  "validation": "Every retained record passed existing offline importer in reference-complete <=32 MiB batches; aggregate identity union checked",
  "batches": [
    {
      "name": "batch-01",
      "sourceSha256": "86e336f879c03a966a252833b881679960f1dbbf429f3b869a4991f79179dbae",
      "sourceBytes": 10146857,
      "datasetSha256": "432a313cb88ee212ad4e2274ce2b4ff5ca17bfc36fa78601adfb12d060c97686"
    },
    {
      "name": "batch-02",
      "sourceSha256": "aa09daf7ceeedb62dbb720e30bb928177d197669e8422040b86ffefd6bc72227",
      "sourceBytes": 6501311,
      "datasetSha256": "f9609e6dca966589d7decd8e8e5499f48fd7b979d9dce635d4e2d0a52c1820d4"
    },
    {
      "name": "batch-03",
      "sourceSha256": "3347e496eaaf6783cc672f015108a3d5c37245e6afa608bc26644a37434b1f5b",
      "sourceBytes": 6723050,
      "datasetSha256": "7caf3960b9494d5c06626c98683ad5a3b6fc6902cbf5540da5bd74f440cd7d16"
    },
    {
      "name": "batch-04",
      "sourceSha256": "51a7fb28190cb0090eab5f77f74039ea6620b71a2a84d4299df7a45798abdf23",
      "sourceBytes": 10827854,
      "datasetSha256": "35e0b1dba574f9205ff365737798126ae792e345f2c02098d681230bd6537fdc"
    },
    {
      "name": "batch-05",
      "sourceSha256": "4d99647560b53254d71bf428c18050afa9e46a3effd24ccf6b9cc57dea596081",
      "sourceBytes": 10257911,
      "datasetSha256": "2f46c61a730e797a7e071c95f8c63480757e17b36f71959501d9cd063120a9de"
    },
    {
      "name": "batch-06",
      "sourceSha256": "87160733760b926a5f0c80de3be86d6e201f0d761ba0cad722d856001a1c6b8a",
      "sourceBytes": 8463420,
      "datasetSha256": "0475d0105a3023cf2b581937783cecc07cc46478dba1faed41520193b665a8e4"
    },
    {
      "name": "batch-07",
      "sourceSha256": "343a3bd555b630da991bf2a1edbfd3fb8d748c20782cc111fc6a0deb47552532",
      "sourceBytes": 3664447,
      "datasetSha256": "7623e212174d347814f000de9fe7223b6dcc6a5c83d6cf0e0bdad39f660efd22"
    },
    {
      "name": "batch-08",
      "sourceSha256": "38ff7fcc59b6edf4a25d3abe91fb05f3171b3a1bc90906659ba8b738410b759c",
      "sourceBytes": 3646104,
      "datasetSha256": "5ee3a37d0a0d4dcfe4a99b25d2ea95d7d022674812452e6777ee6cf898dbace1"
    },
    {
      "name": "batch-09",
      "sourceSha256": "73b0a97d470f37967822cbd15eb39733c85a55c6acce584e3b193cd7ef13e09a",
      "sourceBytes": 2744416,
      "datasetSha256": "3c2d29bd84cec72fdb3ff56386918ce5ae89138032554bc11ba7704264c05be2"
    }
  ],
  "fieldVerified": false
}
```

## Missing input and next action

A licensed FUW-area extract with complete original nodes/ways, actual source URL/query, retrieval time, original bytes and hashes is required. Campus boundary may remain unknown; independently corroborated campus-area roads/buildings can be reviewed separately. No road/building geometry or coordinates may be guessed. Public access, safe ground/spawn, terrain, building heights, campus scope and independent verification remain unestablished. Use DATA_TRANSFER.md to prepare, transfer and import the source, then regenerate this report and review coverage before enabling gameplay.
