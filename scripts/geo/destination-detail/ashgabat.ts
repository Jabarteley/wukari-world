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
  "name": "Ashgabat",
  "box": [
    37.75958391006602,
    58.15397565716856,
    38.12134568993398,
    58.610721742831444
  ],
  "core": [
    37.89524457751651,
    58.32536115994601,
    37.985685022483494,
    58.43933624005399
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/8895975404",
      "line": "Ashgabat, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3755708929",
      "line": "Cafeteria, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/411012480",
      "line": "Turkmen State Medical University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/409094362",
      "line": "International Trauma Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/250279606",
      "line": "Inspiration Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/2045883",
      "line": "Altyn Asyr Oriental Bazaar, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/193666465",
      "line": "Turkmenbashy Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1322912935",
      "line": "Atatürk Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4149135937",
      "line": "Turkmenistan National Olympic Committee, a mapped place for the game."
    },
    {
      "key": "osm-way-241580572",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/241580572",
      "line": "Yagshygeldi Kakayev International University of Oil and Gas, a mapped place for the game."
    },
    {
      "key": "osm-way-257735045",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/257735045",
      "line": "Main Indoor Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-257738467",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/257738467",
      "line": "Turkmenistan Tower, a mapped place for the game."
    },
    {
      "key": "osm-relation-21265088",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/21265088",
      "line": "White Wheat Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-3680900775",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3680900775",
      "line": "Jeytun, a mapped place for the game."
    },
    {
      "key": "osm-way-440202473",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/440202473",
      "line": "Oguzhan Turkmen Engineering Technologies University, a mapped place for the game."
    },
    {
      "key": "osm-way-1550858457",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1550858457",
      "line": "Academy of Government Service, a mapped place for the game."
    },
    {
      "key": "osm-relation-14346390",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/14346390",
      "line": "Köpetdag Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-366761908",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/366761908",
      "line": "Church of St. Alexander Nevsky, a mapped place for the game."
    },
    {
      "key": "osm-way-207329467",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/207329467",
      "line": "Central Botanical Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-147533322",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/147533322",
      "line": "Ashgabat Olympic Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-326724432",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/326724432",
      "line": "Berkarar Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-34063268",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/34063268",
      "line": "First (Pervyy) Park, a mapped place for the game."
    },
    {
      "key": "osm-way-28191839",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/28191839",
      "line": "Gulistan (Russian) Bazaar, a mapped place for the game."
    },
    {
      "key": "osm-relation-19307489",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/19307489",
      "line": "Hazret Omar Mosque, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1188585519",
      "ref": "node/1188585519",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1188585527",
      "ref": "node/1188585527",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1188585530",
      "ref": "node/1188585530",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1188585531",
      "ref": "node/1188585531",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1188585540",
      "ref": "node/1188585540",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1188750251",
      "ref": "node/1188750251",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623597",
      "ref": "node/11998623597",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623635",
      "ref": "node/11998623635",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623654",
      "ref": "node/11998623654",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623689",
      "ref": "node/11998623689",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623734",
      "ref": "node/11998623734",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623762",
      "ref": "node/11998623762",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623763",
      "ref": "node/11998623763",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623819",
      "ref": "node/11998623819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623858",
      "ref": "node/11998623858",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623859",
      "ref": "node/11998623859",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623915",
      "ref": "node/11998623915",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11998623979",
      "ref": "node/11998623979",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11188236",
      "ref": "relation/11188236",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
