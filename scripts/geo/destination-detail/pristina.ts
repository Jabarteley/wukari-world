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
  "name": "Pristina",
  "box": [
    42.48299621006602,
    20.919046015952425,
    42.84475798993398,
    21.409123784047573
  ],
  "core": [
    42.61865687751651,
    21.102959237998345,
    42.709097322483494,
    21.225210562001653
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1613271652",
      "line": "Prishtinë, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2372326203",
      "line": "Aviano, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/5356750423",
      "line": "AAB College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/281597843",
      "line": "University Clinic of the Republic of Kosovo, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/7927911887",
      "line": "Park of Gërmia, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/812781071",
      "line": "Prishtina Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4458850093",
      "line": "Xhamia Karamanli, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/4591682869",
      "line": "Gjergj Kastrioti Skënderbeu Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/124899242",
      "line": "Ndërtesa Qeveritare (Ish-Rilindja), a mapped place for the game."
    },
    {
      "key": "osm-node-2163812393",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2163812393",
      "line": "Rochester Insitute of Technology Kosovo (RIT), a mapped place for the game."
    },
    {
      "key": "osm-node-4492345889",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4492345889",
      "line": "bresalc-pllaci, a mapped place for the game."
    },
    {
      "key": "osm-node-4888253784",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4888253784",
      "line": "Guri i Plakës, a mapped place for the game."
    },
    {
      "key": "osm-way-571273561",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/571273561",
      "line": "St. Nicholas Church, a mapped place for the game."
    },
    {
      "key": "osm-way-617002897",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/617002897",
      "line": "Bear Sanctuary Prishtina, a mapped place for the game."
    },
    {
      "key": "osm-way-457642563",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/457642563",
      "line": "Tomb of Sultan Murat, a mapped place for the game."
    },
    {
      "key": "osm-way-1444311509",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1444311509",
      "line": "Kisha e Prezentimit të Nënës Më të Shenjtë të Zotit, a mapped place for the game."
    },
    {
      "key": "osm-way-380982445",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/380982445",
      "line": "University for Business and Technology, a mapped place for the game."
    },
    {
      "key": "osm-node-1309233007",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/1309233007",
      "line": "Instituti i Historisë, a mapped place for the game."
    },
    {
      "key": "osm-way-206457190",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/206457190",
      "line": "Parku i Qytetit, a mapped place for the game."
    },
    {
      "key": "osm-node-2583709127",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2583709127",
      "line": "Restaurant Mileniumi i Ri, a mapped place for the game."
    },
    {
      "key": "osm-node-13027856754",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13027856754",
      "line": "MELI Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-6205211786",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6205211786",
      "line": "marec, a mapped place for the game."
    },
    {
      "key": "osm-node-5072893824",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5072893824",
      "line": "Lum i madh, a mapped place for the game."
    },
    {
      "key": "osm-node-14039469490",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/14039469490",
      "line": "Te Bicollt, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3611640986",
      "ref": "node/3611640986",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611652744",
      "ref": "node/3611652744",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611652745",
      "ref": "node/3611652745",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611682139",
      "ref": "node/3611682139",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4543903712",
      "ref": "node/4543903712",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4716805548",
      "ref": "node/4716805548",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12475766706",
      "ref": "node/12475766706",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13330229481",
      "ref": "node/13330229481",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429137828",
      "ref": "node/13429137828",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13429137873",
      "ref": "node/13429137873",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14212152088",
      "ref": "node/14212152088",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2333692398",
      "ref": "node/2333692398",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611634341",
      "ref": "node/3611634341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611652743",
      "ref": "node/3611652743",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611652746",
      "ref": "node/3611652746",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611682138",
      "ref": "node/3611682138",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611682140",
      "ref": "node/3611682140",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3611682141",
      "ref": "node/3611682141",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-14503088",
      "ref": "relation/14503088",
      "kind": "water"
    },
    {
      "id": "water-way-8027166",
      "ref": "way/8027166",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
