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
  "name": "Bissau",
  "box": [
    11.68044311006602,
    -15.766759809105654,
    12.042204889933979,
    -15.399350190894346
  ],
  "core": [
    11.816103777516505,
    -15.628958145346646,
    11.906544222483495,
    -15.537151854653354
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2025537675",
      "line": "Paragem Central, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/600923366",
      "line": "Pelicano, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/796880343",
      "line": "Universidade Lusofona, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/5637352",
      "line": "Hospital Nacional Simão Mendes, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/378151929",
      "line": "Praça dos Heróis Nacionais, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2084166768",
      "line": "Mercado de Bandim, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/130123261",
      "line": "Bissau Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/596236052",
      "line": "Praça da Alfândega; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4494349991",
      "line": "Ministério das Finanças, a mapped place for the game."
    },
    {
      "key": "osm-node-13648547577",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/13648547577",
      "line": "GEARUFI-SC M Gabinete de Estudos, a mapped place for the game."
    },
    {
      "key": "osm-way-729707869",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/729707869",
      "line": "Estadio Lino Correia, a mapped place for the game."
    },
    {
      "key": "osm-node-5711301327",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5711301327",
      "line": "Monumento a Teixeira Pinto, a mapped place for the game."
    },
    {
      "key": "osm-node-5680620456",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5680620456",
      "line": "Monumento a Diogo Gomes, a mapped place for the game."
    },
    {
      "key": "osm-node-2084171134",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2084171134",
      "line": "Monumento aos Heróis da Independência, a mapped place for the game."
    },
    {
      "key": "osm-node-9108219424",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/9108219424",
      "line": "Centro de Saúde de Prábis, a mapped place for the game."
    },
    {
      "key": "osm-relation-9659980",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/9659980",
      "line": "Hôpital de Cumura (lèpre et tuberculose), a mapped place for the game."
    },
    {
      "key": "osm-way-112723869",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/112723869",
      "line": "Estádio Nacional 24 de Setembro, a mapped place for the game."
    },
    {
      "key": "osm-node-4810103621",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4810103621",
      "line": "rasoi resturant, a mapped place for the game."
    },
    {
      "key": "osm-node-4965931451",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4965931451",
      "line": "Coqueiros, a mapped place for the game."
    },
    {
      "key": "osm-way-572352190",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/572352190",
      "line": "Parque Europa - Lagoa de M´batonha, a mapped place for the game."
    },
    {
      "key": "osm-way-1288347449",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1288347449",
      "line": "Praça Titina Silá, a mapped place for the game."
    },
    {
      "key": "osm-node-4719996189",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4719996189",
      "line": "Feira de Artesanato e Ateliers / Mercado dos Coqueiros, a mapped place for the game."
    },
    {
      "key": "osm-way-130194162",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/130194162",
      "line": "Faculdade de Direito, a mapped place for the game."
    },
    {
      "key": "osm-node-2082479562",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2082479562",
      "line": "Mercado Central, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3798278886",
      "ref": "node/3798278886",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2000531342",
      "ref": "node/2000531342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107822603",
      "ref": "node/2107822603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107824097",
      "ref": "node/2107824097",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107832338",
      "ref": "node/2107832338",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107832341",
      "ref": "node/2107832341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107833603",
      "ref": "node/2107833603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107958016",
      "ref": "node/2107958016",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107960040",
      "ref": "node/2107960040",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107962725",
      "ref": "node/2107962725",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107969502",
      "ref": "node/2107969502",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107970709",
      "ref": "node/2107970709",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107987918",
      "ref": "node/2107987918",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107990922",
      "ref": "node/2107990922",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107994042",
      "ref": "node/2107994042",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2108011968",
      "ref": "node/2108011968",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2108012886",
      "ref": "node/2108012886",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2108015446",
      "ref": "node/2108015446",
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
