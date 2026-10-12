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
  "name": "Monrovia",
  "box": [
    6.139475310066022,
    -10.986874246509581,
    6.501237089933978,
    -10.3532633001353
  ],
  "core": [
    6.275135977516506,
    -10.851243394022966,
    6.365576422483494,
    -10.760855005977035
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4537714890",
      "line": "Shared Taxi Station to Bo waterside, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6962402414",
      "line": "Pepper Fish, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/94957275",
      "line": "University of Liberia, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/7694996699",
      "line": "14th Military Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "slotFallback": {
        "slot": "recreation",
        "used": "leisure=stadium",
        "ref": "way/143040580"
      },
      "ref": "way/143040580",
      "line": "Antoinette Tubman Stadium, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/302305106",
      "line": "Turning Point Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/299927206",
      "line": "Sacred Heart Cathedral Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/1565176470",
      "line": "Executive Mansion; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/134906307",
      "line": "Center for National Documents and Records, a mapped place for the game."
    },
    {
      "key": "osm-way-299926349",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/299926349",
      "line": "UMU University, a mapped place for the game."
    },
    {
      "key": "osm-way-157273329",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/157273329",
      "line": "Samuel Kanyon Doe Sports Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-143040586",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/143040586",
      "line": "National Museum of Liberia, a mapped place for the game."
    },
    {
      "key": "osm-way-143040548",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/143040548",
      "line": "Episcopal Church, a mapped place for the game."
    },
    {
      "key": "osm-node-10155854393",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/10155854393",
      "line": "Academic Building, a mapped place for the game."
    },
    {
      "key": "osm-way-295839261",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/295839261",
      "line": "Liberian Institute for Tropical Medicine, a mapped place for the game."
    },
    {
      "key": "osm-way-784173574",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/784173574",
      "line": "Firestone Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-node-7695068489",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/7695068489",
      "line": "Dr. Jallah Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-node-8999008284",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/8999008284",
      "line": "Blamasee, a mapped place for the game."
    },
    {
      "key": "osm-node-2812532381",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2812532381",
      "line": "Red Light Market, a mapped place for the game."
    },
    {
      "key": "osm-node-8617869166",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8617869166",
      "line": "Oporto Chicken Crib, a mapped place for the game."
    },
    {
      "key": "osm-node-8470144258",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8470144258",
      "line": "Hotel Africa ruins, a mapped place for the game."
    },
    {
      "key": "osm-node-3708503058",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3708503058",
      "line": "MAISON MEMORIAL A.M.E. CHURCH, a mapped place for the game."
    },
    {
      "key": "osm-node-1730515734",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1730515734",
      "line": "Cotton Tree, a mapped place for the game."
    },
    {
      "key": "osm-way-143040550",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/143040550",
      "line": "Newport Street Mosque, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2777348649",
      "ref": "node/2777348649",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2932664159",
      "ref": "node/2932664159",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2996007975",
      "ref": "node/2996007975",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2996008174",
      "ref": "node/2996008174",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2996008185",
      "ref": "node/2996008185",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2996008191",
      "ref": "node/2996008191",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2996008195",
      "ref": "node/2996008195",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2996008199",
      "ref": "node/2996008199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3025634568",
      "ref": "node/3025634568",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3036044884",
      "ref": "node/3036044884",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3060297370",
      "ref": "node/3060297370",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11039958513",
      "ref": "node/11039958513",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1277545150",
      "ref": "node/1277545150",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13424699448",
      "ref": "node/13424699448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13427917323",
      "ref": "node/13427917323",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429426106",
      "ref": "node/13429426106",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13477827657",
      "ref": "node/13477827657",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13477827658",
      "ref": "node/13477827658",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3712448",
      "ref": "relation/3712448",
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
