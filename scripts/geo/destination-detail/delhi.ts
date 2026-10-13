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
  "name": "Delhi",
  "box": [
    28.485572610066022,
    77.01186277269433,
    28.847334389933977,
    77.42209342730568
  ],
  "core": [
    28.621233277516506,
    77.16576591633135,
    28.711673722483493,
    77.26819028366866
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/249823635",
      "line": "Ramesh Nagar, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2106101596",
      "line": "Karim's, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/16034563",
      "line": "Netaji Subhas University of Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/915724540",
      "line": "Kailash Hospital & Heart Institute, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/89583607",
      "line": "Mehrauli Archaeological Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24618045",
      "line": "Metro Walk Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/44827278",
      "line": "Lotus Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/12912051724",
      "line": "Bawana Chowk; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1443349199",
      "line": "Sashastra Seema Bal, a mapped place for the game."
    },
    {
      "key": "osm-way-1162586312",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1162586312",
      "line": "Swami Shraddhanand College, a mapped place for the game."
    },
    {
      "key": "osm-way-611735160",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/611735160",
      "line": "Chhatrasal Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-749743849",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/749743849",
      "line": "Malcha Mahal, a mapped place for the game."
    },
    {
      "key": "osm-node-13293400515",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13293400515",
      "line": "P. F. Chang's, a mapped place for the game."
    },
    {
      "key": "osm-way-400921719",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/400921719",
      "line": "Akshardham, a mapped place for the game."
    },
    {
      "key": "osm-way-467108001",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/467108001",
      "line": "Maharaja Surajmal College, a mapped place for the game."
    },
    {
      "key": "osm-node-10823999060",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10823999060",
      "line": "Lodhi Art District, a mapped place for the game."
    },
    {
      "key": "osm-way-189447678",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/189447678",
      "line": "Bharat Vandana Park, a mapped place for the game."
    },
    {
      "key": "osm-way-102758345",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/102758345",
      "line": "Ghiyas-ud-Din Tughlaq's Tomb, a mapped place for the game."
    },
    {
      "key": "osm-way-1326248225",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1326248225",
      "line": "Army College Of Medical Sciences, a mapped place for the game."
    },
    {
      "key": "osm-node-6465991440",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/6465991440",
      "line": "Paschim Vihar West, a mapped place for the game."
    },
    {
      "key": "osm-way-80936826",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/80936826",
      "line": "Ajmal Khan Park, a mapped place for the game."
    },
    {
      "key": "osm-way-154708937",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/154708937",
      "line": "Jagannath Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-816798914",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/816798914",
      "line": "Delhi State Cancer Institute, a mapped place for the game."
    },
    {
      "key": "osm-way-111698030",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/111698030",
      "line": "Indira Gandhi Arena, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10810949337",
      "ref": "node/10810949337",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10811272468",
      "ref": "node/10811272468",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10811811034",
      "ref": "node/10811811034",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10812136394",
      "ref": "node/10812136394",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10812202316",
      "ref": "node/10812202316",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10812202318",
      "ref": "node/10812202318",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131003",
      "ref": "node/10815131003",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131004",
      "ref": "node/10815131004",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131298",
      "ref": "node/10815131298",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131300",
      "ref": "node/10815131300",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131301",
      "ref": "node/10815131301",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131303",
      "ref": "node/10815131303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815131304",
      "ref": "node/10815131304",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815144105",
      "ref": "node/10815144105",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815144106",
      "ref": "node/10815144106",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815209842",
      "ref": "node/10815209842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815230046",
      "ref": "node/10815230046",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10815246199",
      "ref": "node/10815246199",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-162113",
      "ref": "relation/162113",
      "kind": "water"
    },
    {
      "id": "water-relation-162295",
      "ref": "relation/162295",
      "kind": "water"
    },
    {
      "id": "water-relation-6721842",
      "ref": "relation/6721842",
      "kind": "water"
    },
    {
      "id": "water-relation-9058948",
      "ref": "relation/9058948",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
