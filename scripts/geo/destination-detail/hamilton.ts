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
  "name": "Hamilton",
  "box": [
    32.11338701006602,
    -64.99828141790888,
    32.47514878993398,
    -64.5723519820911
  ],
  "core": [
    32.24904767751651,
    -64.83847791652605,
    32.339488122483495,
    -64.73215548347395
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/242151179",
      "line": "St. George's Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1351784192",
      "line": "The New Traditions Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/912385468",
      "line": "Bermuda College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/911970741",
      "line": "Mid-Atlantic Wellness Institute, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/75243034",
      "line": "Victoria Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1364424421",
      "line": "Clocktower Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/424119495",
      "line": "St. Anthony's Catholic Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/181329188",
      "line": "Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/182591934",
      "line": "Bermuda Civil Aviation Authority, a mapped place for the game."
    },
    {
      "key": "osm-way-919300910",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/919300910",
      "line": "Bermuda Institute of Ocean Sciences, a mapped place for the game."
    },
    {
      "key": "osm-node-12249214673",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/12249214673",
      "line": "Queen's View, a mapped place for the game."
    },
    {
      "key": "osm-way-181381778",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/181381778",
      "line": "St. David's Battery, a mapped place for the game."
    },
    {
      "key": "osm-way-834197246",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/834197246",
      "line": "Masterworks Museum of Bermuda Art, a mapped place for the game."
    },
    {
      "key": "osm-way-181381774",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/181381774",
      "line": "Fort St. Catherine, a mapped place for the game."
    },
    {
      "key": "osm-way-834369428",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/834369428",
      "line": "Old Devonshire Church, a mapped place for the game."
    },
    {
      "key": "osm-way-717069727",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/717069727",
      "line": "St. John’s Anglican Church, a mapped place for the game."
    },
    {
      "key": "osm-way-834354832",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/834354832",
      "line": "Bermuda Botanical Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-175194099",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/175194099",
      "line": "Shelly Bay Park, a mapped place for the game."
    },
    {
      "key": "osm-way-183907775",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/183907775",
      "line": "Somerset Country Squire, a mapped place for the game."
    },
    {
      "key": "osm-node-7289544262",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7289544262",
      "line": "Sul Verde, a mapped place for the game."
    },
    {
      "key": "osm-node-5519434022",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5519434022",
      "line": "Horseshoe Bay, a mapped place for the game."
    },
    {
      "key": "osm-way-1150163054",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1150163054",
      "line": "Flora Duffy South Field Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-326975395",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/326975395",
      "line": "King Edward VII Memorial Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-1198079103",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1198079103",
      "line": "Washington Mall, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11999364514",
      "ref": "node/11999364514",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11999364515",
      "ref": "node/11999364515",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11999364512",
      "ref": "node/11999364512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-388776959",
      "ref": "node/388776959",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11999364513",
      "ref": "node/11999364513",
      "kind": "neighbourhood"
    },
    {
      "id": "district-316781764",
      "ref": "node/316781764",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11999364516",
      "ref": "node/11999364516",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8461920155",
      "ref": "node/8461920155",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11999364517",
      "ref": "node/11999364517",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11143170821",
      "ref": "node/11143170821",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8112281778",
      "ref": "node/8112281778",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8579790660",
      "ref": "node/8579790660",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8111475217",
      "ref": "node/8111475217",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8111475219",
      "ref": "node/8111475219",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8568136640",
      "ref": "node/8568136640",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1937417677",
      "ref": "node/1937417677",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1937418092",
      "ref": "node/1937418092",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8537056000",
      "ref": "node/8537056000",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15517621",
      "ref": "relation/15517621",
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
