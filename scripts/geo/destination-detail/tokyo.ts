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
  "name": "Tokyo",
  "box": [
    35.49597921006602,
    139.54221916662937,
    35.85774098993398,
    139.98557023337065
  ],
  "core": [
    35.631639877516506,
    139.7085703373698,
    35.72208032248349,
    139.81921906263022
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/172670767",
      "line": "Nippori, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1447682003",
      "line": "Tully's Coffee, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/504907469",
      "line": "Seibu Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1420192273",
      "line": "埼玉県済生会川口総合病院, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/2658286",
      "line": "Shakujii Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/26322912",
      "line": "イオン新浦安ショッピングセンター, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/610939786",
      "line": "観音寺, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/351764142",
      "line": "草加市役所; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/89877471",
      "line": "Tokyo Metropolitan Government Main Building 1, a mapped place for the game."
    },
    {
      "key": "osm-relation-18950099",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/18950099",
      "line": "Tsurumi University, a mapped place for the game."
    },
    {
      "key": "osm-relation-8135061",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/8135061",
      "line": "Nakayama Race Course, a mapped place for the game."
    },
    {
      "key": "osm-node-9553352249",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9553352249",
      "line": "川和富士塚遺跡, a mapped place for the game."
    },
    {
      "key": "osm-way-459589547",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/459589547",
      "line": "秋ヶ瀬公園, a mapped place for the game."
    },
    {
      "key": "osm-node-7064887959",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7064887959",
      "line": "妙法寺, a mapped place for the game."
    },
    {
      "key": "osm-relation-15635177",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/15635177",
      "line": "Higahi Ohgishima East Park, a mapped place for the game."
    },
    {
      "key": "osm-node-1420795772",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1420795772",
      "line": "Daigo Fukuryu Maru Exhibition Hall, a mapped place for the game."
    },
    {
      "key": "osm-node-11964372050",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11964372050",
      "line": "高応寺, a mapped place for the game."
    },
    {
      "key": "osm-way-136302688",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/136302688",
      "line": "十文字学園女子大学, a mapped place for the game."
    },
    {
      "key": "osm-way-214703224",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/214703224",
      "line": "Musashi-Kosugi Tokyu Square, a mapped place for the game."
    },
    {
      "key": "osm-way-1486519713",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1486519713",
      "line": "Onarimon Gate, a mapped place for the game."
    },
    {
      "key": "osm-node-1420782236",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1420782236",
      "line": "Kyorin University Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-463900052",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/463900052",
      "line": "Sankyo Frontier Kashiwa Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-1420785573",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1420785573",
      "line": "Metropolitan Elder Care Center, a mapped place for the game."
    },
    {
      "key": "osm-way-119477713",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/119477713",
      "line": "NISSAN Stadium, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10074021256",
      "ref": "node/10074021256",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021257",
      "ref": "node/10074021257",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021258",
      "ref": "node/10074021258",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021293",
      "ref": "node/10074021293",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021305",
      "ref": "node/10074021305",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021309",
      "ref": "node/10074021309",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021312",
      "ref": "node/10074021312",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021313",
      "ref": "node/10074021313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074021314",
      "ref": "node/10074021314",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034835",
      "ref": "node/10074034835",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034836",
      "ref": "node/10074034836",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034842",
      "ref": "node/10074034842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034844",
      "ref": "node/10074034844",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034846",
      "ref": "node/10074034846",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034847",
      "ref": "node/10074034847",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034854",
      "ref": "node/10074034854",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034855",
      "ref": "node/10074034855",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10074034857",
      "ref": "node/10074034857",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-20506184",
      "ref": "relation/20506184",
      "kind": "water"
    },
    {
      "id": "water-relation-2771606",
      "ref": "relation/2771606",
      "kind": "water"
    },
    {
      "id": "water-relation-32007",
      "ref": "relation/32007",
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
