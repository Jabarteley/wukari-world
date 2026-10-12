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
  "name": "Chișinău",
  "box": [
    46.84363081006602,
    28.56783899526906,
    47.20539258993398,
    29.096745604730938
  ],
  "core": [
    46.979291477516504,
    28.766347435780926,
    47.06973192248349,
    28.898237164219072
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/415964911",
      "line": "Chisinau, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/502443860",
      "line": "Praga, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/96545864",
      "line": "Universitatea Pedagogică de Stat „Ion Creangă”, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/12863292",
      "line": "Timofei Moşneaga Republican Clinical Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/12339249",
      "line": "Botanical Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/25195025",
      "line": "Central Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/32766730",
      "line": "Capela în memoria voluntarilor bulgari, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/9818520",
      "line": "Marea Adunare Națională Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/8299511",
      "line": "Ministry of Health, a mapped place for the game."
    },
    {
      "key": "osm-way-115891944",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/115891944",
      "line": "Academia de Poliție „Ștefan cel Mare“, a mapped place for the game."
    },
    {
      "key": "osm-way-32890479",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/32890479",
      "line": "Dinamo Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1457886531",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1457886531",
      "line": "Monument in memory of those killed in between 1941-1945, a mapped place for the game."
    },
    {
      "key": "osm-relation-8257226",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/8257226",
      "line": "Technical University of Moldova, a mapped place for the game."
    },
    {
      "key": "osm-relation-13320660",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/13320660",
      "line": "Grădina Zoologică din Chișinău, a mapped place for the game."
    },
    {
      "key": "osm-relation-13721147",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/13721147",
      "line": "Rose Valley Park, a mapped place for the game."
    },
    {
      "key": "osm-relation-9892239",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/9892239",
      "line": "Valea Morilor Park, a mapped place for the game."
    },
    {
      "key": "osm-way-145671580",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/145671580",
      "line": "Biserica „Acoperământul Maicii Domnului”, a mapped place for the game."
    },
    {
      "key": "osm-node-855102025",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/855102025",
      "line": "Monument to Nizami Ganjavi, a mapped place for the game."
    },
    {
      "key": "osm-way-166980133",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/166980133",
      "line": "Biserica Buna Vestire, a mapped place for the game."
    },
    {
      "key": "osm-way-1546886425",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1546886425",
      "line": "Stadionul „Rapid Ghidighici”, a mapped place for the game."
    },
    {
      "key": "osm-way-26426519",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/26426519",
      "line": "Moldova State University, a mapped place for the game."
    },
    {
      "key": "osm-way-38690601",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/38690601",
      "line": "Institute of Emergency Medicine, a mapped place for the game."
    },
    {
      "key": "osm-relation-6675955",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/6675955",
      "line": "Zimbru Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-662713481",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/662713481",
      "line": "Coffe Ponty, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-262054818",
      "ref": "node/262054818",
      "kind": "neighbourhood"
    },
    {
      "id": "district-262054852",
      "ref": "node/262054852",
      "kind": "neighbourhood"
    },
    {
      "id": "district-269421400",
      "ref": "node/269421400",
      "kind": "neighbourhood"
    },
    {
      "id": "district-380507700",
      "ref": "node/380507700",
      "kind": "neighbourhood"
    },
    {
      "id": "district-380507703",
      "ref": "node/380507703",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6205647867",
      "ref": "node/6205647867",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6206810147",
      "ref": "node/6206810147",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6206827646",
      "ref": "node/6206827646",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6206853606",
      "ref": "node/6206853606",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6208047430",
      "ref": "node/6208047430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6209287160",
      "ref": "node/6209287160",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6212888335",
      "ref": "node/6212888335",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6214806958",
      "ref": "node/6214806958",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6217073819",
      "ref": "node/6217073819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6219386019",
      "ref": "node/6219386019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10009145239",
      "ref": "node/10009145239",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10009145240",
      "ref": "node/10009145240",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10838945467",
      "ref": "node/10838945467",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-19560276",
      "ref": "relation/19560276",
      "kind": "water"
    },
    {
      "id": "water-relation-9791581",
      "ref": "relation/9791581",
      "kind": "water"
    },
    {
      "id": "water-way-109231161",
      "ref": "way/109231161",
      "kind": "water"
    },
    {
      "id": "water-way-25120184",
      "ref": "way/25120184",
      "kind": "water"
    },
    {
      "id": "water-way-29309810",
      "ref": "way/29309810",
      "kind": "water"
    },
    {
      "id": "water-way-29309867",
      "ref": "way/29309867",
      "kind": "water"
    },
    {
      "id": "water-way-30240612",
      "ref": "way/30240612",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
