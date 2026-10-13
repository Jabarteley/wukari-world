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
  "name": "Taipei",
  "box": [
    24.85663891006602,
    121.36508982644351,
    25.218400689933976,
    121.76226937355649
  ],
  "core": [
    24.992299577516505,
    121.51408731769861,
    25.08274002248349,
    121.61327188230139
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/253559357",
      "line": "Taipower Building, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/295946611",
      "line": "藍白小鎮, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/5456014",
      "line": "Ming Chi University of Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/367812162",
      "line": "衛生福利部基隆醫院, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/8410958",
      "line": "Floriculture Experiment Center, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1009409905",
      "line": "Mitsui Shopping Park LaLaport 南港, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/242726461",
      "line": "保坪宮, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/4202253",
      "line": "New Taipei City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/6296197",
      "line": "Central Engraving and Printing Plant, a mapped place for the game."
    },
    {
      "key": "osm-way-261330789",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/261330789",
      "line": "台北海洋科技大學士林校區, a mapped place for the game."
    },
    {
      "key": "osm-way-773559279",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/773559279",
      "line": "三板橋, a mapped place for the game."
    },
    {
      "key": "osm-node-4199791991",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4199791991",
      "line": "Queen's Head, a mapped place for the game."
    },
    {
      "key": "osm-way-263590699",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/263590699",
      "line": "Hsing Xiu Kong, a mapped place for the game."
    },
    {
      "key": "osm-way-1329940449",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1329940449",
      "line": "天恩宮, a mapped place for the game."
    },
    {
      "key": "osm-way-385941045",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/385941045",
      "line": "Yingfeng Riverside Park, a mapped place for the game."
    },
    {
      "key": "osm-way-456206409",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/456206409",
      "line": "National Archives, a mapped place for the game."
    },
    {
      "key": "osm-node-12077731973",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12077731973",
      "line": "土地公山遺址, a mapped place for the game."
    },
    {
      "key": "osm-way-619916134",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/619916134",
      "line": "國順公園, a mapped place for the game."
    },
    {
      "key": "osm-way-287104550",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/287104550",
      "line": "Huafan University, a mapped place for the game."
    },
    {
      "key": "osm-way-396909006",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/396909006",
      "line": "Taipei City Psychiatric Center (TCPC), a mapped place for the game."
    },
    {
      "key": "osm-way-1197004281",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1197004281",
      "line": "Yes!Life Yulon City, a mapped place for the game."
    },
    {
      "key": "osm-relation-4612518",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/4612518",
      "line": "Fu Hsing Kang College, National Defense University, a mapped place for the game."
    },
    {
      "key": "osm-node-2003037499",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2003037499",
      "line": "芝山岩, a mapped place for the game."
    },
    {
      "key": "osm-way-354534871",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/354534871",
      "line": "Shuang Ho Hospital, MOHW, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2561560094",
      "ref": "node/2561560094",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2561595826",
      "ref": "node/2561595826",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2636658138",
      "ref": "node/2636658138",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2669666663",
      "ref": "node/2669666663",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2686701127",
      "ref": "node/2686701127",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2774549546",
      "ref": "node/2774549546",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2775015406",
      "ref": "node/2775015406",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2776489563",
      "ref": "node/2776489563",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2831420841",
      "ref": "node/2831420841",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2900290101",
      "ref": "node/2900290101",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3279675298",
      "ref": "node/3279675298",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3413969193",
      "ref": "node/3413969193",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3452959295",
      "ref": "node/3452959295",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5296293226",
      "ref": "node/5296293226",
      "kind": "neighbourhood"
    },
    {
      "id": "district-60655614",
      "ref": "node/60655614",
      "kind": "neighbourhood"
    },
    {
      "id": "district-60655620",
      "ref": "node/60655620",
      "kind": "neighbourhood"
    },
    {
      "id": "district-60655676",
      "ref": "node/60655676",
      "kind": "neighbourhood"
    },
    {
      "id": "district-60655683",
      "ref": "node/60655683",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3229681",
      "ref": "relation/3229681",
      "kind": "water"
    },
    {
      "id": "water-relation-3298928",
      "ref": "relation/3298928",
      "kind": "water"
    },
    {
      "id": "water-relation-5460776",
      "ref": "relation/5460776",
      "kind": "water"
    },
    {
      "id": "water-relation-7743876",
      "ref": "relation/7743876",
      "kind": "water"
    },
    {
      "id": "water-way-121997904",
      "ref": "way/121997904",
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
