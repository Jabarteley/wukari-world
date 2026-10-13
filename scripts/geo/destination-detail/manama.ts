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
  "name": "Manama",
  "box": [
    26.042623210066022,
    50.381655565634965,
    26.404384989933977,
    50.78283163436503
  ],
  "core": [
    26.178283877516506,
    50.5321553334633,
    26.268724322483493,
    50.632331866536695
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/794031791",
      "line": "Manama Bus Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2276730546",
      "line": "Light House Cafe, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/6026618",
      "line": "University of Bahrain and Bahrain Polytechnic, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/350373165",
      "line": "International Hospital of Bahrain, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/489098808",
      "line": "Askar Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/485941188",
      "line": "Juffair Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1011051487",
      "line": "The Cathedral of Our Lady of Arabia, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/485963597",
      "line": "Northern Area Municipality; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/487845013",
      "line": "Ministry of Interior, a mapped place for the game."
    },
    {
      "key": "osm-way-488543824",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/488543824",
      "line": "Applied Science University, a mapped place for the game."
    },
    {
      "key": "osm-way-665595615",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665595615",
      "line": "Al Muharraq Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1536562298",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1536562298",
      "line": "Dilmun Burial Mounds (Hamad Town Roundabout 1), a mapped place for the game."
    },
    {
      "key": "osm-way-174275928",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/174275928",
      "line": "Rifa Fort, a mapped place for the game."
    },
    {
      "key": "osm-way-174275472",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/174275472",
      "line": "Barbar Temple, a mapped place for the game."
    },
    {
      "key": "osm-node-3885140913",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3885140913",
      "line": "Khamis Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-61402688",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/61402688",
      "line": "Seef Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-175197568",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/175197568",
      "line": "City Centre Bahrain, a mapped place for the game."
    },
    {
      "key": "osm-way-28655847",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/28655847",
      "line": "Bahrain National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-673312758",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/673312758",
      "line": "Khalifa Sports City Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-29253447",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/29253447",
      "line": "Al Fateh Grand Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-811103543",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/811103543",
      "line": "College of Health and Sports Sciences, a mapped place for the game."
    },
    {
      "key": "osm-way-344196655",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/344196655",
      "line": "Royal College of Surgeons' Ireland, a mapped place for the game."
    },
    {
      "key": "osm-relation-7188720",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/7188720",
      "line": "American Mission Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-991874984",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/991874984",
      "line": "Bahrain Specialist Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-13001990625",
      "ref": "node/13001990625",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1305608711",
      "ref": "node/1305608711",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1305608753",
      "ref": "node/1305608753",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2133495532",
      "ref": "node/2133495532",
      "kind": "neighbourhood"
    },
    {
      "id": "district-314911413",
      "ref": "node/314911413",
      "kind": "neighbourhood"
    },
    {
      "id": "district-315856317",
      "ref": "node/315856317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-793129863",
      "ref": "node/793129863",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1140583856",
      "ref": "node/1140583856",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1149610892",
      "ref": "node/1149610892",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1170689136",
      "ref": "node/1170689136",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1172944773",
      "ref": "node/1172944773",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12990547612",
      "ref": "node/12990547612",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12996523161",
      "ref": "node/12996523161",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12997580377",
      "ref": "node/12997580377",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12997703297",
      "ref": "node/12997703297",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12997703298",
      "ref": "node/12997703298",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12997774509",
      "ref": "node/12997774509",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13002316027",
      "ref": "node/13002316027",
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
