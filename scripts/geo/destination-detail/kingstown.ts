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
  "name": "Kingstown",
  "box": [
    12.97530551006602,
    -61.41260416105407,
    13.337067289933978,
    -61.04332003894593
  ],
  "core": [
    13.110966177516504,
    -61.27409684805649,
    13.201406622483495,
    -61.18182735194351
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1150190965",
      "line": "Kingstown, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1229595118",
      "line": "Cumberland Beach & Recreation Park, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/396950917",
      "line": "Layou Learning Resource Center, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/388297417",
      "line": "Georgetown Health Centre, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/384984933",
      "line": "Rawacou, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/509093673",
      "line": "Bayshore Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/386076226",
      "line": "Assumption Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "node/5480716454"
      },
      "ref": "node/5480716454",
      "line": "Kingstown Magistrate Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/13625739901",
      "line": "Customs and Immigration, a mapped place for the game."
    },
    {
      "key": "osm-way-386078993",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/386078993",
      "line": "American University of St Vincent School of Medicine, a mapped place for the game."
    },
    {
      "key": "osm-node-10601836368",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/10601836368",
      "line": "Mount Peggy, a mapped place for the game."
    },
    {
      "key": "osm-node-1228341374",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1228341374",
      "line": "Moonhole, a mapped place for the game."
    },
    {
      "key": "osm-way-850584945",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/850584945",
      "line": "Fort Charlotte, a mapped place for the game."
    },
    {
      "key": "osm-way-384773635",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/384773635",
      "line": "St George's Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-385029457",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/385029457",
      "line": "Vermont Nature trail, a mapped place for the game."
    },
    {
      "key": "osm-node-5484802021",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5484802021",
      "line": "Bamboo Range La Soufriere, a mapped place for the game."
    },
    {
      "key": "osm-node-4451006141",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4451006141",
      "line": "Cafe Sole’, a mapped place for the game."
    },
    {
      "key": "osm-node-10723229405",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10723229405",
      "line": "Rock-Side Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-385029456",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/385029456",
      "line": "Black Point Tunnel, a mapped place for the game."
    },
    {
      "key": "osm-node-4694400714",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4694400714",
      "line": "Spring View Park, a mapped place for the game."
    },
    {
      "key": "osm-way-386242566",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/386242566",
      "line": "Arnos Vale Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-node-11690643469",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11690643469",
      "line": "Volcano Oservatory, a mapped place for the game."
    },
    {
      "key": "osm-node-11400861069",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/11400861069",
      "line": "Argyle Isolation Center, a mapped place for the game."
    },
    {
      "key": "osm-way-573635160",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/573635160",
      "line": "Georgetown Mall, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10805419779",
      "ref": "node/10805419779",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228553",
      "ref": "node/11643228553",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228557",
      "ref": "node/11643228557",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228554",
      "ref": "node/11643228554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11642445567",
      "ref": "node/11642445567",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11642928521",
      "ref": "node/11642928521",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228559",
      "ref": "node/11643228559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8287554138",
      "ref": "node/8287554138",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3821106005",
      "ref": "node/3821106005",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3894322557",
      "ref": "node/3894322557",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228558",
      "ref": "node/11643228558",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228556",
      "ref": "node/11643228556",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228552",
      "ref": "node/11643228552",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228555",
      "ref": "node/11643228555",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228551",
      "ref": "node/11643228551",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228550",
      "ref": "node/11643228550",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228549",
      "ref": "node/11643228549",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11643228548",
      "ref": "node/11643228548",
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
