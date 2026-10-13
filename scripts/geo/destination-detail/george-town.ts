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
  "name": "George Town",
  "box": [
    19.114474010066022,
    -81.57134407520206,
    19.476235789933977,
    -81.19021112479794
  ],
  "core": [
    19.250134677516506,
    -81.4283794928012,
    19.340575122483493,
    -81.3331757071988
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1129818287",
      "line": "Royal Watler Cruise Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/697199526",
      "line": "Rum Point, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/369192329",
      "line": "Teacher Reedly Powery Memorial Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/566218708",
      "line": "Health Services Authority, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1134311986",
      "line": "Malportas Bird Sanctuary, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5312819266",
      "line": "Farmer's Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/370952623",
      "line": "St. Ignatius Catholic Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/5312685993",
      "line": "Heliconia Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/81123667",
      "line": "Department of Vehicle and Driver's Licensing, a mapped place for the game."
    },
    {
      "key": "osm-node-6340499785",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6340499785",
      "line": "starfish point, a mapped place for the game."
    },
    {
      "key": "osm-node-778613443",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/778613443",
      "line": "National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-369024905",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/369024905",
      "line": "Cayman Motor Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-62225884",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/62225884",
      "line": "Cayman Turtle Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-374313515",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/374313515",
      "line": "Pankin's Jerk Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-372662553",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/372662553",
      "line": "The Lighthouse, a mapped place for the game."
    },
    {
      "key": "osm-way-615434121",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/615434121",
      "line": "Public Beach, a mapped place for the game."
    },
    {
      "key": "osm-node-5322136279",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/5322136279",
      "line": "Airport Park, a mapped place for the game."
    },
    {
      "key": "osm-way-62088563",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/62088563",
      "line": "The Market at the Cricket Grounds, a mapped place for the game."
    },
    {
      "key": "osm-node-1550931122",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1550931122",
      "line": "Hell, a mapped place for the game."
    },
    {
      "key": "osm-way-217613994",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/217613994",
      "line": "Dolphin Mall, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-282125801",
      "ref": "node/282125801",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206774",
      "ref": "node/281206774",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206775",
      "ref": "node/281206775",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206777",
      "ref": "node/281206777",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206778",
      "ref": "node/281206778",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206781",
      "ref": "node/281206781",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206847",
      "ref": "node/281206847",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281206849",
      "ref": "node/281206849",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125645",
      "ref": "node/282125645",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125804",
      "ref": "node/282125804",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125816",
      "ref": "node/282125816",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125850",
      "ref": "node/282125850",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125889",
      "ref": "node/282125889",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125894",
      "ref": "node/282125894",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282125899",
      "ref": "node/282125899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-282126175",
      "ref": "node/282126175",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5576754798",
      "ref": "node/5576754798",
      "kind": "neighbourhood"
    },
    {
      "id": "district-572960425",
      "ref": "node/572960425",
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
