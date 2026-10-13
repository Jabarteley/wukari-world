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
  "name": "Papeete",
  "box": [
    -17.718264389933978,
    -149.7546053940901,
    -17.356502610066023,
    -149.37738740590987
  ],
  "core": [
    -17.582603722483494,
    -149.6131131382626,
    -17.492163277516507,
    -149.51887966173737
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4934736239",
      "line": "Gare Maritime, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1422600001",
      "line": "Snack Resto Paea Manate, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/283649950",
      "line": "University of French Polynesia, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/10242033",
      "line": "Hopital psychiatrique de Taaone, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/7065226769",
      "line": "Parc naturel Te Faa Iti, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/204556920",
      "line": "Centre commercial, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/548581484",
      "line": "Église Sainte Anne, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/10088377",
      "line": "Mairie de Arue; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/643967637",
      "line": "Présidence de la Polynésie française, a mapped place for the game."
    },
    {
      "key": "osm-way-740564751",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/740564751",
      "line": "CFPA, a mapped place for the game."
    },
    {
      "key": "osm-way-41444450",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/41444450",
      "line": "Stade Pater, a mapped place for the game."
    },
    {
      "key": "osm-node-1422688771",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1422688771",
      "line": "Marae, a mapped place for the game."
    },
    {
      "key": "osm-way-204556995",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/204556995",
      "line": "Phare de la Pointe Vénus, a mapped place for the game."
    },
    {
      "key": "osm-relation-10242577",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/10242577",
      "line": "Musée de Tahiti et des Îles, a mapped place for the game."
    },
    {
      "key": "osm-way-734682036",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/734682036",
      "line": "Papeete Tahiti Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-32774088",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/32774088",
      "line": "Cathédrale Notre-Dame de Papeete, a mapped place for the game."
    },
    {
      "key": "osm-node-6904941337",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6904941337",
      "line": "Rampe parapente, a mapped place for the game."
    },
    {
      "key": "osm-node-6781735685",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6781735685",
      "line": "Captage 1000 sources, a mapped place for the game."
    },
    {
      "key": "osm-node-9695866739",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/9695866739",
      "line": "Rohotu, a mapped place for the game."
    },
    {
      "key": "osm-way-730928869",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/730928869",
      "line": "O belvédère, a mapped place for the game."
    },
    {
      "key": "osm-way-895747028",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/895747028",
      "line": "Parc Outuaraea, a mapped place for the game."
    },
    {
      "key": "osm-node-2554433116",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2554433116",
      "line": "Concept Grill, a mapped place for the game."
    },
    {
      "key": "osm-way-204557043",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/204557043",
      "line": "Marché de Arue, a mapped place for the game."
    },
    {
      "key": "osm-way-740565283",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/740565283",
      "line": "C.C., a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3221656586",
      "ref": "node/3221656586",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656588",
      "ref": "node/3221656588",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656594",
      "ref": "node/3221656594",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656600",
      "ref": "node/3221656600",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656603",
      "ref": "node/3221656603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656605",
      "ref": "node/3221656605",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656629",
      "ref": "node/3221656629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656632",
      "ref": "node/3221656632",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656634",
      "ref": "node/3221656634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656651",
      "ref": "node/3221656651",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221656658",
      "ref": "node/3221656658",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657362",
      "ref": "node/3221657362",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657368",
      "ref": "node/3221657368",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657369",
      "ref": "node/3221657369",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657370",
      "ref": "node/3221657370",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657371",
      "ref": "node/3221657371",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657372",
      "ref": "node/3221657372",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3221657373",
      "ref": "node/3221657373",
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
