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
  "name": "La Paz",
  "box": [
    -16.676426389933976,
    -68.32117338762112,
    -16.31466461006602,
    -67.9460724123789
  ],
  "core": [
    -16.540765722483492,
    -68.18047741983405,
    -16.450325277516505,
    -68.08676838016596
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/252576497",
      "line": "Terminal de Buses La Paz, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3368870285",
      "line": "Il Portico, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/442076963",
      "line": "Instituto Tecnológico Bolivia Mar, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5649767923",
      "line": "Hospital Municipal Viacha, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/46177387",
      "line": "Parque Laguna de Cota Cota, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/194362248",
      "line": "Mercado Lanza, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/125225477",
      "line": "Catedral Metropolitana, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/389268305",
      "line": "Museo de Arte Antonio Paredes Candia; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/460691417",
      "line": "Estación Terrena Amachuma, a mapped place for the game."
    },
    {
      "key": "osm-way-105617730",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/105617730",
      "line": "Universidad Católica Boliviana San Pablo, a mapped place for the game."
    },
    {
      "key": "osm-way-1313884277",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1313884277",
      "line": "Estadio Municipal de El Alto, a mapped place for the game."
    },
    {
      "key": "osm-node-2145197042",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2145197042",
      "line": "Combate de Mecapaca, a mapped place for the game."
    },
    {
      "key": "osm-way-114037395",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/114037395",
      "line": "Estadio Olímpico Los Andes Cosmos 79, a mapped place for the game."
    },
    {
      "key": "osm-node-5354864623",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5354864623",
      "line": "Valle de las Agujas, a mapped place for the game."
    },
    {
      "key": "osm-node-2145192906",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2145192906",
      "line": "Batalla de Ingavi, a mapped place for the game."
    },
    {
      "key": "osm-relation-11730900",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/11730900",
      "line": "Moon Valley, a mapped place for the game."
    },
    {
      "key": "osm-way-105592750",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/105592750",
      "line": "Estadio Rafael Mendoza Castellón, a mapped place for the game."
    },
    {
      "key": "osm-way-44166578",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/44166578",
      "line": "Jardín Botánico, a mapped place for the game."
    },
    {
      "key": "osm-node-5273668603",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5273668603",
      "line": "Universidad Mayor de San Andrès, a mapped place for the game."
    },
    {
      "key": "osm-way-526897787",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/526897787",
      "line": "Basílica de San Francisco, a mapped place for the game."
    },
    {
      "key": "osm-way-1331129474",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1331129474",
      "line": "Basílica María Auxiliadora, a mapped place for the game."
    },
    {
      "key": "osm-node-5376703910",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5376703910",
      "line": "Trucha frita, a mapped place for the game."
    },
    {
      "key": "osm-way-872831587",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/872831587",
      "line": "Facultad de Medicina Veterinaria y Zootecnia, a mapped place for the game."
    },
    {
      "key": "osm-node-12194828333",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12194828333",
      "line": "EL RICOLIN, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12282443115",
      "ref": "node/12282443115",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1740962925",
      "ref": "node/1740962925",
      "kind": "neighbourhood"
    },
    {
      "id": "district-564237952",
      "ref": "node/564237952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6289972506",
      "ref": "node/6289972506",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11193397399",
      "ref": "node/11193397399",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11345407063",
      "ref": "node/11345407063",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11345407064",
      "ref": "node/11345407064",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11345407065",
      "ref": "node/11345407065",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373357448",
      "ref": "node/11373357448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11879912015",
      "ref": "node/11879912015",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12026211019",
      "ref": "node/12026211019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1210083634",
      "ref": "node/1210083634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12161161311",
      "ref": "node/12161161311",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12161161312",
      "ref": "node/12161161312",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12173989123",
      "ref": "node/12173989123",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12282465013",
      "ref": "node/12282465013",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12299678590",
      "ref": "node/12299678590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12299716458",
      "ref": "node/12299716458",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-120805553",
      "ref": "way/120805553",
      "kind": "water"
    },
    {
      "id": "water-way-46172898",
      "ref": "way/46172898",
      "kind": "water"
    },
    {
      "id": "water-way-46174283",
      "ref": "way/46174283",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
