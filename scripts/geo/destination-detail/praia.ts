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
  "name": "Praia",
  "box": [
    14.735400210066022,
    -23.695594354538553,
    15.09716198993398,
    -23.323424645461447
  ],
  "core": [
    14.871060877516506,
    -23.556001148115012,
    14.961501322483496,
    -23.463017851884988
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/80035032",
      "line": "Porto da Praia, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/283689726",
      "line": "Kusa di kasa, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1002802348",
      "line": "University of Cape Verde, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/7426734305",
      "line": "Hospital de São Domingos, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/95807245",
      "line": "Praça Alexandre Albuquerque, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/8069363808",
      "line": "Mercado Municipal, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/197049485",
      "line": "Nossa Senhora do Rosário, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/194097856",
      "line": "Praça Luís de Camões; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/12850410",
      "line": "Palácio Presidencial, a mapped place for the game."
    },
    {
      "key": "osm-way-236735652",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/236735652",
      "line": "Unica, a mapped place for the game."
    },
    {
      "key": "osm-way-665879789",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665879789",
      "line": "Estádio da Varzea, a mapped place for the game."
    },
    {
      "key": "osm-node-909626615",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/909626615",
      "line": "Pelourinho da Cidade Velha, a mapped place for the game."
    },
    {
      "key": "osm-way-194252477",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/194252477",
      "line": "Museou Etnográfico, a mapped place for the game."
    },
    {
      "key": "osm-way-954580000",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/954580000",
      "line": "Igreja de Nossa Senhora da Graça, a mapped place for the game."
    },
    {
      "key": "osm-way-240118946",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/240118946",
      "line": "Jean Piaget University of Cape Verde, a mapped place for the game."
    },
    {
      "key": "osm-relation-12849568",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/12849568",
      "line": "Arquivo Historico Nacional, a mapped place for the game."
    },
    {
      "key": "osm-node-6432419161",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6432419161",
      "line": "Big Lanche, a mapped place for the game."
    },
    {
      "key": "osm-node-4970670691",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4970670691",
      "line": "Ponta Sambala, a mapped place for the game."
    },
    {
      "key": "osm-way-1208534900",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1208534900",
      "line": "Estádio Nacional de Cabo Verde, a mapped place for the game."
    },
    {
      "key": "osm-node-7933657029",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7933657029",
      "line": "Restaurante Daly, a mapped place for the game."
    },
    {
      "key": "osm-node-7490200241",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7490200241",
      "line": "Mercado de Minho Branco, a mapped place for the game."
    },
    {
      "key": "osm-way-239654104",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/239654104",
      "line": "Hospital de Trindade, Psicatria, a mapped place for the game."
    },
    {
      "key": "osm-way-819344290",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/819344290",
      "line": "Centro de Saúde Achada Grande Trás, a mapped place for the game."
    },
    {
      "key": "osm-node-4706531118",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4706531118",
      "line": "Praia Shopping, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1695068546",
      "ref": "node/1695068546",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2440324947",
      "ref": "node/2440324947",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2441299332",
      "ref": "node/2441299332",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2441425412",
      "ref": "node/2441425412",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2441425435",
      "ref": "node/2441425435",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2441425436",
      "ref": "node/2441425436",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2441425437",
      "ref": "node/2441425437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-253783141",
      "ref": "node/253783141",
      "kind": "neighbourhood"
    },
    {
      "id": "district-910651815",
      "ref": "node/910651815",
      "kind": "neighbourhood"
    },
    {
      "id": "district-910651822",
      "ref": "node/910651822",
      "kind": "neighbourhood"
    },
    {
      "id": "district-910651827",
      "ref": "node/910651827",
      "kind": "neighbourhood"
    },
    {
      "id": "district-910651831",
      "ref": "node/910651831",
      "kind": "neighbourhood"
    },
    {
      "id": "district-930396143",
      "ref": "node/930396143",
      "kind": "neighbourhood"
    },
    {
      "id": "district-930396535",
      "ref": "node/930396535",
      "kind": "neighbourhood"
    },
    {
      "id": "district-930396721",
      "ref": "node/930396721",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11769108423",
      "ref": "node/11769108423",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695074295",
      "ref": "node/1695074295",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2440480646",
      "ref": "node/2440480646",
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
