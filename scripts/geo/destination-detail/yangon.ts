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
  "name": "Yangon",
  "box": [
    16.615832010066022,
    95.97314272669976,
    16.977593789933977,
    96.34884047330024
  ],
  "core": [
    16.751492677516506,
    96.11406317343565,
    16.841933122483493,
    96.20792002656435
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3077717862",
      "line": "Paywetseikkon, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/419882997",
      "line": "Black Canyon, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/289005750",
      "line": "Yangon Institute of Economics, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/396441640",
      "line": "South Okkalapa Maternal and Child Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/129485365",
      "line": "Maha Bandula Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/23395611",
      "line": "Bogyoke Aung San Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4631857843",
      "line": "Kyaik Khauk Pagoda, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8115481444",
      "line": "Shwe Pyi Thar Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/7765767185",
      "line": "Hlaing Thar Yar Town Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-378356321",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/378356321",
      "line": "Dagon University, a mapped place for the game."
    },
    {
      "key": "osm-way-15059554",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/15059554",
      "line": "Thuwunna Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-2107705043",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2107705043",
      "line": "Myanmar Gems Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-383504429",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/383504429",
      "line": "Technological University, Thanlyin, a mapped place for the game."
    },
    {
      "key": "osm-way-220311909",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/220311909",
      "line": "Karen Baptisit Seminary Insein, a mapped place for the game."
    },
    {
      "key": "osm-relation-5805151",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/5805151",
      "line": "Yangon Mental Health Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-407771515",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/407771515",
      "line": "Lim Chin Tsong Palace, a mapped place for the game."
    },
    {
      "key": "osm-node-3546535083",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3546535083",
      "line": "Bogyoke Aung San Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-180605242",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/180605242",
      "line": "Botahtaung Pagoda, a mapped place for the game."
    },
    {
      "key": "osm-way-480039800",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/480039800",
      "line": "New Yangon General Hospital, a mapped place for the game."
    },
    {
      "key": "osm-relation-2409874",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/2409874",
      "line": "Maha Wizaya Pagoda, a mapped place for the game."
    },
    {
      "key": "osm-way-374243908",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/374243908",
      "line": "People's Park, a mapped place for the game."
    },
    {
      "key": "osm-way-463340150",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/463340150",
      "line": "Sa Lin Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-129485357",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/129485357",
      "line": "Sakura Tower, a mapped place for the game."
    },
    {
      "key": "osm-node-5442063565",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5442063565",
      "line": "City Myanmar Cafe, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1140240950",
      "ref": "node/1140240950",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1140244835",
      "ref": "node/1140244835",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2434352914",
      "ref": "node/2434352914",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3533045170",
      "ref": "node/3533045170",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3533081981",
      "ref": "node/3533081981",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3534629276",
      "ref": "node/3534629276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3534630211",
      "ref": "node/3534630211",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3548919531",
      "ref": "node/3548919531",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3548919532",
      "ref": "node/3548919532",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3549567640",
      "ref": "node/3549567640",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880753213",
      "ref": "node/3880753213",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880753214",
      "ref": "node/3880753214",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880817844",
      "ref": "node/3880817844",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880817845",
      "ref": "node/3880817845",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880817846",
      "ref": "node/3880817846",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880817847",
      "ref": "node/3880817847",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3880817848",
      "ref": "node/3880817848",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4024644076",
      "ref": "node/4024644076",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2641584",
      "ref": "relation/2641584",
      "kind": "water"
    },
    {
      "id": "water-relation-423",
      "ref": "relation/423",
      "kind": "water"
    },
    {
      "id": "water-way-24316358",
      "ref": "way/24316358",
      "kind": "water"
    },
    {
      "id": "water-way-40482792",
      "ref": "way/40482792",
      "kind": "water"
    },
    {
      "id": "water-way-40482794",
      "ref": "way/40482794",
      "kind": "water"
    },
    {
      "id": "water-way-4368410",
      "ref": "way/4368410",
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
