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
  "name": "Kingston",
  "box": [
    17.79033391006602,
    -76.98188459783609,
    18.152095689933976,
    -76.6037410021639
  ],
  "core": [
    17.925994577516505,
    -76.84004421729585,
    18.016435022483492,
    -76.74558138270413
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/353900429",
      "line": "Spanish Town Railway Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1137638468",
      "line": "Lilians, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/375253490",
      "line": "National Library of Jamaica, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/353080113",
      "line": "Bellevue Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28048272",
      "line": "National Heroes Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/881904829",
      "line": "Port Henderson Plaza, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/296160942",
      "line": "Holy Trinity Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/374570627",
      "line": "Emancipation Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/375256353",
      "line": "Jamaica National Heritage Trust, a mapped place for the game."
    },
    {
      "key": "osm-way-354944904",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/354944904",
      "line": "University of the West Indies (Mona), a mapped place for the game."
    },
    {
      "key": "osm-way-25886780",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/25886780",
      "line": "Sabina Park, a mapped place for the game."
    },
    {
      "key": "osm-way-262238296",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/262238296",
      "line": "Bob Marley museum, a mapped place for the game."
    },
    {
      "key": "osm-way-325781633",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/325781633",
      "line": "Kingston Public Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-4913756065",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4913756065",
      "line": "Trinity Moravian Church, a mapped place for the game."
    },
    {
      "key": "osm-way-173106442",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/173106442",
      "line": "Emancipation Park, a mapped place for the game."
    },
    {
      "key": "osm-way-374593273",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/374593273",
      "line": "Spanish Town Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-4956331011",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4956331011",
      "line": "National Gallery of Jamaica, a mapped place for the game."
    },
    {
      "key": "osm-node-2497592734",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2497592734",
      "line": "Mico University College, a mapped place for the game."
    },
    {
      "key": "osm-node-307991768",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/307991768",
      "line": "Negro Aroused, a mapped place for the game."
    },
    {
      "key": "osm-way-375141828",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/375141828",
      "line": "Shaare Shalom Synagogue, a mapped place for the game."
    },
    {
      "key": "osm-way-299256337",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/299256337",
      "line": "University of Technology, Jamaica, a mapped place for the game."
    },
    {
      "key": "osm-node-12539925828",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12539925828",
      "line": "Blackalicious, a mapped place for the game."
    },
    {
      "key": "osm-way-753127490",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/753127490",
      "line": "Cinchona Botanical Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-839108008",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/839108008",
      "line": "Rockwells Clubhouse, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2742199247",
      "ref": "node/2742199247",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2742199250",
      "ref": "node/2742199250",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2742209480",
      "ref": "node/2742209480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2742210862",
      "ref": "node/2742210862",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2796870565",
      "ref": "node/2796870565",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2943872745",
      "ref": "node/2943872745",
      "kind": "neighbourhood"
    },
    {
      "id": "district-306445091",
      "ref": "node/306445091",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3128320193",
      "ref": "node/3128320193",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3174823361",
      "ref": "node/3174823361",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11161465737",
      "ref": "node/11161465737",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11186489816",
      "ref": "node/11186489816",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1120877268",
      "ref": "node/1120877268",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1120877274",
      "ref": "node/1120877274",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1120877281",
      "ref": "node/1120877281",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11463160136",
      "ref": "node/11463160136",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145005501",
      "ref": "node/12145005501",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14160201886",
      "ref": "node/14160201886",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2343959738",
      "ref": "node/2343959738",
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
