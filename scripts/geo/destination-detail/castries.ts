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
  "name": "Castries",
  "box": [
    13.724155955503301,
    -61.17555287753564,
    14.19047748993398,
    -60.80491892246437
  ],
  "core": [
    13.964376377516505,
    -61.03653755302984,
    14.054816822483495,
    -60.943934246970166
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1402576576",
      "line": "Castries Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1224753145",
      "line": "Hummingbird Beach Resort, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/5204803061",
      "line": "Spartan Health Science University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/527244013",
      "line": "Victoria Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/114732971",
      "line": "Derek Walcott Square, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4026130545",
      "line": "Rising Sun, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/255580407",
      "line": "Minor Basilica of the Immaculate Conception, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/396114466",
      "line": "Local Village Council Office; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/115572297",
      "line": "Government House, a mapped place for the game."
    },
    {
      "key": "osm-way-434000880",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/434000880",
      "line": "American International Medical University, a mapped place for the game."
    },
    {
      "key": "osm-node-10649346505",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/10649346505",
      "line": "Rainforest Adventures, a mapped place for the game."
    },
    {
      "key": "osm-node-10017170962",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10017170962",
      "line": "Oldest Baobab Tree, a mapped place for the game."
    },
    {
      "key": "osm-way-399244147",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/399244147",
      "line": "Choiseul Fish Market, a mapped place for the game."
    },
    {
      "key": "osm-way-257640501",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/257640501",
      "line": "Sulphur Springs, a mapped place for the game."
    },
    {
      "key": "osm-node-6322922716",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6322922716",
      "line": "Barre de L'Isle rainforest trail, a mapped place for the game."
    },
    {
      "key": "osm-way-576357922",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/576357922",
      "line": "Daren Sammy Cricket Ground, a mapped place for the game."
    },
    {
      "key": "osm-way-396954377",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/396954377",
      "line": "Owen King EU Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-353009951",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/353009951",
      "line": "Village Inn, a mapped place for the game."
    },
    {
      "key": "osm-way-353723748",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/353723748",
      "line": "Savannes Bay, a mapped place for the game."
    },
    {
      "key": "osm-way-1479934483",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1479934483",
      "line": "Canaries Village Square, a mapped place for the game."
    },
    {
      "key": "osm-node-4027985616",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4027985616",
      "line": "Morne Le Blanc Heritage Site, a mapped place for the game."
    },
    {
      "key": "osm-way-1430525424",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1430525424",
      "line": "Grand Rivere Playing Field, a mapped place for the game."
    },
    {
      "key": "osm-node-5221676738",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5221676738",
      "line": "Grande Riviere Secondary School, a mapped place for the game."
    },
    {
      "key": "osm-node-7084016329",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7084016329",
      "line": "St Lucia's farmer market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3994571552",
      "ref": "node/3994571552",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6335112806",
      "ref": "node/6335112806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6335686578",
      "ref": "node/6335686578",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6335686580",
      "ref": "node/6335686580",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6335686581",
      "ref": "node/6335686581",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6335686582",
      "ref": "node/6335686582",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6335688486",
      "ref": "node/6335688486",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337494396",
      "ref": "node/6337494396",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337504805",
      "ref": "node/6337504805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337615761",
      "ref": "node/6337615761",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628991",
      "ref": "node/6337628991",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628992",
      "ref": "node/6337628992",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628993",
      "ref": "node/6337628993",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628994",
      "ref": "node/6337628994",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628995",
      "ref": "node/6337628995",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628997",
      "ref": "node/6337628997",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337628999",
      "ref": "node/6337628999",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6337629000",
      "ref": "node/6337629000",
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
