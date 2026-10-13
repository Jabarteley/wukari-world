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
  "name": "Copenhagen",
  "box": [
    55.50584341006602,
    12.249879981907252,
    55.86760518993398,
    12.89026481809275
  ],
  "core": [
    55.64150407751651,
    12.490302696035668,
    55.731944522483495,
    12.649842103964334
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/28321802",
      "line": "Jægersborg, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/573418986",
      "line": "Morgenstedet, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/286704050",
      "line": "Hovedbiblioteket Albertslund, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/25605254",
      "line": "Hvidovre Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/4787514",
      "line": "Farum Skulpturpark, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/25665260",
      "line": "City 2, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "relation/2348273",
      "line": "Vor Frue Kloster, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/34106",
      "line": "Frederiksberg Rådhus; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/11645658019",
      "line": "The Danish Agency for Climate Data, a mapped place for the game."
    },
    {
      "key": "osm-way-25700603",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/25700603",
      "line": "Borupgaard Gymnasium, a mapped place for the game."
    },
    {
      "key": "osm-node-290001160",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/290001160",
      "line": "Oxbjerget, a mapped place for the game."
    },
    {
      "key": "osm-way-4218311",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/4218311",
      "line": "Flakfortet, a mapped place for the game."
    },
    {
      "key": "osm-way-27890242",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/27890242",
      "line": "Ganløse Kirke, a mapped place for the game."
    },
    {
      "key": "osm-way-28615766",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28615766",
      "line": "Dragør Fort, a mapped place for the game."
    },
    {
      "key": "osm-way-425777077",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/425777077",
      "line": "Kongelundsfortet, a mapped place for the game."
    },
    {
      "key": "osm-way-254493673",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/254493673",
      "line": "Vedbæk Kirke, a mapped place for the game."
    },
    {
      "key": "osm-way-425763096",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/425763096",
      "line": "Mosede Fort, a mapped place for the game."
    },
    {
      "key": "osm-way-204999475",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/204999475",
      "line": "Aldershvile Slotsruin, a mapped place for the game."
    },
    {
      "key": "osm-way-24517109",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24517109",
      "line": "Waves, a mapped place for the game."
    },
    {
      "key": "osm-way-391594117",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/391594117",
      "line": "Royal Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-199052235",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/199052235",
      "line": "Søllerød Kro, a mapped place for the game."
    },
    {
      "key": "osm-relation-3003307",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/3003307",
      "line": "Herlev Bymidte, a mapped place for the game."
    },
    {
      "key": "osm-way-25568322",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/25568322",
      "line": "Gladsaxe Stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-246489323",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/246489323",
      "line": "Grøften, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10310445460",
      "ref": "node/10310445460",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10310467655",
      "ref": "node/10310467655",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10558988509",
      "ref": "node/10558988509",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10558988512",
      "ref": "node/10558988512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10888851491",
      "ref": "node/10888851491",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10888851492",
      "ref": "node/10888851492",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10913659479",
      "ref": "node/10913659479",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11200651327",
      "ref": "node/11200651327",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11200651329",
      "ref": "node/11200651329",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11200684761",
      "ref": "node/11200684761",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11200684762",
      "ref": "node/11200684762",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11200710884",
      "ref": "node/11200710884",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11200721183",
      "ref": "node/11200721183",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11201482800",
      "ref": "node/11201482800",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11246200548",
      "ref": "node/11246200548",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11246200549",
      "ref": "node/11246200549",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11246200553",
      "ref": "node/11246200553",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11267274296",
      "ref": "node/11267274296",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-120139",
      "ref": "relation/120139",
      "kind": "water"
    },
    {
      "id": "water-relation-12277493",
      "ref": "relation/12277493",
      "kind": "water"
    },
    {
      "id": "water-relation-1437872",
      "ref": "relation/1437872",
      "kind": "water"
    },
    {
      "id": "water-relation-2749579",
      "ref": "relation/2749579",
      "kind": "water"
    },
    {
      "id": "water-relation-4728960",
      "ref": "relation/4728960",
      "kind": "water"
    },
    {
      "id": "water-relation-537089",
      "ref": "relation/537089",
      "kind": "water"
    },
    {
      "id": "water-relation-8944234",
      "ref": "relation/8944234",
      "kind": "water"
    },
    {
      "id": "water-way-4345425",
      "ref": "way/4345425",
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
