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
  "name": "Sydney",
  "box": [
    -34.05072478993398,
    150.9914434151979,
    -33.68896301006602,
    151.4251261848021
  ],
  "core": [
    -33.91506412248349,
    151.1541609057886,
    -33.824623677516506,
    151.26240869421142
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/13877592",
      "line": "St Leonards, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1034473941",
      "line": "Doyles on the Beach, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/5634772",
      "line": "Western Sydney University, Parramatta South Campus, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/69548890",
      "line": "Hornsby Ku-ring-gai Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/17499261",
      "line": "Hurstville Oval, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/209941085",
      "line": "Westfield Eastgardens, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/548526874",
      "line": "Newtown Mission, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/104948253",
      "line": "Sydney Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/522791499",
      "line": "Centrelink, a mapped place for the game."
    },
    {
      "key": "osm-way-207693612",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/207693612",
      "line": "Macquarie University, a mapped place for the game."
    },
    {
      "key": "osm-way-666183098",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/666183098",
      "line": "Ocean Protect Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-2052073022",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2052073022",
      "line": "Cemetery Station No. 1, a mapped place for the game."
    },
    {
      "key": "osm-way-1451898197",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1451898197",
      "line": "Oxford Falls Peace Park, a mapped place for the game."
    },
    {
      "key": "osm-way-309039664",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/309039664",
      "line": "Castle Towers, a mapped place for the game."
    },
    {
      "key": "osm-way-130512350",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/130512350",
      "line": "Hazelhurst Gallery, a mapped place for the game."
    },
    {
      "key": "osm-way-19234830",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/19234830",
      "line": "Westfield Burwood, a mapped place for the game."
    },
    {
      "key": "osm-way-1126413889",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1126413889",
      "line": "Lakemba Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-548322850",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/548322850",
      "line": "Al Zahra Mosque, a mapped place for the game."
    },
    {
      "key": "osm-relation-7987675",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/7987675",
      "line": "Boronia House, a mapped place for the game."
    },
    {
      "key": "osm-way-1075245506",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1075245506",
      "line": "Oatley Park, a mapped place for the game."
    },
    {
      "key": "osm-way-610927146",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/610927146",
      "line": "Université de New South Wales, a mapped place for the game."
    },
    {
      "key": "osm-way-5310699",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/5310699",
      "line": "Leichhardt Oval, a mapped place for the game."
    },
    {
      "key": "osm-way-273864558",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/273864558",
      "line": "St George Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-4385854",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/4385854",
      "line": "ENGIE Stadium, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11080091384",
      "ref": "node/11080091384",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117083246",
      "ref": "node/117083246",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117083263",
      "ref": "node/117083263",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117098224",
      "ref": "node/117098224",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117113664",
      "ref": "node/117113664",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117117243",
      "ref": "node/117117243",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117132357",
      "ref": "node/117132357",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117132431",
      "ref": "node/117132431",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117151695",
      "ref": "node/117151695",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117151815",
      "ref": "node/117151815",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117151836",
      "ref": "node/117151836",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117157303",
      "ref": "node/117157303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117164429",
      "ref": "node/117164429",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117178350",
      "ref": "node/117178350",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117178409",
      "ref": "node/117178409",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117178490",
      "ref": "node/117178490",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117178510",
      "ref": "node/117178510",
      "kind": "neighbourhood"
    },
    {
      "id": "district-117198625",
      "ref": "node/117198625",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1249186",
      "ref": "relation/1249186",
      "kind": "water"
    },
    {
      "id": "water-relation-1999944",
      "ref": "relation/1999944",
      "kind": "water"
    },
    {
      "id": "water-relation-2013600",
      "ref": "relation/2013600",
      "kind": "water"
    },
    {
      "id": "water-relation-2023911",
      "ref": "relation/2023911",
      "kind": "water"
    },
    {
      "id": "water-relation-2050737",
      "ref": "relation/2050737",
      "kind": "water"
    },
    {
      "id": "water-relation-2064234",
      "ref": "relation/2064234",
      "kind": "water"
    },
    {
      "id": "water-relation-2248380",
      "ref": "relation/2248380",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
