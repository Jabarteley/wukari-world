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
  "name": "Honiara",
  "box": [
    -9.61195778993398,
    159.77303481132108,
    -9.250196010066022,
    160.13747558867894
  ],
  "core": [
    -9.476297122483496,
    159.90971823454024,
    -9.385856677516506,
    160.00079216545979
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4960849349",
      "line": "Lunga, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4245819491",
      "line": "The Ofis, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/726022073",
      "line": "National Library Area, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/730959655",
      "line": "National Referal Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/330742477",
      "line": "Children's Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/281733741",
      "line": "Panatina Plaza, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/271790885",
      "line": "Holy Cross Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/5256850143",
      "line": "Honiara City Council; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/55093093",
      "line": "National Parliament of Solomon Islands, a mapped place for the game."
    },
    {
      "key": "osm-way-730970978",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/730970978",
      "line": "Solomon Islands National University - Panatina Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-613190463",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/613190463",
      "line": "Lawson Tama Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-4959354922",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4959354922",
      "line": "Vilu War Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-1370454204",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1370454204",
      "line": "Ranadi Campus, a mapped place for the game."
    },
    {
      "key": "osm-node-1958150211",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/1958150211",
      "line": "Solomon Islands National University, a mapped place for the game."
    },
    {
      "key": "osm-node-5591435621",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5591435621",
      "line": "Red Beach, a mapped place for the game."
    },
    {
      "key": "osm-node-5834144885",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5834144885",
      "line": "Sinking ship, a mapped place for the game."
    },
    {
      "key": "osm-node-5489888721",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5489888721",
      "line": "Hells Point, a mapped place for the game."
    },
    {
      "key": "osm-node-12097880001",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12097880001",
      "line": "Cozy Cove Café, a mapped place for the game."
    },
    {
      "key": "osm-node-1958123258",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1958123258",
      "line": "Jina Resturant, a mapped place for the game."
    },
    {
      "key": "osm-node-7138527971",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7138527971",
      "line": "Ausmart, a mapped place for the game."
    },
    {
      "key": "osm-way-1204579380",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1204579380",
      "line": "National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-730970960",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/730970960",
      "line": "Bulkshop, a mapped place for the game."
    },
    {
      "key": "osm-node-1958123256",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1958123256",
      "line": "National Referral Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-5961969347",
      "ref": "node/5961969347",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731581988",
      "ref": "node/9731581988",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8190210572",
      "ref": "node/8190210572",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8190210573",
      "ref": "node/8190210573",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8190210574",
      "ref": "node/8190210574",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731581989",
      "ref": "node/9731581989",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582090",
      "ref": "node/9731582090",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582091",
      "ref": "node/9731582091",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582092",
      "ref": "node/9731582092",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582093",
      "ref": "node/9731582093",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582164",
      "ref": "node/9731582164",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582165",
      "ref": "node/9731582165",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582166",
      "ref": "node/9731582166",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582167",
      "ref": "node/9731582167",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582168",
      "ref": "node/9731582168",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582175",
      "ref": "node/9731582175",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582176",
      "ref": "node/9731582176",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9731582177",
      "ref": "node/9731582177",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3592998",
      "ref": "relation/3592998",
      "kind": "water"
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
