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
  "name": "Montevideo",
  "box": [
    -35.08677248993398,
    -56.4108696731972,
    -34.725010710066016,
    -55.97174932680281
  ],
  "core": [
    -34.95111182248349,
    -56.24610855253493,
    -34.8606713775165,
    -56.13651044746508
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/56393958",
      "line": "Terminal Tres Cruces, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3454449533",
      "line": "Café Brasilero, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/11351954825",
      "line": "Instituto de Alta Especialización Las Piedras, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/153029522",
      "line": "Banco de Prótesis, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/205235361",
      "line": "Parque Fernando Garcia, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/37684509",
      "line": "Montevideo Shopping, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1194306225",
      "line": "Santuario Nacional de María Auxiliadora, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/11082071333",
      "line": "Canteras del Parque Rodó; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/275205298",
      "line": "Residencia Presidencial de Suárez y Reyes, a mapped place for the game."
    },
    {
      "key": "osm-relation-19405788",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/19405788",
      "line": "Facultad de Ciencias Sociales, a mapped place for the game."
    },
    {
      "key": "osm-way-179188519",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/179188519",
      "line": "Jardines del Hipódromo, a mapped place for the game."
    },
    {
      "key": "osm-way-205235002",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/205235002",
      "line": "Zoo Parque Lecocq, a mapped place for the game."
    },
    {
      "key": "osm-way-203747760",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/203747760",
      "line": "Fortaleza General Artigas, a mapped place for the game."
    },
    {
      "key": "osm-way-283022176",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/283022176",
      "line": "Antel Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-37663273",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/37663273",
      "line": "Estadio Parque Abraham Paladino, a mapped place for the game."
    },
    {
      "key": "osm-way-734281143",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/734281143",
      "line": "Parroquía Stella Maris, a mapped place for the game."
    },
    {
      "key": "osm-relation-16865136",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/16865136",
      "line": "Costa Urbana Shopping, a mapped place for the game."
    },
    {
      "key": "osm-node-5978898986",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5978898986",
      "line": "Casa Quinta de Luis Alberto de Herrera, a mapped place for the game."
    },
    {
      "key": "osm-way-37519468",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/37519468",
      "line": "Capilla Santuario de la Beata Francisca Rubatto, a mapped place for the game."
    },
    {
      "key": "osm-way-243734894",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/243734894",
      "line": "Hospital Vilardebó, a mapped place for the game."
    },
    {
      "key": "osm-way-180467229",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/180467229",
      "line": "Hospital Pasteur, a mapped place for the game."
    },
    {
      "key": "osm-node-2623629243",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2623629243",
      "line": "Escuela de Parteras, a mapped place for the game."
    },
    {
      "key": "osm-node-11285163368",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/11285163368",
      "line": "Instituto Normal de Enseñanza Técnica, a mapped place for the game."
    },
    {
      "key": "osm-way-81796454",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/81796454",
      "line": "Punta Carretas Shopping, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11174419920",
      "ref": "node/11174419920",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11273230287",
      "ref": "node/11273230287",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11291233248",
      "ref": "node/11291233248",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1302333470",
      "ref": "node/1302333470",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1303806675",
      "ref": "node/1303806675",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695379552",
      "ref": "node/1695379552",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695383059",
      "ref": "node/1695383059",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695384337",
      "ref": "node/1695384337",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695386473",
      "ref": "node/1695386473",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695387137",
      "ref": "node/1695387137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695388853",
      "ref": "node/1695388853",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695389144",
      "ref": "node/1695389144",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695390079",
      "ref": "node/1695390079",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695390539",
      "ref": "node/1695390539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695390838",
      "ref": "node/1695390838",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695391554",
      "ref": "node/1695391554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695391775",
      "ref": "node/1695391775",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695394646",
      "ref": "node/1695394646",
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
