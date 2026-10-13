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
  "name": "Damascus",
  "box": [
    33.33218861006602,
    36.09364451013709,
    33.69395038993398,
    36.526361020459994
  ],
  "core": [
    33.46784927751651,
    36.25568211799431,
    33.558289722483494,
    36.36348068200569
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/28843859",
      "line": "Hejaz Railway Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1426370724",
      "line": "Bawabet Demashq, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/842850104",
      "line": "Higher Institute for Applied Sciences and Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/18482507",
      "line": "مستشفى المزة العسكري, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/30419151",
      "line": "Umayyads Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1194503849",
      "line": "Damasquino Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/1830080283",
      "line": "Nabi Habeel Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/708301579",
      "line": "Abbassiyeen Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/842962557",
      "line": "Ministry of education, a mapped place for the game."
    },
    {
      "key": "osm-relation-4614118",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/4614118",
      "line": "Damascus University, a mapped place for the game."
    },
    {
      "key": "osm-way-1121497973",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1121497973",
      "line": "Al-Muhafaza Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-354573941",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/354573941",
      "line": "Bab Kisan, a mapped place for the game."
    },
    {
      "key": "osm-node-12989783743",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12989783743",
      "line": "Sayyidah Zaynab Shrine, a mapped place for the game."
    },
    {
      "key": "osm-way-351273248",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/351273248",
      "line": "Tishreen Military Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-1120153082",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1120153082",
      "line": "Tomb of the Unknown Soldier, a mapped place for the game."
    },
    {
      "key": "osm-node-13386461392",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13386461392",
      "line": "Tomb of Mu'awiya I, a mapped place for the game."
    },
    {
      "key": "osm-way-1486782802",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1486782802",
      "line": "Sayyidah Ruqayya Shrine, a mapped place for the game."
    },
    {
      "key": "osm-node-1246877089",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/1246877089",
      "line": "Higher Institute of Dramatic Art, a mapped place for the game."
    },
    {
      "key": "osm-relation-16920636",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/16920636",
      "line": "Al Jala' Sports Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-106775196",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/106775196",
      "line": "Ibn Nafees Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-5057870",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/5057870",
      "line": "Jasmine Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-166614282",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/166614282",
      "line": "سوق الخجا, a mapped place for the game."
    },
    {
      "key": "osm-way-28869028",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28869028",
      "line": "Sebki Park, a mapped place for the game."
    },
    {
      "key": "osm-node-3245444438",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3245444438",
      "line": "سوق السكرية, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1119950317",
      "ref": "node/1119950317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12506635861",
      "ref": "node/12506635861",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12506635864",
      "ref": "node/12506635864",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5222296937",
      "ref": "node/5222296937",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5442654546",
      "ref": "node/5442654546",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5442654547",
      "ref": "node/5442654547",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
