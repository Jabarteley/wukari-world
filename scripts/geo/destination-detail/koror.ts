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
  "name": "Koror",
  "box": [
    7.162394110066022,
    134.29545409185195,
    7.524155889933978,
    134.65789930814807
  ],
  "core": [
    7.298054777516506,
    134.43138508515648,
    7.3884952224834946,
    134.52196831484355
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1389401974",
      "line": "Koror Port, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1385949667",
      "line": "Okemii Cafe, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/436679194",
      "line": "Palau Public Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/515651236",
      "line": "Belau National Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/54438039",
      "line": "Asahi Baseball Field, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/515653366",
      "line": "WCTC Shopping Center, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/9530465481",
      "line": "Nan'yō Shinto Shrine, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "node/367695820"
      },
      "ref": "node/367695820",
      "line": "Palau Supreme Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1178068090",
      "line": "Capitol, a mapped place for the game."
    },
    {
      "key": "osm-way-35783457",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/35783457",
      "line": "National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-4031085076",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4031085076",
      "line": "Airai Bai, a mapped place for the game."
    },
    {
      "key": "osm-node-9049179001",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9049179001",
      "line": "Meteu 'L Klechem, a mapped place for the game."
    },
    {
      "key": "osm-way-436679168",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/436679168",
      "line": "Sacred Heart Church, a mapped place for the game."
    },
    {
      "key": "osm-way-436679166",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/436679166",
      "line": "Belau National Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-6257235586",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6257235586",
      "line": "Natinal, a mapped place for the game."
    },
    {
      "key": "osm-node-357256713",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/357256713",
      "line": "Palau Crocodile Preserves, a mapped place for the game."
    },
    {
      "key": "osm-node-6257235485",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6257235485",
      "line": "Airport Entrance, a mapped place for the game."
    },
    {
      "key": "osm-node-1384146475",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1384146475",
      "line": "Elilai, a mapped place for the game."
    },
    {
      "key": "osm-node-13333745401",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13333745401",
      "line": "Sakura, a mapped place for the game."
    },
    {
      "key": "osm-node-357256793",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/357256793",
      "line": "Ngaremeduu Bay Conservation Area, a mapped place for the game."
    },
    {
      "key": "osm-way-441805822",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/441805822",
      "line": "Surangel's Supercenter, a mapped place for the game."
    },
    {
      "key": "osm-node-9530641571",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/9530641571",
      "line": "Fish Market, a mapped place for the game."
    },
    {
      "key": "osm-node-4080475589",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4080475589",
      "line": "Belau Medical Clinic, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-8639535709",
      "ref": "node/8639535709",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9532469881",
      "ref": "node/9532469881",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8639535708",
      "ref": "node/8639535708",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1128091099",
      "ref": "node/1128091099",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1128091088",
      "ref": "node/1128091088",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1384176373",
      "ref": "node/1384176373",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4244310289",
      "ref": "node/4244310289",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1128090972",
      "ref": "node/1128090972",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1128090958",
      "ref": "node/1128090958",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1128091042",
      "ref": "node/1128091042",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8661310121",
      "ref": "node/8661310121",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8129702232",
      "ref": "node/8129702232",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12048007642",
      "ref": "node/12048007642",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8661285904",
      "ref": "node/8661285904",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9532469883",
      "ref": "node/9532469883",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9532469882",
      "ref": "node/9532469882",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12048007641",
      "ref": "node/12048007641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4571435900",
      "ref": "node/4571435900",
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
