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
  "name": "Nuuk",
  "box": [
    63.99582401006602,
    -52.15130533577506,
    64.35758578993398,
    -51.320983464224945
  ],
  "core": [
    64.13148467751651,
    -51.839425495057256,
    64.2219251224835,
    -51.632863304942745
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1019617098",
      "line": "Farmers, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/252170985",
      "line": "University of Greenland, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/85628069",
      "line": "Queen Ingrid's Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1276583869",
      "line": "Mitsimmavik, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/256786456",
      "line": "Kalaaliaraq Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/255788841",
      "line": "Hans Egedes Kirke, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/252790917",
      "line": "Kommuneqarfik Sermersooq; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/252161876",
      "line": "Nukissiorfiit, a mapped place for the game."
    },
    {
      "key": "osm-way-410015972",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/410015972",
      "line": "Ilinniarfissuaq, a mapped place for the game."
    },
    {
      "key": "osm-node-1295226025",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1295226025",
      "line": "Stanislawip Issikivia, a mapped place for the game."
    },
    {
      "key": "osm-way-253675197",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/253675197",
      "line": "Nuuk Art Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-14068566886",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/14068566886",
      "line": "Greenland National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-252790932",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/252790932",
      "line": "Nuuk Center, a mapped place for the game."
    },
    {
      "key": "osm-node-3265809565",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3265809565",
      "line": "Statue of Hans Egede, a mapped place for the game."
    },
    {
      "key": "osm-way-255823944",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/255823944",
      "line": "Church of Our Saviour, a mapped place for the game."
    },
    {
      "key": "osm-way-253674855",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/253674855",
      "line": "Kristi Konge, a mapped place for the game."
    },
    {
      "key": "osm-node-11851503687",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11851503687",
      "line": "Cafe Tamu, a mapped place for the game."
    },
    {
      "key": "osm-way-257366787",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/257366787",
      "line": "Nasiffik, a mapped place for the game."
    },
    {
      "key": "osm-node-4784596045",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4784596045",
      "line": "Tech College Greenland, a mapped place for the game."
    },
    {
      "key": "osm-way-255823949",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/255823949",
      "line": "Aqqaluk Plads, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10979711480",
      "ref": "node/10979711480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10979711481",
      "ref": "node/10979711481",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10979711482",
      "ref": "node/10979711482",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10979711483",
      "ref": "node/10979711483",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2290751213",
      "ref": "node/2290751213",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2583735795",
      "ref": "node/2583735795",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3200850690",
      "ref": "node/3200850690",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11851487781",
      "ref": "node/11851487781",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11851487786",
      "ref": "node/11851487786",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2583578199",
      "ref": "node/2583578199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295617749",
      "ref": "node/4295617749",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295617750",
      "ref": "node/4295617750",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295617752",
      "ref": "node/4295617752",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295617754",
      "ref": "node/4295617754",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295617756",
      "ref": "node/4295617756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295640760",
      "ref": "node/4295640760",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295640761",
      "ref": "node/4295640761",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4295640762",
      "ref": "node/4295640762",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-17207577",
      "ref": "relation/17207577",
      "kind": "water"
    },
    {
      "id": "water-relation-5431657",
      "ref": "relation/5431657",
      "kind": "water"
    },
    {
      "id": "water-relation-5431659",
      "ref": "relation/5431659",
      "kind": "water"
    },
    {
      "id": "water-relation-5431735",
      "ref": "relation/5431735",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
