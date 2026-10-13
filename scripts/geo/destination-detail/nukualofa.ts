import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, coastWaterQuery } from './queries.ts'

export const CONFIG = {
...{
  "cell": 0.004,
  "grow": 2,
  "split": 12,
  "shore": 0,
  "minHole": 40,
  "minRoadKm": 0.7,
  "maxRoads": 700,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Nuku'alofa",
  "box": [
    -21.315220989933977,
    -175.39466250638603,
    -20.953459210066022,
    -175.00895349361397
  ],
  "core": [
    -21.179560322483493,
    -175.2499772599003,
    -21.089119877516506,
    -175.1536387400997
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3123610897",
      "line": "Ferry to Islands, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3187993645",
      "line": "'Oholei, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/317154071",
      "line": "Kolovai Community Public Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/319055128",
      "line": "Mu'a Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/380697400",
      "line": "Tukingapahu, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/314822748",
      "line": "Prison Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/313663820",
      "line": "Nuku'alofa Tonga Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/318689869",
      "line": "Makatolo a Maui Community Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/5466637492",
      "line": "MAFF, a mapped place for the game."
    },
    {
      "key": "osm-relation-5274828",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/5274828",
      "line": "The University of the South Pacific Tonga Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-307249636",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/307249636",
      "line": "Teufaiva Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-687265667",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/687265667",
      "line": "Ha'amonga 'a Maui, a mapped place for the game."
    },
    {
      "key": "osm-way-307399349",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/307399349",
      "line": "Royal Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-314371836",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/314371836",
      "line": "Siasi 'o Tonga, a mapped place for the game."
    },
    {
      "key": "osm-relation-5274827",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/5274827",
      "line": "Loto-Tonga Soka Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-320590185",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/320590185",
      "line": "Cathedral of the Immaculate Conception of Mary, a mapped place for the game."
    },
    {
      "key": "osm-node-6441638780",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6441638780",
      "line": "Royal Sunset, a mapped place for the game."
    },
    {
      "key": "osm-node-12072562069",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12072562069",
      "line": "Fishing pigs (on low tide), a mapped place for the game."
    },
    {
      "key": "osm-node-1234123401",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1234123401",
      "line": "Pupu'a puhi, a mapped place for the game."
    },
    {
      "key": "osm-way-300336346",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/300336346",
      "line": "Vainī Hosptial, a mapped place for the game."
    },
    {
      "key": "osm-way-319048856",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/319048856",
      "line": "Fale Kai, a mapped place for the game."
    },
    {
      "key": "osm-way-323956968",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/323956968",
      "line": "Maketi Talamahu, a mapped place for the game."
    },
    {
      "key": "osm-way-338584633",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/338584633",
      "line": "Fa'onelua Park, a mapped place for the game."
    },
    {
      "key": "osm-node-3230856831",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3230856831",
      "line": "Maketi Siamelie, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3123441515",
      "ref": "node/3123441515",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3123441524",
      "ref": "node/3123441524",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3123441526",
      "ref": "node/3123441526",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3123441527",
      "ref": "node/3123441527",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3285371161",
      "ref": "node/3285371161",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3285371162",
      "ref": "node/3285371162",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3285506962",
      "ref": "node/3285506962",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3285506963",
      "ref": "node/3285506963",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3285506964",
      "ref": "node/3285506964",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3382083446",
      "ref": "node/3382083446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3382083447",
      "ref": "node/3382083447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3382083448",
      "ref": "node/3382083448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3382083449",
      "ref": "node/3382083449",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3426231321",
      "ref": "node/3426231321",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3456887955",
      "ref": "node/3456887955",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3463254660",
      "ref": "node/3463254660",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3879233600",
      "ref": "node/3879233600",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3889814113",
      "ref": "node/3889814113",
      "kind": "neighbourhood"
    }
  ],
  "wideWater": true,
  "sea": {
    "kind": "coast",
    "bandMetres": 40000
  }
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: coastWaterQuery,
} satisfies DetailConfig
