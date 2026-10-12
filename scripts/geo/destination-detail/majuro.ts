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
  "name": "Majuro",
  "box": [
    6.910111510066022,
    171.20051637022945,
    7.271873289933978,
    171.56275442977054
  ],
  "core": [
    7.045772177516506,
    171.33636919199816,
    7.1362126224834945,
    171.42690160800183
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/11598607812",
      "line": "CMI Bus Stop, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3261641988",
      "line": "Jay's Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/259725395",
      "line": "USP, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/3884917",
      "line": "Leroij Atama Zedkeia Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/842953154",
      "line": "Iakwe Katoj Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3261643275",
      "line": "Wei Wei Store, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/259721827",
      "line": "Cathedral of the Assumption, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "node/3993101946"
      },
      "ref": "node/3993101946",
      "line": "RMI courts; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/3983257906",
      "line": "M.I.V.A, a mapped place for the game."
    },
    {
      "key": "osm-node-1583072058",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/1583072058",
      "line": "University of the South Pacific (USP), a mapped place for the game."
    },
    {
      "key": "osm-way-1333499846",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1333499846",
      "line": "Majuro Track and Field Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-87621879",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/87621879",
      "line": "Majuro Bridge, a mapped place for the game."
    },
    {
      "key": "osm-node-2698631328",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2698631328",
      "line": "Tide Table Restaurant & Lounge, a mapped place for the game."
    },
    {
      "key": "osm-node-9956412121",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9956412121",
      "line": "Seagull, a mapped place for the game."
    },
    {
      "key": "osm-node-11103492901",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/11103492901",
      "line": "NDES, a mapped place for the game."
    },
    {
      "key": "osm-way-977982606",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/977982606",
      "line": "Marshall Islands War Memorial Park, a mapped place for the game."
    },
    {
      "key": "osm-node-3993102171",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3993102171",
      "line": "Alele National Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-1563948641",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1563948641",
      "line": "Enra Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-2698631329",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2698631329",
      "line": "DAR Coffee Corner, a mapped place for the game."
    },
    {
      "key": "osm-node-3261641985",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3261641985",
      "line": "Island Cafe, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-358211084",
      "ref": "node/358211084",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358212375",
      "ref": "node/358212375",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5214772137",
      "ref": "node/5214772137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13116043945",
      "ref": "node/13116043945",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358210731",
      "ref": "node/358210731",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358210793",
      "ref": "node/358210793",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358211291",
      "ref": "node/358211291",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358211766",
      "ref": "node/358211766",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358213498",
      "ref": "node/358213498",
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
