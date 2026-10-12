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
  "name": "Dili",
  "box": [
    -8.734561789933979,
    125.39663897711469,
    -8.37280001006602,
    125.76017962288532
  ],
  "core": [
    -8.598901122483495,
    125.53298311682782,
    -8.508460677516505,
    125.62383548317219
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/503732325",
      "line": "Porto de Dili, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4341933867",
      "line": "Tibar Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/4664458119",
      "line": "Universidade da Paz, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/11644985043",
      "line": "Hospital Nacional Guido Valadares, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/166662133",
      "line": "Jardim Colmera, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/254293086",
      "line": "Timor Plaza, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1188788805",
      "line": "Pura Girinatha, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/28904880",
      "line": "Parlamento Nacional; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1083634999",
      "line": "Sede Suco Seloi Craic, a mapped place for the game."
    },
    {
      "key": "osm-node-4188634589",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4188634589",
      "line": "National University of Timor Leste, a mapped place for the game."
    },
    {
      "key": "osm-way-558964564",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/558964564",
      "line": "Estadium Cafe Gleno, a mapped place for the game."
    },
    {
      "key": "osm-way-166301201",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/166301201",
      "line": "Palácio de Lahane, a mapped place for the game."
    },
    {
      "key": "osm-way-999353312",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/999353312",
      "line": "Dili Harbor Lighthouse, a mapped place for the game."
    },
    {
      "key": "osm-node-2595285980",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2595285980",
      "line": "Motael Church, a mapped place for the game."
    },
    {
      "key": "osm-way-154331114",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/154331114",
      "line": "Igreza Catedral da Imaculada Conceição (Díli), a mapped place for the game."
    },
    {
      "key": "osm-node-1777614913",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1777614913",
      "line": "Bereleu, a mapped place for the game."
    },
    {
      "key": "osm-node-5225733660",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5225733660",
      "line": "Centru Saude Tulataqeu, a mapped place for the game."
    },
    {
      "key": "osm-node-6846547213",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6846547213",
      "line": "Wild Timor Coffee, a mapped place for the game."
    },
    {
      "key": "osm-way-1084644387",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1084644387",
      "line": "Jardim Remexio, a mapped place for the game."
    },
    {
      "key": "osm-way-1122811001",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1122811001",
      "line": "Faculdade Engenharia UNTL, a mapped place for the game."
    },
    {
      "key": "osm-way-1084202931",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1084202931",
      "line": "Monumentu Nicolau Lobato, a mapped place for the game."
    },
    {
      "key": "osm-way-1084635480",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1084635480",
      "line": "Mercado Fahi - Soi, a mapped place for the game."
    },
    {
      "key": "osm-node-7371972885",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7371972885",
      "line": "Dolok Oan Beach, a mapped place for the game."
    },
    {
      "key": "osm-way-1084644386",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1084644386",
      "line": "Market Lakbo, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1785400170",
      "ref": "node/1785400170",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400184",
      "ref": "node/1785400184",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400185",
      "ref": "node/1785400185",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400186",
      "ref": "node/1785400186",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400206",
      "ref": "node/1785400206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400292",
      "ref": "node/1785400292",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400392",
      "ref": "node/1785400392",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400437",
      "ref": "node/1785400437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400442",
      "ref": "node/1785400442",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400461",
      "ref": "node/1785400461",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400472",
      "ref": "node/1785400472",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400473",
      "ref": "node/1785400473",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400474",
      "ref": "node/1785400474",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400547",
      "ref": "node/1785400547",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400574",
      "ref": "node/1785400574",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400747",
      "ref": "node/1785400747",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785400841",
      "ref": "node/1785400841",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1785401124",
      "ref": "node/1785401124",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2223178",
      "ref": "relation/2223178",
      "kind": "water"
    },
    {
      "id": "water-way-60203695",
      "ref": "way/60203695",
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
