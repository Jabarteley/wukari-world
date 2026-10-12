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
  "name": "Tirana",
  "box": [
    41.14726731006602,
    19.578526393401457,
    41.50902908993398,
    20.058360606598544
  ],
  "core": [
    41.28292797751651,
    19.758589476672363,
    41.373368422483495,
    19.87829752332764
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/13770105810",
      "line": "Tirana International Airport, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/405351517",
      "line": "Sarajet, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1266341118",
      "line": "Universiteti POLIS, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1230008819",
      "line": "American Hospital 3, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/233519313",
      "line": "Tirana Zoo, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/293898197",
      "line": "TEG - Tirana East Gate, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/747943456",
      "line": "Baitul Awwal Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1292145197",
      "line": "Mother Teresa Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1174012234",
      "line": "General Directorate of Prisons, a mapped place for the game."
    },
    {
      "key": "osm-way-1123601207",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1123601207",
      "line": "Sports University, a mapped place for the game."
    },
    {
      "key": "osm-way-174803482",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/174803482",
      "line": "Stadiumi \"Selman Stermasi\", a mapped place for the game."
    },
    {
      "key": "osm-node-4687241329",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4687241329",
      "line": "Cave of Pëllumbas, a mapped place for the game."
    },
    {
      "key": "osm-node-4753627987",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4753627987",
      "line": "Kalaja e Dorëzit, a mapped place for the game."
    },
    {
      "key": "osm-node-10049694706",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10049694706",
      "line": "Bodini Castle, a mapped place for the game."
    },
    {
      "key": "osm-way-282299241",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/282299241",
      "line": "Citypark, a mapped place for the game."
    },
    {
      "key": "osm-way-457216792",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/457216792",
      "line": "Spitali Amerikan 2, a mapped place for the game."
    },
    {
      "key": "osm-way-835368320",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/835368320",
      "line": "Agricultural University of Tirana, a mapped place for the game."
    },
    {
      "key": "osm-way-463111184",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/463111184",
      "line": "Spitali Amerikan 1, a mapped place for the game."
    },
    {
      "key": "osm-way-1273961691",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1273961691",
      "line": "Universiteti Barleti, a mapped place for the game."
    },
    {
      "key": "osm-way-744868434",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/744868434",
      "line": "Evangelical Brotherhood of Albania, a mapped place for the game."
    },
    {
      "key": "osm-way-237087572",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/237087572",
      "line": "Kisha Katolike \"Zemra e Krishtit\", a mapped place for the game."
    },
    {
      "key": "osm-relation-3351946",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/3351946",
      "line": "Grand Park of Tirana, a mapped place for the game."
    },
    {
      "key": "osm-way-480510821",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/480510821",
      "line": "The New Bazaar, a mapped place for the game."
    },
    {
      "key": "osm-way-248355618",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/248355618",
      "line": "Rinia Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-4596338866",
      "ref": "node/4596338866",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6298022012",
      "ref": "node/6298022012",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6298022013",
      "ref": "node/6298022013",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6298022017",
      "ref": "node/6298022017",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6313760916",
      "ref": "node/6313760916",
      "kind": "neighbourhood"
    },
    {
      "id": "district-728420226",
      "ref": "node/728420226",
      "kind": "neighbourhood"
    },
    {
      "id": "district-728421072",
      "ref": "node/728421072",
      "kind": "neighbourhood"
    },
    {
      "id": "district-728423880",
      "ref": "node/728423880",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10049605333",
      "ref": "node/10049605333",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10844107559",
      "ref": "node/10844107559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11007909814",
      "ref": "node/11007909814",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11404423908",
      "ref": "node/11404423908",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11751928672",
      "ref": "node/11751928672",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4596685807",
      "ref": "node/4596685807",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6295535537",
      "ref": "node/6295535537",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6295535538",
      "ref": "node/6295535538",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6295535539",
      "ref": "node/6295535539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6298022009",
      "ref": "node/6298022009",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-6968494",
      "ref": "relation/6968494",
      "kind": "water"
    },
    {
      "id": "water-way-27553245",
      "ref": "way/27553245",
      "kind": "water"
    },
    {
      "id": "water-way-27594253",
      "ref": "way/27594253",
      "kind": "water"
    },
    {
      "id": "water-way-362239619",
      "ref": "way/362239619",
      "kind": "water"
    },
    {
      "id": "water-way-45564545",
      "ref": "way/45564545",
      "kind": "water"
    },
    {
      "id": "water-way-56203459",
      "ref": "way/56203459",
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
