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
  "name": "Georgetown",
  "box": [
    6.489505955503301,
    -58.32654562080386,
    6.984136989933978,
    -57.96453497919614
  ],
  "core": [
    6.758035877516505,
    -58.19077863542629,
    6.848476322483494,
    -58.10030196457371
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/364120892",
      "line": "West Bank Bus Park, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3248663257",
      "line": "Madinah Halaal Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/816669649",
      "line": "University of Guyana, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/817011409",
      "line": "St. Joseph Mercy Hosptial, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/5231005383",
      "line": "foulis play ground, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/108178345",
      "line": "Stabroek Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/222811604",
      "line": "Cathedral of Immaculate Conception, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/402568917",
      "line": "Georgetown City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/6601628",
      "line": "Parliament of the Republic of Guyana, a mapped place for the game."
    },
    {
      "key": "osm-way-818881326",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/818881326",
      "line": "Guyana School of Agriculture, a mapped place for the game."
    },
    {
      "key": "osm-way-576678606",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/576678606",
      "line": "Guyana National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-30765532",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/30765532",
      "line": "Guyana Zoo, a mapped place for the game."
    },
    {
      "key": "osm-relation-11213168",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/11213168",
      "line": "Georgetown Public Hospital Corporation, a mapped place for the game."
    },
    {
      "key": "osm-way-405708710",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/405708710",
      "line": "Castalaney House, a mapped place for the game."
    },
    {
      "key": "osm-way-403108105",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/403108105",
      "line": "Umana Yana, a mapped place for the game."
    },
    {
      "key": "osm-way-215619747",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/215619747",
      "line": "St. George's Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-405722320",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/405722320",
      "line": "Queenstown Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-4179922366",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4179922366",
      "line": "The Lotus, a mapped place for the game."
    },
    {
      "key": "osm-node-8060672985",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/8060672985",
      "line": "Farm land, a mapped place for the game."
    },
    {
      "key": "osm-node-8773177618",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/8773177618",
      "line": "2, a mapped place for the game."
    },
    {
      "key": "osm-way-408614791",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/408614791",
      "line": "Joe Chinese, a mapped place for the game."
    },
    {
      "key": "osm-way-403113847",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/403113847",
      "line": "Eve Leary Sports Ground, a mapped place for the game."
    },
    {
      "key": "osm-way-790600904",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/790600904",
      "line": "Diamond Market, a mapped place for the game."
    },
    {
      "key": "osm-way-479572609",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/479572609",
      "line": "Happy Acres Reserve, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-599686721",
      "ref": "node/599686721",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1019434884",
      "ref": "node/1019434884",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1096468872",
      "ref": "node/1096468872",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429671521",
      "ref": "node/13429671521",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429762315",
      "ref": "node/13429762315",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429785194",
      "ref": "node/13429785194",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429786396",
      "ref": "node/13429786396",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799150",
      "ref": "node/13429799150",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799151",
      "ref": "node/13429799151",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799152",
      "ref": "node/13429799152",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799153",
      "ref": "node/13429799153",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799154",
      "ref": "node/13429799154",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799155",
      "ref": "node/13429799155",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799156",
      "ref": "node/13429799156",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799157",
      "ref": "node/13429799157",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799158",
      "ref": "node/13429799158",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799159",
      "ref": "node/13429799159",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429799160",
      "ref": "node/13429799160",
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
