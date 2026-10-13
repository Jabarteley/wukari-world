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
  "maxRoads": 100,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Oslo",
  "box": [
    59.73244921006602,
    10.378618864005034,
    60.202945044496694,
    11.118477241021512
  ],
  "core": [
    59.86810987751651,
    10.649251378663054,
    59.9585503224835,
    10.828688821336945
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/660921",
      "line": "Oslo Central Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5920115758",
      "line": "Vangen, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/89631775",
      "line": "Høyskolen i Akershus, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/43556465",
      "line": "Sunnaas sykehus, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/155873155",
      "line": "Furuset kulturpark, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/229971808",
      "line": "Østerås senter, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/3131568566",
      "line": "Betel Nærsnes, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/19904207",
      "line": "Vollebekk torg; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/30606562",
      "line": "Bærum rådhus, a mapped place for the game."
    },
    {
      "key": "osm-relation-7757342",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/7757342",
      "line": "University of Oslo, a mapped place for the game."
    },
    {
      "key": "osm-way-760875553",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/760875553",
      "line": "Jordal amfi, a mapped place for the game."
    },
    {
      "key": "osm-node-1779117990",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1779117990",
      "line": "Stunnerøya, a mapped place for the game."
    },
    {
      "key": "osm-node-1914126620",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1914126620",
      "line": "Spenningsbygruva, a mapped place for the game."
    },
    {
      "key": "osm-way-48672338",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48672338",
      "line": "Tusenfryd, a mapped place for the game."
    },
    {
      "key": "osm-way-308441483",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/308441483",
      "line": "Ringkollen kapell, a mapped place for the game."
    },
    {
      "key": "osm-way-822899835",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/822899835",
      "line": "Nittedal kirke, a mapped place for the game."
    },
    {
      "key": "osm-way-51446838",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/51446838",
      "line": "Akershus universitetssykehus, a mapped place for the game."
    },
    {
      "key": "osm-way-143526382",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/143526382",
      "line": "Radiumhospitalet, a mapped place for the game."
    },
    {
      "key": "osm-node-540229469",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/540229469",
      "line": "Kobberhaughytta, a mapped place for the game."
    },
    {
      "key": "osm-way-129487913",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/129487913",
      "line": "Nansenparken, a mapped place for the game."
    },
    {
      "key": "osm-way-106902060",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/106902060",
      "line": "Sverre Enevolds plass, a mapped place for the game."
    },
    {
      "key": "osm-node-260042955",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/260042955",
      "line": "Sandbakken, a mapped place for the game."
    },
    {
      "key": "osm-way-443983964",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/443983964",
      "line": "Intility Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-43222619",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/43222619",
      "line": "Ullevaal Stadion, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1125017764",
      "ref": "node/1125017764",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125022289",
      "ref": "node/1125022289",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125045781",
      "ref": "node/1125045781",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125050698",
      "ref": "node/1125050698",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125313132",
      "ref": "node/1125313132",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125318871",
      "ref": "node/1125318871",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125321869",
      "ref": "node/1125321869",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125487991",
      "ref": "node/1125487991",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125493271",
      "ref": "node/1125493271",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125500266",
      "ref": "node/1125500266",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125515058",
      "ref": "node/1125515058",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125529459",
      "ref": "node/1125529459",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125540368",
      "ref": "node/1125540368",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125570545",
      "ref": "node/1125570545",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125572706",
      "ref": "node/1125572706",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125572707",
      "ref": "node/1125572707",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125572708",
      "ref": "node/1125572708",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1125573258",
      "ref": "node/1125573258",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-10993972",
      "ref": "relation/10993972",
      "kind": "water"
    },
    {
      "id": "water-relation-1146546",
      "ref": "relation/1146546",
      "kind": "water"
    },
    {
      "id": "water-relation-1146547",
      "ref": "relation/1146547",
      "kind": "water"
    },
    {
      "id": "water-relation-124999",
      "ref": "relation/124999",
      "kind": "water"
    },
    {
      "id": "water-relation-13115115",
      "ref": "relation/13115115",
      "kind": "water"
    },
    {
      "id": "water-relation-1438314",
      "ref": "relation/1438314",
      "kind": "water"
    },
    {
      "id": "water-relation-15843525",
      "ref": "relation/15843525",
      "kind": "water"
    },
    {
      "id": "water-relation-1629570",
      "ref": "relation/1629570",
      "kind": "water"
    },
    {
      "id": "water-relation-16392358",
      "ref": "relation/16392358",
      "kind": "water"
    },
    {
      "id": "water-relation-16447883",
      "ref": "relation/16447883",
      "kind": "water"
    },
    {
      "id": "water-relation-16471980",
      "ref": "relation/16471980",
      "kind": "water"
    },
    {
      "id": "water-relation-16471981",
      "ref": "relation/16471981",
      "kind": "water"
    },
    {
      "id": "water-relation-16709053",
      "ref": "relation/16709053",
      "kind": "water"
    },
    {
      "id": "water-relation-1934724",
      "ref": "relation/1934724",
      "kind": "water"
    },
    {
      "id": "water-relation-1940869",
      "ref": "relation/1940869",
      "kind": "water"
    },
    {
      "id": "water-relation-2025296",
      "ref": "relation/2025296",
      "kind": "water"
    },
    {
      "id": "water-relation-2068230",
      "ref": "relation/2068230",
      "kind": "water"
    },
    {
      "id": "water-relation-2878809",
      "ref": "relation/2878809",
      "kind": "water"
    },
    {
      "id": "water-relation-2901916",
      "ref": "relation/2901916",
      "kind": "water"
    },
    {
      "id": "water-relation-2901917",
      "ref": "relation/2901917",
      "kind": "water"
    },
    {
      "id": "water-relation-33356",
      "ref": "relation/33356",
      "kind": "water"
    },
    {
      "id": "water-relation-5456822",
      "ref": "relation/5456822",
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
