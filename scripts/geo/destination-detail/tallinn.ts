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
  "name": "Tallinn",
  "box": [
    59.25636111006602,
    24.402037752620263,
    59.61812288993398,
    25.11250084737974
  ],
  "core": [
    59.392021777516504,
    24.668818384201817,
    59.48246222248349,
    24.845720215798185
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/29163264",
      "line": "Saue, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/436193431",
      "line": "Olde Hansa, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/484178253",
      "line": "Sisekaitseakadeemia, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/810780801",
      "line": "Wismari Haigla, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/60576469",
      "line": "Keila keskpark, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/26874481",
      "line": "Nõmme turuhoone, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/26846095",
      "line": "Jüri kirik, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/43735045",
      "line": "Islandi väljak; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/10633411729",
      "line": "European Union Agency for the Operational Management of Large-Scale IT Systems in the Area of Freedom, Security and Justice, a mapped place for the game."
    },
    {
      "key": "osm-relation-1205174",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/1205174",
      "line": "Tallinna Tehnikaülikool, a mapped place for the game."
    },
    {
      "key": "osm-way-25822425",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/25822425",
      "line": "Pirita Velodroom, a mapped place for the game."
    },
    {
      "key": "osm-node-638572868",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/638572868",
      "line": "Kabelikivi, a mapped place for the game."
    },
    {
      "key": "osm-node-687057209",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/687057209",
      "line": "Metsanurme Local Lore Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-1606298155",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1606298155",
      "line": "Aruküla rändrahn, a mapped place for the game."
    },
    {
      "key": "osm-way-81647511",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/81647511",
      "line": "Rannamõisa kirik, a mapped place for the game."
    },
    {
      "key": "osm-way-722994268",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/722994268",
      "line": "EEVK Nabala vennastekoguduse palvemaja, a mapped place for the game."
    },
    {
      "key": "osm-way-1213651720",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1213651720",
      "line": "Kurna mõisa park, a mapped place for the game."
    },
    {
      "key": "osm-way-227571444",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/227571444",
      "line": "Peetri park, a mapped place for the game."
    },
    {
      "key": "osm-way-26908368",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/26908368",
      "line": "Järve keskus, a mapped place for the game."
    },
    {
      "key": "osm-way-951559494",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/951559494",
      "line": "Tallinn University, a mapped place for the game."
    },
    {
      "key": "osm-way-230751799",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/230751799",
      "line": "A. Le Coq Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-26895161",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/26895161",
      "line": "Tallinna Tehnikakõrgkool, a mapped place for the game."
    },
    {
      "key": "osm-node-11071633601",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11071633601",
      "line": "Põhjakonn Stairs, a mapped place for the game."
    },
    {
      "key": "osm-way-26846079",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/26846079",
      "line": "Rocca al Mare Shopping Centre, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2664569900",
      "ref": "node/2664569900",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5951137393",
      "ref": "node/5951137393",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5951137394",
      "ref": "node/5951137394",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5951137396",
      "ref": "node/5951137396",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5951137397",
      "ref": "node/5951137397",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5951137398",
      "ref": "node/5951137398",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5951137401",
      "ref": "node/5951137401",
      "kind": "neighbourhood"
    },
    {
      "id": "district-674368418",
      "ref": "node/674368418",
      "kind": "neighbourhood"
    },
    {
      "id": "district-748173921",
      "ref": "node/748173921",
      "kind": "neighbourhood"
    },
    {
      "id": "district-904922454",
      "ref": "node/904922454",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12120570130",
      "ref": "node/12120570130",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1776371276",
      "ref": "node/1776371276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1776371643",
      "ref": "node/1776371643",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1776374518",
      "ref": "node/1776374518",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1776379332",
      "ref": "node/1776379332",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1776385984",
      "ref": "node/1776385984",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1776418077",
      "ref": "node/1776418077",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2664593424",
      "ref": "node/2664593424",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1130487",
      "ref": "relation/1130487",
      "kind": "water"
    },
    {
      "id": "water-relation-15059398",
      "ref": "relation/15059398",
      "kind": "water"
    },
    {
      "id": "water-relation-1922555",
      "ref": "relation/1922555",
      "kind": "water"
    },
    {
      "id": "water-relation-967594",
      "ref": "relation/967594",
      "kind": "water"
    },
    {
      "id": "water-way-8037723",
      "ref": "way/8037723",
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
