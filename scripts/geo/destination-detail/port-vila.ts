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
  "name": "Port Vila",
  "box": [
    -17.92237808993398,
    168.1261911919271,
    -17.560616310066024,
    168.5038414080729
  ],
  "core": [
    -17.786717422483495,
    168.2678460125918,
    -17.696276977516508,
    168.3621865874082
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/6424702385",
      "line": "Local Bus, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5341011539",
      "line": "Le Life Resort, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/3643490182",
      "line": "Vanuatu Institute of Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/307095157",
      "line": "Port Vila Central Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/435756621",
      "line": "prima park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/868937789",
      "line": "Marché de Manples, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/319762684",
      "line": "Cathédrale du Sacré-Cœur, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "node/519912836"
      },
      "ref": "node/519912836",
      "line": "Supreme Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4896949621",
      "line": "Quarantine control, a mapped place for the game."
    },
    {
      "key": "osm-node-6283844727",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6283844727",
      "line": "Lifechanger Christian College, a mapped place for the game."
    },
    {
      "key": "osm-way-164077407",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/164077407",
      "line": "Korman Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-319784751",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/319784751",
      "line": "Chief's Nakamal, a mapped place for the game."
    },
    {
      "key": "osm-way-331209807",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/331209807",
      "line": "Port Vila Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-1208562570",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1208562570",
      "line": "Musée National de Vanuatu, a mapped place for the game."
    },
    {
      "key": "osm-node-5341017574",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5341017574",
      "line": "WW II Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-6366258638",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6366258638",
      "line": "Summit, a mapped place for the game."
    },
    {
      "key": "osm-node-10297629756",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10297629756",
      "line": "Coco De Mer, a mapped place for the game."
    },
    {
      "key": "osm-node-6536259685",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6536259685",
      "line": "Francesca’s Beach Club Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-332907165",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/332907165",
      "line": "PortVila Physio Sport Clinic, a mapped place for the game."
    },
    {
      "key": "osm-way-424853171",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/424853171",
      "line": "Kam Pusum Hed Klinik, a mapped place for the game."
    },
    {
      "key": "osm-way-864040553",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/864040553",
      "line": "belle-vue rodeo park, a mapped place for the game."
    },
    {
      "key": "osm-way-41958385",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/41958385",
      "line": "University of the South Pacific, a mapped place for the game."
    },
    {
      "key": "osm-way-105052376",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/105052376",
      "line": "Port Vila Central Market, a mapped place for the game."
    },
    {
      "key": "osm-way-307398428",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/307398428",
      "line": "Fatumaru Bay Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-6264961948",
      "ref": "node/6264961948",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757197",
      "ref": "node/6275757197",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757198",
      "ref": "node/6275757198",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757199",
      "ref": "node/6275757199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757200",
      "ref": "node/6275757200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757201",
      "ref": "node/6275757201",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757202",
      "ref": "node/6275757202",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757203",
      "ref": "node/6275757203",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757204",
      "ref": "node/6275757204",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757205",
      "ref": "node/6275757205",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757206",
      "ref": "node/6275757206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757207",
      "ref": "node/6275757207",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757208",
      "ref": "node/6275757208",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757209",
      "ref": "node/6275757209",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757210",
      "ref": "node/6275757210",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757211",
      "ref": "node/6275757211",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757212",
      "ref": "node/6275757212",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6275757213",
      "ref": "node/6275757213",
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
