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
  "name": "Vientiane",
  "box": [
    17.78321791006602,
    102.42430659921996,
    18.144979689933976,
    102.80243480078005
  ],
  "core": [
    17.918878577516505,
    102.56614119011199,
    18.009319022483492,
    102.66060020988802
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/6892516159",
      "line": "Vientiane, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/476448255",
      "line": "Chokdee Cafe & Beer Bar, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1009004302",
      "line": "National University of Laos, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/39528312",
      "line": "Mahosot Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1315886164",
      "line": "North Lake Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/202129577",
      "line": "Talat Sao Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "relation/273288",
      "line": "That Luang, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/5652012052",
      "line": "Ban Phosy Village Office; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/8840596415",
      "line": "Institut Pasteur du Laos, a mapped place for the game."
    },
    {
      "key": "osm-node-6978079256",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6978079256",
      "line": "National University of Laos, Faculty of water resource, a mapped place for the game."
    },
    {
      "key": "osm-way-665451513",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665451513",
      "line": "New Laos National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-41566774",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/41566774",
      "line": "Patuxai, a mapped place for the game."
    },
    {
      "key": "osm-way-613407768",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/613407768",
      "line": "Anouvong Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-42389632",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/42389632",
      "line": "Wat Si Muang, a mapped place for the game."
    },
    {
      "key": "osm-node-523575544",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/523575544",
      "line": "Jamia Masjid, a mapped place for the game."
    },
    {
      "key": "osm-way-549654627",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/549654627",
      "line": "Lao National Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-524296626",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/524296626",
      "line": "Kualao, a mapped place for the game."
    },
    {
      "key": "osm-node-2244979473",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2244979473",
      "line": "Dane Soung Viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-node-3645511715",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3645511715",
      "line": "Vongphone Grilled, a mapped place for the game."
    },
    {
      "key": "osm-node-12114176243",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/12114176243",
      "line": "Houaychiam Health Center (Palai), a mapped place for the game."
    },
    {
      "key": "osm-node-11486599694",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/11486599694",
      "line": "Xaithani District Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-2340078795",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2340078795",
      "line": "Naxatythong Market, a mapped place for the game."
    },
    {
      "key": "osm-node-4384724640",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4384724640",
      "line": "Tat Vang-Nong, a mapped place for the game."
    },
    {
      "key": "osm-node-5036948326",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5036948326",
      "line": "Kan Ngeun Dông Kam Xang, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-656211464",
      "ref": "node/656211464",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467324",
      "ref": "node/12135467324",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467329",
      "ref": "node/12135467329",
      "kind": "neighbourhood"
    },
    {
      "id": "district-568210534",
      "ref": "node/568210534",
      "kind": "neighbourhood"
    },
    {
      "id": "district-506409918",
      "ref": "node/506409918",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467326",
      "ref": "node/12135467326",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467325",
      "ref": "node/12135467325",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467321",
      "ref": "node/12135467321",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467328",
      "ref": "node/12135467328",
      "kind": "neighbourhood"
    },
    {
      "id": "district-583082501",
      "ref": "node/583082501",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467320",
      "ref": "node/12135467320",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10298128284",
      "ref": "node/10298128284",
      "kind": "neighbourhood"
    },
    {
      "id": "district-644761610",
      "ref": "node/644761610",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467323",
      "ref": "node/12135467323",
      "kind": "neighbourhood"
    },
    {
      "id": "district-512934208",
      "ref": "node/512934208",
      "kind": "neighbourhood"
    },
    {
      "id": "district-628365919",
      "ref": "node/628365919",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135467330",
      "ref": "node/12135467330",
      "kind": "neighbourhood"
    },
    {
      "id": "district-614132536",
      "ref": "node/614132536",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-12447410",
      "ref": "relation/12447410",
      "kind": "water"
    },
    {
      "id": "water-relation-301989",
      "ref": "relation/301989",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
