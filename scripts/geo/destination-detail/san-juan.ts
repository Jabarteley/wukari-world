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
  "name": "San Juan",
  "box": [
    18.284418110066024,
    -66.30628092846186,
    18.64617988993398,
    -65.92705107153813
  ],
  "core": [
    18.42007877751651,
    -66.16403202171057,
    18.510519222483495,
    -66.06929997828942
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5356336924",
      "line": "Hato Rey, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/365141850",
      "line": "Loverbar, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/727594582",
      "line": "Caribbean University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/308741708",
      "line": "Professional Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/9489434",
      "line": "San Juan National Historic Site, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/57960816",
      "line": "San Patricio Plaza, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/295445063",
      "line": "Capilla Nuestra Señora de Lourdes, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/338720301",
      "line": "Casa Alcaldía de Bayamón; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/369424125",
      "line": "Área de Embellecimiento y Ornato, a mapped place for the game."
    },
    {
      "key": "osm-node-4892514142",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4892514142",
      "line": "Universidad Teólogica del Caribe, a mapped place for the game."
    },
    {
      "key": "osm-way-55788712",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/55788712",
      "line": "Coliseo Roberto Clemente Walker, a mapped place for the game."
    },
    {
      "key": "osm-way-196598864",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/196598864",
      "line": "Museo de Arte de Puerto Rico, a mapped place for the game."
    },
    {
      "key": "osm-way-1204253618",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1204253618",
      "line": "San Juan Puerto Rico Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-421147595",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/421147595",
      "line": "Puente Histórico de Trujillo Alto (Nº 427), a mapped place for the game."
    },
    {
      "key": "osm-way-203588975",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/203588975",
      "line": "Fortín San Juan de la Cruz, a mapped place for the game."
    },
    {
      "key": "osm-node-4727907289",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4727907289",
      "line": "La Casita Blanca, a mapped place for the game."
    },
    {
      "key": "osm-way-198390426",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/198390426",
      "line": "Polytechnic University of Puerto Rico, a mapped place for the game."
    },
    {
      "key": "osm-way-528579414",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/528579414",
      "line": "Estadio Roberto Clemente Walker, a mapped place for the game."
    },
    {
      "key": "osm-way-197848164",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/197848164",
      "line": "Universidad del Sagrado Corazón, a mapped place for the game."
    },
    {
      "key": "osm-way-255583481",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/255583481",
      "line": "San Cathedral Basilica of Saint John the Baptist, a mapped place for the game."
    },
    {
      "key": "osm-way-301913181",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/301913181",
      "line": "Estadio Hiram Bithorn Sosa, a mapped place for the game."
    },
    {
      "key": "osm-node-357273264",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/357273264",
      "line": "Estadio Manuel Carrasquillo Herpen, a mapped place for the game."
    },
    {
      "key": "osm-way-60449170",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/60449170",
      "line": "Parque Dolores Cruz, a mapped place for the game."
    },
    {
      "key": "osm-way-336398987",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/336398987",
      "line": "VA Healthcare Río Piedras, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11196797856",
      "ref": "node/11196797856",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11196851031",
      "ref": "node/11196851031",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12628610102",
      "ref": "node/12628610102",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874691",
      "ref": "node/12714874691",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874692",
      "ref": "node/12714874692",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874693",
      "ref": "node/12714874693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874694",
      "ref": "node/12714874694",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874695",
      "ref": "node/12714874695",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874696",
      "ref": "node/12714874696",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874697",
      "ref": "node/12714874697",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874698",
      "ref": "node/12714874698",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874699",
      "ref": "node/12714874699",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714874700",
      "ref": "node/12714874700",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714923901",
      "ref": "node/12714923901",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714923902",
      "ref": "node/12714923902",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714923903",
      "ref": "node/12714923903",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714923904",
      "ref": "node/12714923904",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12714923905",
      "ref": "node/12714923905",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2314218",
      "ref": "relation/2314218",
      "kind": "water"
    },
    {
      "id": "water-relation-326160",
      "ref": "relation/326160",
      "kind": "water"
    },
    {
      "id": "water-relation-5499398",
      "ref": "relation/5499398",
      "kind": "water"
    },
    {
      "id": "water-way-60335565",
      "ref": "way/60335565",
      "kind": "water"
    },
    {
      "id": "water-way-60674094",
      "ref": "way/60674094",
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
