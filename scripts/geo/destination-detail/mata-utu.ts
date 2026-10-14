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
  "name": "Mata Utu",
  "box": [
    -13.462922789933979,
    -176.35876110994698,
    -13.10116101006602,
    -175.98928369005304
  ],
  "core": [
    -13.327262122483495,
    -176.22018104324098,
    -13.236821677516504,
    -176.12786375675904
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6794553993",
      "line": "UGATAI, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/6794552488",
      "line": "Lycée Agricole (LPA), a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5680505898",
      "line": "Mua, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/259503104",
      "line": "Cathédrale Notre-Dame-de-l'Assomption, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1262088839",
      "line": "Place Sagato-Soane; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/13717642744",
      "line": "DOUANES & CONTRIBUTIONS DIVERSES, a mapped place for the game."
    },
    {
      "key": "osm-way-1265064150",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1265064150",
      "line": "Académie des langues Wallisienne et Futunienne, a mapped place for the game."
    },
    {
      "key": "osm-node-4590021740",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4590021740",
      "line": "View point to lake, a mapped place for the game."
    },
    {
      "key": "osm-way-346277921",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/346277921",
      "line": "Talietumu, a mapped place for the game."
    },
    {
      "key": "osm-way-364719752",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/364719752",
      "line": "Église Saint-Pierre-et-Saint-Paul, a mapped place for the game."
    },
    {
      "key": "osm-way-352005466",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/352005466",
      "line": "Chapelle Sainte Jeanne d'Arc, a mapped place for the game."
    },
    {
      "key": "osm-node-5688924021",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5688924021",
      "line": "Point de vue, a mapped place for the game."
    },
    {
      "key": "osm-node-8169183417",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8169183417",
      "line": "Bord de Mer, a mapped place for the game."
    },
    {
      "key": "osm-node-8169143117",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8169143117",
      "line": "La Paillotte, a mapped place for the game."
    },
    {
      "key": "osm-node-11340413569",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11340413569",
      "line": "Club de plongée, a mapped place for the game."
    },
    {
      "key": "osm-way-1012076688",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1012076688",
      "line": "Sia Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-677813891",
      "ref": "node/677813891",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813845",
      "ref": "node/677813845",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813868",
      "ref": "node/677813868",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813808",
      "ref": "node/677813808",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295699280",
      "ref": "node/4295699280",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813810",
      "ref": "node/677813810",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813838",
      "ref": "node/677813838",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813865",
      "ref": "node/677813865",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813877",
      "ref": "node/677813877",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813805",
      "ref": "node/677813805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813889",
      "ref": "node/677813889",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813843",
      "ref": "node/677813843",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813887",
      "ref": "node/677813887",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295699281",
      "ref": "node/4295699281",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813882",
      "ref": "node/677813882",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813858",
      "ref": "node/677813858",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813848",
      "ref": "node/677813848",
      "kind": "neighbourhood"
    },
    {
      "id": "district-677813863",
      "ref": "node/677813863",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "recreation",
      "reason": "no unused named leisure=park, or the audited fallbacks (garden, stadium, sports_centre, pitch, nature_reserve, playground) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
