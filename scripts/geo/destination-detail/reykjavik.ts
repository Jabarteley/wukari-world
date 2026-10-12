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
  "name": "Reykjavik",
  "box": [
    63.965100110066025,
    -22.626087657575244,
    64.32686188993398,
    -21.527538956024504
  ],
  "core": [
    64.10076077751651,
    -22.04540326036994,
    64.1912012224835,
    -21.839070139630056
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/22880576",
      "line": "Hlemmur mathöll, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5907178185",
      "line": "Dill, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/55450392",
      "line": "Menntaskólinn við Sund, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/290982361",
      "line": "Kleppsspítali, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/129577128",
      "line": "Hellisgerði, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/45705386",
      "line": "Smáralind, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/106603286",
      "line": "Árbæjarkirkja, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/89811581",
      "line": "Reykjavik City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/8805317052",
      "line": "Ministry of Health, a mapped place for the game."
    },
    {
      "key": "osm-way-222403700",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/222403700",
      "line": "Fjölbrautaskólinn í Garðabæ, a mapped place for the game."
    },
    {
      "key": "osm-way-976381108",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/976381108",
      "line": "Akranesvöllur, a mapped place for the game."
    },
    {
      "key": "osm-node-1243688088",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1243688088",
      "line": "Gljúfrasteinn, a mapped place for the game."
    },
    {
      "key": "osm-way-167395358",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/167395358",
      "line": "Bessastaðakirkja, a mapped place for the game."
    },
    {
      "key": "osm-node-6548895586",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6548895586",
      "line": "Icelandic Museum of Rock 'n' Roll, a mapped place for the game."
    },
    {
      "key": "osm-way-221045291",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/221045291",
      "line": "Lágafellskirkja, a mapped place for the game."
    },
    {
      "key": "osm-relation-8600434",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/8600434",
      "line": "Rauðhólar, a mapped place for the game."
    },
    {
      "key": "osm-way-684889280",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/684889280",
      "line": "Mjóddin, a mapped place for the game."
    },
    {
      "key": "osm-way-975669150",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/975669150",
      "line": "Stjörnuvöllur, a mapped place for the game."
    },
    {
      "key": "osm-way-895275808",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/895275808",
      "line": "Meistaravellir, a mapped place for the game."
    },
    {
      "key": "osm-way-169829966",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/169829966",
      "line": "Rútstún, a mapped place for the game."
    },
    {
      "key": "osm-way-101084753",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/101084753",
      "line": "Verzlunarskóli Íslands, a mapped place for the game."
    },
    {
      "key": "osm-way-372405646",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/372405646",
      "line": "Iceland University of the Arts, a mapped place for the game."
    },
    {
      "key": "osm-way-64047767",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/64047767",
      "line": "Landspítali, a mapped place for the game."
    },
    {
      "key": "osm-way-720383792",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/720383792",
      "line": "Arnarhóll, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10751233484",
      "ref": "node/10751233484",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11988962235",
      "ref": "node/11988962235",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11989042312",
      "ref": "node/11989042312",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11989042313",
      "ref": "node/11989042313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11989042314",
      "ref": "node/11989042314",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12191593092",
      "ref": "node/12191593092",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12191665416",
      "ref": "node/12191665416",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13574201371",
      "ref": "node/13574201371",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1799904733",
      "ref": "node/1799904733",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2297684407",
      "ref": "node/2297684407",
      "kind": "neighbourhood"
    },
    {
      "id": "district-297536441",
      "ref": "node/297536441",
      "kind": "neighbourhood"
    },
    {
      "id": "district-297536505",
      "ref": "node/297536505",
      "kind": "neighbourhood"
    },
    {
      "id": "district-303589057",
      "ref": "node/303589057",
      "kind": "neighbourhood"
    },
    {
      "id": "district-308971841",
      "ref": "node/308971841",
      "kind": "neighbourhood"
    },
    {
      "id": "district-308972509",
      "ref": "node/308972509",
      "kind": "neighbourhood"
    },
    {
      "id": "district-319257770",
      "ref": "node/319257770",
      "kind": "neighbourhood"
    },
    {
      "id": "district-319257776",
      "ref": "node/319257776",
      "kind": "neighbourhood"
    },
    {
      "id": "district-319257777",
      "ref": "node/319257777",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-37643",
      "ref": "relation/37643",
      "kind": "water"
    },
    {
      "id": "water-relation-8834612",
      "ref": "relation/8834612",
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
