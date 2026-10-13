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
  "name": "Douglas",
  "box": [
    53.96889311006602,
    -4.786014240612886,
    54.33065488993398,
    -4.1697899593871135
  ],
  "core": [
    54.10455377751651,
    -4.554677088226814,
    54.194994222483494,
    -4.401127111773185
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/8307374531",
      "line": "Snaefell Summit, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/79143392",
      "line": "Isola, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/414899649",
      "line": "George Herdman Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/765929809",
      "line": "Noble's Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28714989",
      "line": "Poulsom Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/58706857",
      "line": "The Market Hall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/147183435",
      "line": "Saint German's Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/79143118",
      "line": "Douglas Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/136360207",
      "line": "Government House, a mapped place for the game."
    },
    {
      "key": "osm-way-59384695",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/59384695",
      "line": "The Nunnery, a mapped place for the game."
    },
    {
      "key": "osm-node-283522771",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/283522771",
      "line": "Niarbyl, a mapped place for the game."
    },
    {
      "key": "osm-node-283486904",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/283486904",
      "line": "Dub Cottage, a mapped place for the game."
    },
    {
      "key": "osm-node-1697727831",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1697727831",
      "line": "Waterworks, a mapped place for the game."
    },
    {
      "key": "osm-node-458533125",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/458533125",
      "line": "Greeba Bridge, a mapped place for the game."
    },
    {
      "key": "osm-way-160506184",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/160506184",
      "line": "Saint Adamnan's Church, a mapped place for the game."
    },
    {
      "key": "osm-way-217382559",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/217382559",
      "line": "Old St Runius, a mapped place for the game."
    },
    {
      "key": "osm-node-300040027",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/300040027",
      "line": "Bradda Hill, a mapped place for the game."
    },
    {
      "key": "osm-way-77964053",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/77964053",
      "line": "University College Isle of Man, a mapped place for the game."
    },
    {
      "key": "osm-way-414637480",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/414637480",
      "line": "Costa, a mapped place for the game."
    },
    {
      "key": "osm-way-79396808",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/79396808",
      "line": "Cosy Nook Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-5063392621",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5063392621",
      "line": "Kerroobeg, a mapped place for the game."
    },
    {
      "key": "osm-node-283492465",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/283492465",
      "line": "Sulby Claddagh, a mapped place for the game."
    },
    {
      "key": "osm-way-1017175209",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1017175209",
      "line": "Dwight's Park, a mapped place for the game."
    },
    {
      "key": "osm-way-71521258",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/71521258",
      "line": "Laxey Woollen Mills, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10821679054",
      "ref": "node/10821679054",
      "kind": "neighbourhood"
    },
    {
      "id": "district-532815042",
      "ref": "node/532815042",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11193059835",
      "ref": "node/11193059835",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1773962838",
      "ref": "node/1773962838",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1773962839",
      "ref": "node/1773962839",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1773962837",
      "ref": "node/1773962837",
      "kind": "neighbourhood"
    },
    {
      "id": "district-410291638",
      "ref": "node/410291638",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6948694189",
      "ref": "node/6948694189",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1287831031",
      "ref": "node/1287831031",
      "kind": "neighbourhood"
    },
    {
      "id": "district-967364100",
      "ref": "node/967364100",
      "kind": "neighbourhood"
    },
    {
      "id": "district-283504450",
      "ref": "node/283504450",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6948740313",
      "ref": "node/6948740313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-283504480",
      "ref": "node/283504480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-475393292",
      "ref": "node/475393292",
      "kind": "neighbourhood"
    },
    {
      "id": "district-283479392",
      "ref": "node/283479392",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1287831033",
      "ref": "node/1287831033",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1287831044",
      "ref": "node/1287831044",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1287831029",
      "ref": "node/1287831029",
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
