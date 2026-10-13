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
  "name": "Lahore",
  "box": [
    31.384801310066024,
    74.10291095737459,
    31.74656308993398,
    74.52545484262542
  ],
  "core": [
    31.520461977516508,
    74.26144203162171,
    31.610902422483495,
    74.3669237683783
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2406886912",
      "line": "Jallo Manhala, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/272344518",
      "line": "Services Club, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/726040761",
      "line": "University College Lahore, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/151735321",
      "line": "Lahore General Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/291782544",
      "line": "Hazuri Bagh, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5265759531",
      "line": "Anarkali Bazar, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/621947796",
      "line": "Shrine of Mian Mir, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/4907505343",
      "line": "Gulshan Marriage Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1530891047",
      "line": "Pakistan Cricket Board, a mapped place for the game."
    },
    {
      "key": "osm-way-772249714",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/772249714",
      "line": "The Millennium Universal College, a mapped place for the game."
    },
    {
      "key": "osm-way-27736338",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/27736338",
      "line": "Punjab Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-7116277007",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7116277007",
      "line": "Shalimar Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-855746276",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/855746276",
      "line": "University of Engineering and Technology, New Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-70017485",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/70017485",
      "line": "Lahore University of Management Sciences, a mapped place for the game."
    },
    {
      "key": "osm-node-674141730",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/674141730",
      "line": "Social Security Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-291684963",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/291684963",
      "line": "Gulshan-e-Iqbal Park, a mapped place for the game."
    },
    {
      "key": "osm-node-1374726049",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/1374726049",
      "line": "Model Town Central Park, a mapped place for the game."
    },
    {
      "key": "osm-way-611956194",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/611956194",
      "line": "Bibi Pak Daman, a mapped place for the game."
    },
    {
      "key": "osm-node-3228646369",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3228646369",
      "line": "Fauji Foundation Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-9922988888",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9922988888",
      "line": "S-60, a mapped place for the game."
    },
    {
      "key": "osm-node-8955079625",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8955079625",
      "line": "Krishna Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-778472693",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/778472693",
      "line": "Packages Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-291807527",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/291807527",
      "line": "Shuhada, a mapped place for the game."
    },
    {
      "key": "osm-way-172700972",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/172700972",
      "line": "National Hockey Stadium, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-110862294",
      "ref": "node/110862294",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2948760205",
      "ref": "node/2948760205",
      "kind": "neighbourhood"
    },
    {
      "id": "district-304964881",
      "ref": "node/304964881",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10681199546",
      "ref": "node/10681199546",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11619833783",
      "ref": "node/11619833783",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11620211633",
      "ref": "node/11620211633",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11620234731",
      "ref": "node/11620234731",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11620239365",
      "ref": "node/11620239365",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11620239367",
      "ref": "node/11620239367",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11621433836",
      "ref": "node/11621433836",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11621601892",
      "ref": "node/11621601892",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12219898610",
      "ref": "node/12219898610",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12223017123",
      "ref": "node/12223017123",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12223034782",
      "ref": "node/12223034782",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12245167746",
      "ref": "node/12245167746",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12251235987",
      "ref": "node/12251235987",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12251597195",
      "ref": "node/12251597195",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12442468000",
      "ref": "node/12442468000",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-13045685",
      "ref": "relation/13045685",
      "kind": "water"
    },
    {
      "id": "water-relation-13046742",
      "ref": "relation/13046742",
      "kind": "water"
    },
    {
      "id": "water-relation-13046743",
      "ref": "relation/13046743",
      "kind": "water"
    },
    {
      "id": "water-relation-13046752",
      "ref": "relation/13046752",
      "kind": "water"
    },
    {
      "id": "water-relation-13049583",
      "ref": "relation/13049583",
      "kind": "water"
    },
    {
      "id": "water-relation-7088406",
      "ref": "relation/7088406",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
