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
  "name": "São Tomé",
  "box": [
    0.15804331006602154,
    6.5516334710351485,
    0.5198050899339784,
    6.910972728964851
  ],
  "core": [
    0.2937039775165054,
    6.686386531721577,
    0.3841444224834946,
    6.776219668278423
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/7684580114",
      "line": "Comunidade local, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6564990506",
      "line": "Celva’s, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/561552891",
      "line": "Universidade de São Tomé and Príncipe, Instituto Superior Politécnico, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/206524513",
      "line": "Centro hospitalar de São Tomé (CHST), a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/304819796",
      "line": "Praça da Juventude, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/433100614",
      "line": "Mercado de Cova Água Santana, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1126946640",
      "line": "Our Lady of Grace Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/2242418968",
      "line": "EMAE - Direção das Águas; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/198310275",
      "line": "Presidential Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-1126988143",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1126988143",
      "line": "Estádio 12 de Julho, a mapped place for the game."
    },
    {
      "key": "osm-node-2401213448",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2401213448",
      "line": "Cascata de Bombaim, a mapped place for the game."
    },
    {
      "key": "osm-node-12343335801",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12343335801",
      "line": "Onda Leve bar / restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-231363988",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/231363988",
      "line": "Hospital de Santa Margarida, a mapped place for the game."
    },
    {
      "key": "osm-way-224647304",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/224647304",
      "line": "Posto de Saude Uba Budu, a mapped place for the game."
    },
    {
      "key": "osm-node-938537793",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/938537793",
      "line": "Botanical Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-1387886871",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1387886871",
      "line": "Mercado do Cruzeiro, a mapped place for the game."
    },
    {
      "key": "osm-node-12875245959",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12875245959",
      "line": "Hosana, a mapped place for the game."
    },
    {
      "key": "osm-way-280771623",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/280771623",
      "line": "Coffe Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-1311130312",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1311130312",
      "line": "Mercado Bobo Forro, a mapped place for the game."
    },
    {
      "key": "osm-node-1600956613",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1600956613",
      "line": "Roça Agostinho Neto ( Roça de Cinco mil), a mapped place for the game."
    },
    {
      "key": "osm-node-5414397476",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5414397476",
      "line": "Campo de Futebol Santana FC, a mapped place for the game."
    },
    {
      "key": "osm-way-206543431",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/206543431",
      "line": "Parque Popular, a mapped place for the game."
    },
    {
      "key": "osm-way-1126943996",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1126943996",
      "line": "Praça de Independência, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2326814199",
      "ref": "node/2326814199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2178269540",
      "ref": "node/2178269540",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2326816757",
      "ref": "node/2326816757",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2326823970",
      "ref": "node/2326823970",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2327232142",
      "ref": "node/2327232142",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2331879723",
      "ref": "node/2331879723",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2331879724",
      "ref": "node/2331879724",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2331879726",
      "ref": "node/2331879726",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2343337033",
      "ref": "node/2343337033",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2360512664",
      "ref": "node/2360512664",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2375292128",
      "ref": "node/2375292128",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2380373600",
      "ref": "node/2380373600",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9329700395",
      "ref": "node/9329700395",
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
