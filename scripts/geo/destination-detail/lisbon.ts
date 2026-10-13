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
  "name": "Lisbon",
  "box": [
    38.52686981006602,
    -9.36741112308337,
    38.88863158993398,
    -8.905772676916632
  ],
  "core": [
    38.662530477516505,
    -9.194186876005324,
    38.75297092248349,
    -9.078996923994678
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/256976574",
      "line": "Praça de Espanha, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5111823023",
      "line": "Casa da Dizima, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/108278582",
      "line": "Universidade Politécnica de Setúbal, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/510427026",
      "line": "Hospital Beatriz Ângelo, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/18307787",
      "line": "Quinta do Bonjardim, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/110230559",
      "line": "Freeport Lisboa Fashion Outlet, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/558658121",
      "line": "Igreja de Montelavar, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/15475187",
      "line": "Praça Afonso de Albuquerque; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/9280307466",
      "line": "Tribunal Central de Instrução Criminal, a mapped place for the game."
    },
    {
      "key": "osm-way-100443688",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/100443688",
      "line": "Escola Superior de Teatro e Cinema, a mapped place for the game."
    },
    {
      "key": "osm-relation-8198208",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/8198208",
      "line": "Praça de Toiros Amadeu Augusto dos Santos, a mapped place for the game."
    },
    {
      "key": "osm-node-1191138578",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1191138578",
      "line": "Grutas da Quinta do Anjo, a mapped place for the game."
    },
    {
      "key": "osm-way-364773455",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/364773455",
      "line": "Forte da Casa, a mapped place for the game."
    },
    {
      "key": "osm-way-722649425",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/722649425",
      "line": "Minicomboio da Caparica, a mapped place for the game."
    },
    {
      "key": "osm-way-243295693",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/243295693",
      "line": "Parque da Vila, a mapped place for the game."
    },
    {
      "key": "osm-way-558565533",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/558565533",
      "line": "Igreja de São Pedro, a mapped place for the game."
    },
    {
      "key": "osm-relation-3174204",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/3174204",
      "line": "Convento de Santos-o-Novo, a mapped place for the game."
    },
    {
      "key": "osm-way-254561957",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/254561957",
      "line": "Almada Forum, a mapped place for the game."
    },
    {
      "key": "osm-way-812621314",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/812621314",
      "line": "Jardim da Quinta de Santa Clara, a mapped place for the game."
    },
    {
      "key": "osm-way-179419205",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/179419205",
      "line": "Nova School of Business and Economics, a mapped place for the game."
    },
    {
      "key": "osm-way-144001459",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/144001459",
      "line": "Hospital de Santa Cruz, a mapped place for the game."
    },
    {
      "key": "osm-way-42645796",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/42645796",
      "line": "Centro Comercial Colombo, a mapped place for the game."
    },
    {
      "key": "osm-way-36615985",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/36615985",
      "line": "National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-52430141",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/52430141",
      "line": "NOVA School of Science and Technology, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10138186938",
      "ref": "node/10138186938",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10970085504",
      "ref": "node/10970085504",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11190330257",
      "ref": "node/11190330257",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841736",
      "ref": "node/1148841736",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841793",
      "ref": "node/1148841793",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841838",
      "ref": "node/1148841838",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841899",
      "ref": "node/1148841899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841905",
      "ref": "node/1148841905",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841919",
      "ref": "node/1148841919",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148841927",
      "ref": "node/1148841927",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12248866710",
      "ref": "node/12248866710",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12248905769",
      "ref": "node/12248905769",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12553505446",
      "ref": "node/12553505446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1493246250",
      "ref": "node/1493246250",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1493262317",
      "ref": "node/1493262317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1564076788",
      "ref": "node/1564076788",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1603930076",
      "ref": "node/1603930076",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1603964849",
      "ref": "node/1603964849",
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
