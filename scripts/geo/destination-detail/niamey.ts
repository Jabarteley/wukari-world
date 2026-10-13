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
  "name": "Niamey",
  "box": [
    13.343953110066021,
    1.9248950321127272,
    13.70571488993398,
    2.294750967887273
  ],
  "core": [
    13.479613777516505,
    2.0636175593294976,
    13.570054222483495,
    2.1560284406705024
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2750057668",
      "line": "Sonef Tranport Voyageurs, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7468674723",
      "line": "Restaurant Banodo, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/13527816",
      "line": "Abdou Moumouni University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/789361639",
      "line": "Hôpital de Gawèye, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/699097345",
      "line": "Zen Espace, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/687861467",
      "line": "Marché de Bougoum, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/38758638",
      "line": "Great Mosque of Niamey, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/11104852426",
      "line": "Rond point Tolle; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/11962382179",
      "line": "SONIDEP Dépôt de Sorey, a mapped place for the game."
    },
    {
      "key": "osm-node-2454056091",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2454056091",
      "line": "AGRHYMET Regional Center, a mapped place for the game."
    },
    {
      "key": "osm-way-611735693",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/611735693",
      "line": "Stade Général Seyni Kountché, a mapped place for the game."
    },
    {
      "key": "osm-node-1684101906",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1684101906",
      "line": "Boubou Hama National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-308752310",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/308752310",
      "line": "National Hospital of Niamey, a mapped place for the game."
    },
    {
      "key": "osm-way-380017757",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/380017757",
      "line": "Église Notre-Dame du Perpétuel Secours, a mapped place for the game."
    },
    {
      "key": "osm-node-2715713022",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2715713022",
      "line": "Place Djibo Bakary, a mapped place for the game."
    },
    {
      "key": "osm-node-11419918096",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/11419918096",
      "line": "Institut National de la Jeunesse, des Sports et de la Culture, a mapped place for the game."
    },
    {
      "key": "osm-node-4491536811",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4491536811",
      "line": "École des Mines de l'industrie et de la Geologie, a mapped place for the game."
    },
    {
      "key": "osm-way-1186878593",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1186878593",
      "line": "MATERNITE, a mapped place for the game."
    },
    {
      "key": "osm-node-7444882086",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7444882086",
      "line": "Kangaweydo, a mapped place for the game."
    },
    {
      "key": "osm-way-1160782464",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1160782464",
      "line": "Parc d'Attraction Aéroport, a mapped place for the game."
    },
    {
      "key": "osm-way-1013753293",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1013753293",
      "line": "Marché Kalley Plateau, a mapped place for the game."
    },
    {
      "key": "osm-way-628422326",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/628422326",
      "line": "Parc d'agrément, a mapped place for the game."
    },
    {
      "key": "osm-node-10770891720",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10770891720",
      "line": "Restaurant Soniloga, a mapped place for the game."
    },
    {
      "key": "osm-way-921259734",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/921259734",
      "line": "Restaurant Bani Bani, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1068602851",
      "ref": "node/1068602851",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1069001533",
      "ref": "node/1069001533",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1693492900",
      "ref": "node/1693492900",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695312887",
      "ref": "node/1695312887",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1695313000",
      "ref": "node/1695313000",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2715220437",
      "ref": "node/2715220437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2726648672",
      "ref": "node/2726648672",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2726648673",
      "ref": "node/2726648673",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2726648674",
      "ref": "node/2726648674",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2726697919",
      "ref": "node/2726697919",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2749927203",
      "ref": "node/2749927203",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2760400218",
      "ref": "node/2760400218",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2760400226",
      "ref": "node/2760400226",
      "kind": "neighbourhood"
    },
    {
      "id": "district-305185407",
      "ref": "node/305185407",
      "kind": "neighbourhood"
    },
    {
      "id": "district-305349457",
      "ref": "node/305349457",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3156069386",
      "ref": "node/3156069386",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3191231787",
      "ref": "node/3191231787",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3195285226",
      "ref": "node/3195285226",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-5727587",
      "ref": "relation/5727587",
      "kind": "water"
    },
    {
      "id": "water-relation-6064759",
      "ref": "relation/6064759",
      "kind": "water"
    },
    {
      "id": "water-relation-8115553",
      "ref": "relation/8115553",
      "kind": "water"
    },
    {
      "id": "water-way-638399505",
      "ref": "way/638399505",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
