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
  "name": "San José",
  "box": [
    9.75185641006602,
    -84.26216628530693,
    10.113618189933979,
    -83.89717031469306
  ],
  "core": [
    9.887517077516504,
    -84.12527366335782,
    9.977957522483495,
    -84.03406293664217
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/31420765",
      "line": "Atlántico, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/381272433",
      "line": "Isla Verde, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/40819609",
      "line": "Instituto Tecnológico de Costa Rica, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/6742258",
      "line": "Hospital San Rafael, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/12657481",
      "line": "Parque Metropolitano La Sabana, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/264040874",
      "line": "Mercado Central de San José, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1301409416",
      "line": "San José Costa Rica Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/6275464",
      "line": "Plaza de la Cultura; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/13964947",
      "line": "Archivo Nacional, a mapped place for the game."
    },
    {
      "key": "osm-relation-10650174",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/10650174",
      "line": "Universidad Nacional, a mapped place for the game."
    },
    {
      "key": "osm-way-1001557950",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1001557950",
      "line": "Estadio Ecológico, a mapped place for the game."
    },
    {
      "key": "osm-node-10186229658",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10186229658",
      "line": "Accidente aeréo Vuelo 32 de SANSA, a mapped place for the game."
    },
    {
      "key": "osm-node-1945457564",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1945457564",
      "line": "Monumento al Pacto del Jocote, a mapped place for the game."
    },
    {
      "key": "osm-way-76579523",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/76579523",
      "line": "Estadio ST Center, a mapped place for the game."
    },
    {
      "key": "osm-way-201513043",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/201513043",
      "line": "Hospital San Vicente de Paúl, a mapped place for the game."
    },
    {
      "key": "osm-way-30173401",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/30173401",
      "line": "Parque de Diversiones, a mapped place for the game."
    },
    {
      "key": "osm-way-25400008",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/25400008",
      "line": "Hospital México, a mapped place for the game."
    },
    {
      "key": "osm-way-617155310",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/617155310",
      "line": "Estadio Alejandro Morera Soto, a mapped place for the game."
    },
    {
      "key": "osm-way-102243517",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/102243517",
      "line": "Basílica de Nuestra Señora de Los Ángeles, a mapped place for the game."
    },
    {
      "key": "osm-way-305168533",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/305168533",
      "line": "Plaza Cleto González Víquez, a mapped place for the game."
    },
    {
      "key": "osm-way-264042444",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/264042444",
      "line": "Catedral Metropolitana de San José, a mapped place for the game."
    },
    {
      "key": "osm-way-301278166",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/301278166",
      "line": "Bomberos de Costa Rica - Academia Nacional, a mapped place for the game."
    },
    {
      "key": "osm-way-415630885",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/415630885",
      "line": "Parque Okayama, a mapped place for the game."
    },
    {
      "key": "osm-relation-17706739",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/17706739",
      "line": "Universidad Latina de Costa Rica, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3331299223",
      "ref": "node/3331299223",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10145521111",
      "ref": "node/10145521111",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10187491431",
      "ref": "node/10187491431",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10226305038",
      "ref": "node/10226305038",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1040702756",
      "ref": "node/1040702756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10553880639",
      "ref": "node/10553880639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10599011084",
      "ref": "node/10599011084",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10599011085",
      "ref": "node/10599011085",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10599011086",
      "ref": "node/10599011086",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10711484306",
      "ref": "node/10711484306",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1074035300",
      "ref": "node/1074035300",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10848135621",
      "ref": "node/10848135621",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10888908586",
      "ref": "node/10888908586",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10922240148",
      "ref": "node/10922240148",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10971708937",
      "ref": "node/10971708937",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11027968912",
      "ref": "node/11027968912",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1104253451",
      "ref": "node/1104253451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11118179304",
      "ref": "node/11118179304",
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
