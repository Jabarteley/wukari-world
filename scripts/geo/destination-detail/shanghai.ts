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
  "name": "Shanghai",
  "box": [
    31.051462810066024,
    121.25858469409144,
    31.41322458993398,
    121.81549681636386
  ],
  "core": [
    31.187123477516508,
    121.41654881945573,
    31.277563922483495,
    121.52165598054427
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/468916502",
      "line": "East Nanjing Road, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12862593135",
      "line": "沙县小吃, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/13058054",
      "line": "Shanghai University (Baoshan Campus), a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/242365340",
      "line": "Fudan University Children Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/74590795",
      "line": "Binjiang Forest Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/375224849",
      "line": "Global Harbor, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/463240119",
      "line": "Jiangwan Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/178801539",
      "line": "Shanghai Municipal People's Government; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/1889448661",
      "line": "Pudong New District Government, a mapped place for the game."
    },
    {
      "key": "osm-relation-5390610",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/5390610",
      "line": "ShanghaiTech University (Zhangjiang Campus), a mapped place for the game."
    },
    {
      "key": "osm-way-15783341",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/15783341",
      "line": "Shanghai Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-328312304",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/328312304",
      "line": "Shanghai Disney Resort, a mapped place for the game."
    },
    {
      "key": "osm-way-183944730",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/183944730",
      "line": "Guyi Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-462007561",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/462007561",
      "line": "Shanghai Zoo, a mapped place for the game."
    },
    {
      "key": "osm-way-712187766",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/712187766",
      "line": "蔓趣公园, a mapped place for the game."
    },
    {
      "key": "osm-way-474607998",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/474607998",
      "line": "Shanghai Sanda University, a mapped place for the game."
    },
    {
      "key": "osm-way-1363229598",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1363229598",
      "line": "上海市江桥批发市场, a mapped place for the game."
    },
    {
      "key": "osm-way-51051520",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/51051520",
      "line": "Shanghai Tenth People's Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-279318210",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/279318210",
      "line": "Church of Jesus, Xinzhuang, a mapped place for the game."
    },
    {
      "key": "osm-way-192206043",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/192206043",
      "line": "Xinhua Hospital, a mapped place for the game."
    },
    {
      "key": "osm-relation-18781565",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/18781565",
      "line": "Tongji University (Huxi Campus), a mapped place for the game."
    },
    {
      "key": "osm-node-4880999164",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4880999164",
      "line": "Shanghai Children Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-404699628",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/404699628",
      "line": "Jade Buddha Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-24448592",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/24448592",
      "line": "Hongkou Football Stadium, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10011387632",
      "ref": "node/10011387632",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11135920722",
      "ref": "node/11135920722",
      "kind": "neighbourhood"
    },
    {
      "id": "district-244082474",
      "ref": "node/244082474",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2684750595",
      "ref": "node/2684750595",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2684985633",
      "ref": "node/2684985633",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2686075277",
      "ref": "node/2686075277",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2686076635",
      "ref": "node/2686076635",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2688438125",
      "ref": "node/2688438125",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3023991754",
      "ref": "node/3023991754",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3039252983",
      "ref": "node/3039252983",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3623334286",
      "ref": "node/3623334286",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4214939953",
      "ref": "node/4214939953",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4573307509",
      "ref": "node/4573307509",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5259148576",
      "ref": "node/5259148576",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6547128308",
      "ref": "node/6547128308",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6547128309",
      "ref": "node/6547128309",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6547128310",
      "ref": "node/6547128310",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6547128311",
      "ref": "node/6547128311",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11881900",
      "ref": "relation/11881900",
      "kind": "water"
    },
    {
      "id": "water-way-154618462",
      "ref": "way/154618462",
      "kind": "water"
    },
    {
      "id": "water-way-343461512",
      "ref": "way/343461512",
      "kind": "water"
    },
    {
      "id": "water-way-41128202",
      "ref": "way/41128202",
      "kind": "water"
    },
    {
      "id": "water-way-71118581",
      "ref": "way/71118581",
      "kind": "water"
    },
    {
      "id": "water-way-71118582",
      "ref": "way/71118582",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
