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
  "name": "Riga",
  "box": [
    56.76851681006602,
    23.77415072686342,
    57.13027858993398,
    24.43621847313658
  ],
  "core": [
    56.904177477516505,
    24.02272803686108,
    56.99461792248349,
    24.187641163138924
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/467091568",
      "line": "Kalngale, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/293876722",
      "line": "Briezes, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/430708777",
      "line": "Rīgas Valsts tehnikums, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/17588998",
      "line": "Pauls Stradiņš Clinical university hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/88326540",
      "line": "Zemitāna laukums, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/152306757",
      "line": "Ozols, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/88027358",
      "line": "Biķeru Svētās Katrīnas baznīca, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/7767862916",
      "line": "Baumaņa skvērs; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/7546142863",
      "line": "Body of European Regulators for Electronic Communications, a mapped place for the game."
    },
    {
      "key": "osm-way-479748207",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/479748207",
      "line": "RSU Sporta akadēmija, a mapped place for the game."
    },
    {
      "key": "osm-way-153019384",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/153019384",
      "line": "Salaspils stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-5257943276",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5257943276",
      "line": "Daugavgrīvas cietoksnis, a mapped place for the game."
    },
    {
      "key": "osm-way-976058477",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/976058477",
      "line": "Riga Aviation Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-837991340",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/837991340",
      "line": "Daugavas muzejs, a mapped place for the game."
    },
    {
      "key": "osm-way-1309603872",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1309603872",
      "line": "Dauderu parks, a mapped place for the game."
    },
    {
      "key": "osm-way-406039559",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/406039559",
      "line": "Olaines luterāņu baznīca, a mapped place for the game."
    },
    {
      "key": "osm-way-4469063",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/4469063",
      "line": "Riga National Zoological Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-104407997",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/104407997",
      "line": "Church of the Resurrection, a mapped place for the game."
    },
    {
      "key": "osm-way-25867450",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/25867450",
      "line": "Spice, a mapped place for the game."
    },
    {
      "key": "osm-way-380059745",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/380059745",
      "line": "Rīga Stradiņš University, a mapped place for the game."
    },
    {
      "key": "osm-way-476926467",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/476926467",
      "line": "Daugava Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-38247112",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/38247112",
      "line": "Xiaomi Arēna, a mapped place for the game."
    },
    {
      "key": "osm-way-37953112",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/37953112",
      "line": "Domina Shopping, a mapped place for the game."
    },
    {
      "key": "osm-way-385118270",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/385118270",
      "line": "Turiba University, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12444122117",
      "ref": "node/12444122117",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13849201949",
      "ref": "node/13849201949",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640171",
      "ref": "node/1411640171",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640173",
      "ref": "node/1411640173",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640175",
      "ref": "node/1411640175",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640176",
      "ref": "node/1411640176",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640177",
      "ref": "node/1411640177",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640178",
      "ref": "node/1411640178",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640180",
      "ref": "node/1411640180",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640181",
      "ref": "node/1411640181",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640182",
      "ref": "node/1411640182",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640183",
      "ref": "node/1411640183",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640184",
      "ref": "node/1411640184",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640185",
      "ref": "node/1411640185",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640186",
      "ref": "node/1411640186",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640187",
      "ref": "node/1411640187",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640188",
      "ref": "node/1411640188",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411640189",
      "ref": "node/1411640189",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1269463",
      "ref": "relation/1269463",
      "kind": "water"
    },
    {
      "id": "water-relation-1269473",
      "ref": "relation/1269473",
      "kind": "water"
    },
    {
      "id": "water-relation-1577034",
      "ref": "relation/1577034",
      "kind": "water"
    },
    {
      "id": "water-relation-1605816",
      "ref": "relation/1605816",
      "kind": "water"
    },
    {
      "id": "water-relation-5462605",
      "ref": "relation/5462605",
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
