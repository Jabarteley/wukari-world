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
  "name": "Yaren",
  "box": [
    -0.7279872899339784,
    166.73667116198516,
    -0.36622551006602155,
    167.09602463801485
  ],
  "core": [
    -0.5923266224834947,
    166.87142994096226,
    -0.5018861775165053,
    166.96126585903775
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5749424707",
      "line": "Bondi Beach, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/357945014",
      "line": "Nauru College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/520015485",
      "line": "Nauru Medical Centre, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1184486003",
      "line": "Ella Park, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/160584951",
      "line": "Church of Christ the King, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/126994205",
      "line": "Civic Centre; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/160603356",
      "line": "Government Building, a mapped place for the game."
    },
    {
      "key": "osm-way-1184110658",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1184110658",
      "line": "University of the South Pacific (Nauru Campus), a mapped place for the game."
    },
    {
      "key": "osm-node-6717696888",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6717696888",
      "line": "Bunker, a mapped place for the game."
    },
    {
      "key": "osm-node-6936364885",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6936364885",
      "line": "Naoero Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-12057081469",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12057081469",
      "line": "Crystal’s restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-5943958387",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5943958387",
      "line": "Lagoon viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-node-10994324451",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10994324451",
      "line": "Tropicana Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-4898470422",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4898470422",
      "line": "Japanese WWII Gun, a mapped place for the game."
    },
    {
      "key": "osm-node-10994460231",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10994460231",
      "line": "Japanese WWII guns and bunker, a mapped place for the game."
    },
    {
      "key": "osm-node-6715040385",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6715040385",
      "line": "Gun, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-313728509",
      "ref": "node/313728509",
      "kind": "neighbourhood"
    },
    {
      "id": "district-313728503",
      "ref": "node/313728503",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5749424186",
      "ref": "node/5749424186",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406312407",
      "ref": "node/1406312407",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310763",
      "ref": "node/1406310763",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310784",
      "ref": "node/1406310784",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406312402",
      "ref": "node/1406312402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5807533899",
      "ref": "node/5807533899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310789",
      "ref": "node/1406310789",
      "kind": "neighbourhood"
    },
    {
      "id": "district-313728507",
      "ref": "node/313728507",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6597709641",
      "ref": "node/6597709641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310809",
      "ref": "node/1406310809",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310818",
      "ref": "node/1406310818",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310781",
      "ref": "node/1406310781",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310812",
      "ref": "node/1406310812",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1406310806",
      "ref": "node/1406310806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10307751505",
      "ref": "node/10307751505",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10307798512",
      "ref": "node/10307798512",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
