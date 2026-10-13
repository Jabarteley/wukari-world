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
  "name": "Yerevan",
  "box": [
    39.99683031006602,
    44.2768481023053,
    40.35859208993398,
    44.7483984976947
  ],
  "core": [
    40.132490977516504,
    44.453797701115455,
    40.22293142248349,
    44.57144889888455
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5332867819",
      "line": "Sasuntsi David, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3651477802",
      "line": "Tavern Yerevan, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/386440931",
      "line": "Gevorgyan Seminary, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4882148342",
      "line": "Izmirlian Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/277036723",
      "line": "Jrvezh Forest Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/116719155",
      "line": "Dalma Garden Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/121823299",
      "line": "Hovhannavank, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1201853729",
      "line": "Alexander Myasnikyan Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/1267676",
      "line": "National Parliament, a mapped place for the game."
    },
    {
      "key": "osm-relation-15349086",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/15349086",
      "line": "Russian-Armenian State University, a mapped place for the game."
    },
    {
      "key": "osm-relation-18398590",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/18398590",
      "line": "Yerevan velodrome, a mapped place for the game."
    },
    {
      "key": "osm-way-108255791",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/108255791",
      "line": "Garni Pagan Temple;Garni Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-224162673",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/224162673",
      "line": "Saint Mesrop Mashtots church, a mapped place for the game."
    },
    {
      "key": "osm-node-2261309386",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2261309386",
      "line": "Kaptavanq, a mapped place for the game."
    },
    {
      "key": "osm-node-11059334139",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11059334139",
      "line": "Georgi Dimitrov, a mapped place for the game."
    },
    {
      "key": "osm-way-842206349",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/842206349",
      "line": "Tiknuni castle, a mapped place for the game."
    },
    {
      "key": "osm-relation-16558688",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/16558688",
      "line": "Park aft. Tatul Krpeyan, a mapped place for the game."
    },
    {
      "key": "osm-way-32402461",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/32402461",
      "line": "Lyon Park, a mapped place for the game."
    },
    {
      "key": "osm-way-31620404",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/31620404",
      "line": "Vazgen Sargsyan Republican Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-31662730",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/31662730",
      "line": "Vernissage, a mapped place for the game."
    },
    {
      "key": "osm-way-33771226",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/33771226",
      "line": "Yerevan Mall, a mapped place for the game."
    },
    {
      "key": "osm-node-2269341279",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2269341279",
      "line": "Yerevan State Institute of Theatre and Cinematography, a mapped place for the game."
    },
    {
      "key": "osm-way-31662997",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/31662997",
      "line": "Hrazdan stadium, a mapped place for the game."
    },
    {
      "key": "osm-relation-16017332",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/16017332",
      "line": "American University of Armenia, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11422692123",
      "ref": "node/11422692123",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692124",
      "ref": "node/11422692124",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692125",
      "ref": "node/11422692125",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692126",
      "ref": "node/11422692126",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692127",
      "ref": "node/11422692127",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692128",
      "ref": "node/11422692128",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692130",
      "ref": "node/11422692130",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692131",
      "ref": "node/11422692131",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692132",
      "ref": "node/11422692132",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11422692133",
      "ref": "node/11422692133",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12112056200",
      "ref": "node/12112056200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1464072722",
      "ref": "node/1464072722",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12439095707",
      "ref": "node/12439095707",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12439095838",
      "ref": "node/12439095838",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12439095839",
      "ref": "node/12439095839",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12439096593",
      "ref": "node/12439096593",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12439096601",
      "ref": "node/12439096601",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12439096664",
      "ref": "node/12439096664",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15674125",
      "ref": "relation/15674125",
      "kind": "water"
    },
    {
      "id": "water-relation-17884226",
      "ref": "relation/17884226",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
