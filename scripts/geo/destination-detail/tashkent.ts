import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, inlandWaterQuery } from './queries.ts'

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
  "name": "Tashkent",
  "box": [
    41.13145541006602,
    69.03884936609705,
    41.49321718993398,
    69.51856643390295
  ],
  "core": [
    41.267116077516505,
    69.21886841970478,
    41.35755652248349,
    69.33854738029522
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/563751850",
      "line": "Novza (Hamza), a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/141676147",
      "line": "Blue domes, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/103133045",
      "line": "Tashkent International University of Education, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/105820896",
      "line": "Отделение хирургии, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/968053066",
      "line": "\"Yangi Uzbekistan\" park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/174498975",
      "line": "Chorsu Bazaar, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/12423118883",
      "line": "Church of the Holy Equal-to-the-Apostles Grand Duke Vladimir, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/1857704645",
      "line": "Independence Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/87902526",
      "line": "Ministry of Defense of the Republic of Uzbekistan (МО РУз), a mapped place for the game."
    },
    {
      "key": "osm-relation-9423158",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/9423158",
      "line": "Tashkent Higher Military Technical School of the Ministry of Internal Affairs of the Republic of Uzbekistan, a mapped place for the game."
    },
    {
      "key": "osm-relation-6805138",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/6805138",
      "line": "Lokomotiv, a mapped place for the game."
    },
    {
      "key": "osm-way-1213517675",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1213517675",
      "line": "Khabadtepa, a mapped place for the game."
    },
    {
      "key": "osm-way-394577950",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/394577950",
      "line": "Kulaktepa, a mapped place for the game."
    },
    {
      "key": "osm-way-107158839",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/107158839",
      "line": "Kugaittepa, a mapped place for the game."
    },
    {
      "key": "osm-way-325125766",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/325125766",
      "line": "Tashkent Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-89407157",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/89407157",
      "line": "Tashkent State Transport University, a mapped place for the game."
    },
    {
      "key": "osm-relation-2712835",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/2712835",
      "line": "The Uzbekistan State University of World Languages, a mapped place for the game."
    },
    {
      "key": "osm-way-908354621",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/908354621",
      "line": "Memorial complex \"Victory Park\", a mapped place for the game."
    },
    {
      "key": "osm-way-143446111",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/143446111",
      "line": "Koh Аta, a mapped place for the game."
    },
    {
      "key": "osm-way-982206779",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/982206779",
      "line": "Rakat, a mapped place for the game."
    },
    {
      "key": "osm-way-173258737",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/173258737",
      "line": "Milliy stadioni, a mapped place for the game."
    },
    {
      "key": "osm-way-749136173",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/749136173",
      "line": "Tashkent City Park, a mapped place for the game."
    },
    {
      "key": "osm-node-4246680743",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4246680743",
      "line": "Полина, a mapped place for the game."
    },
    {
      "key": "osm-node-4792118722",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4792118722",
      "line": "Курица гриль, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10048545842",
      "ref": "node/10048545842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10048545843",
      "ref": "node/10048545843",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10119466212",
      "ref": "node/10119466212",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1866061222",
      "ref": "node/1866061222",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10048512588",
      "ref": "node/10048512588",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10119542204",
      "ref": "node/10119542204",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10122671692",
      "ref": "node/10122671692",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10122671693",
      "ref": "node/10122671693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10122671695",
      "ref": "node/10122671695",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10122671696",
      "ref": "node/10122671696",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10270018300",
      "ref": "node/10270018300",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10280219970",
      "ref": "node/10280219970",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10287321478",
      "ref": "node/10287321478",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10316267641",
      "ref": "node/10316267641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10567089451",
      "ref": "node/10567089451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10567089452",
      "ref": "node/10567089452",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10567707281",
      "ref": "node/10567707281",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10572408711",
      "ref": "node/10572408711",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-17950126",
      "ref": "relation/17950126",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
