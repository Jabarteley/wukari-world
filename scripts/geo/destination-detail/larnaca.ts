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
  "name": "Larnaca",
  "box": [
    34.74272861006602,
    33.40401051135458,
    35.10449038993398,
    33.84322628864542
  ],
  "core": [
    34.878389277516504,
    33.56880749822611,
    34.96882972248349,
    33.67842930177389
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3216499349",
      "line": "Larnaca Central Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1615700362",
      "line": "Coast of India, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1465359719",
      "line": "University of Central Lancashire Cyprus, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/91496088",
      "line": "Larnaca General Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/558250319",
      "line": "Fountain & Statue of Artemis, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5125803724",
      "line": "Sunday Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/190662188",
      "line": "Church of Saint Euphemianos, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/26958238",
      "line": "Europe square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/453895869",
      "line": "Beyarmudu Border Gate, a mapped place for the game."
    },
    {
      "key": "osm-way-536939636",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/536939636",
      "line": "Alexander College, a mapped place for the game."
    },
    {
      "key": "osm-way-186575346",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/186575346",
      "line": "Chalkanoras Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-256609297",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/256609297",
      "line": "Stavrovouni Monastery, a mapped place for the game."
    },
    {
      "key": "osm-way-1033582203",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1033582203",
      "line": "Avgorou Community Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1492777202",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1492777202",
      "line": "Hala Sultan Tekke, a mapped place for the game."
    },
    {
      "key": "osm-relation-20507958",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/20507958",
      "line": "Kamares Aqueduct, a mapped place for the game."
    },
    {
      "key": "osm-way-149466626",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/149466626",
      "line": "Panagia Aggeloktisti, a mapped place for the game."
    },
    {
      "key": "osm-way-513962296",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/513962296",
      "line": "Catholic Church of The Virgin Mary of The Graces, a mapped place for the game."
    },
    {
      "key": "osm-way-493412494",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/493412494",
      "line": "Old GSZ Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-513953442",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/513953442",
      "line": "Larnaca College, a mapped place for the game."
    },
    {
      "key": "osm-node-4401051294",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4401051294",
      "line": "Girokomio Athienou, a mapped place for the game."
    },
    {
      "key": "osm-node-9852870606",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9852870606",
      "line": "Beach Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-4361248690",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4361248690",
      "line": "Ayia Anna taverna, a mapped place for the game."
    },
    {
      "key": "osm-way-1251246319",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1251246319",
      "line": "Park of Georgia Kyriakidou, a mapped place for the game."
    },
    {
      "key": "osm-way-759244399",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/759244399",
      "line": "Akıncılar Sağlık Merkezi, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1062474341",
      "ref": "node/1062474341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1062474342",
      "ref": "node/1062474342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1062474823",
      "ref": "node/1062474823",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1062508317",
      "ref": "node/1062508317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2152254743",
      "ref": "node/2152254743",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9432041419",
      "ref": "node/9432041419",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9432154021",
      "ref": "node/9432154021",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9432166994",
      "ref": "node/9432166994",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9432202899",
      "ref": "node/9432202899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9438142699",
      "ref": "node/9438142699",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9438190364",
      "ref": "node/9438190364",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9438263323",
      "ref": "node/9438263323",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9454138763",
      "ref": "node/9454138763",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12050711376",
      "ref": "node/12050711376",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12050711377",
      "ref": "node/12050711377",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-149623808",
      "ref": "way/149623808",
      "kind": "water"
    },
    {
      "id": "water-way-198007906",
      "ref": "way/198007906",
      "kind": "water"
    },
    {
      "id": "water-way-203111818",
      "ref": "way/203111818",
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
