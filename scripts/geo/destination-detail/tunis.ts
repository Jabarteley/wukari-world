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
  "name": "Tunis",
  "box": [
    36.74,
    10.08,
    36.93,
    10.32
  ],
  "core": [
    36.755,
    10.115,
    36.855,
    10.245
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/29993446",
      "line": "Tunis Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/567484227",
      "line": "Lucullus, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/2613810514",
      "line": "Mediterranean School of Business, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/93674308",
      "line": "Hospital Mongi Slim, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/48720329",
      "line": "Belvedere Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/34392127",
      "line": "Tunis City, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/95132593",
      "line": "Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/95130064",
      "line": "Tunis City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/93721724",
      "line": "Centre Nationnal de la cartographie et de la Télédétection, a mapped place for the game."
    },
    {
      "key": "osm-way-105588055",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/105588055",
      "line": "INSAT - Institut National des Sciences Appliquées et de Technologies, a mapped place for the game."
    },
    {
      "key": "osm-way-96994557",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/96994557",
      "line": "Stade Ali-Belhouane, a mapped place for the game."
    },
    {
      "key": "osm-way-179953386",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/179953386",
      "line": "Musée de la Mémoire Nationale, a mapped place for the game."
    },
    {
      "key": "osm-node-483108304",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/483108304",
      "line": "IPEIEM Institut Prépartoire des études d'ingénieur El Manar, a mapped place for the game."
    },
    {
      "key": "osm-relation-2401476",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/2401476",
      "line": "Bardo National Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-7713167960",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/7713167960",
      "line": "Université libre de Tunis, a mapped place for the game."
    },
    {
      "key": "osm-way-95134307",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/95134307",
      "line": "Grand Synagogue of Tunis, a mapped place for the game."
    },
    {
      "key": "osm-relation-5405848",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/5405848",
      "line": "Stade El Menzah, a mapped place for the game."
    },
    {
      "key": "osm-way-95199308",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/95199308",
      "line": "Hôpital Militaire Principal d'Instruction de Tunis, a mapped place for the game."
    },
    {
      "key": "osm-relation-1431423",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/1431423",
      "line": "Ministère du Tourisme, a mapped place for the game."
    },
    {
      "key": "osm-way-104343343",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/104343343",
      "line": "Place Pasteur, a mapped place for the game."
    },
    {
      "key": "osm-way-180268053",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/180268053",
      "line": "Institut Salah-Azaïz, a mapped place for the game."
    },
    {
      "key": "osm-node-5669470129",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5669470129",
      "line": "Mosquée khelloua de Sidi Mahrez, a mapped place for the game."
    },
    {
      "key": "osm-way-34573429",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/34573429",
      "line": "Stade Chedli Zouiten, a mapped place for the game."
    },
    {
      "key": "osm-way-109431591",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/109431591",
      "line": "Place de Barcelone, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1136725463",
      "ref": "node/1136725463",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1187255756",
      "ref": "node/1187255756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1217741814",
      "ref": "node/1217741814",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1256202705",
      "ref": "node/1256202705",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1256204446",
      "ref": "node/1256204446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1260351290",
      "ref": "node/1260351290",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1261495436",
      "ref": "node/1261495436",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10044670149",
      "ref": "node/10044670149",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1080390577",
      "ref": "node/1080390577",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1099411041",
      "ref": "node/1099411041",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1114749818",
      "ref": "node/1114749818",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1115570559",
      "ref": "node/1115570559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1121427516",
      "ref": "node/1121427516",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1121428168",
      "ref": "node/1121428168",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1123316513",
      "ref": "node/1123316513",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1123401313",
      "ref": "node/1123401313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1136725758",
      "ref": "node/1136725758",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1136727088",
      "ref": "node/1136727088",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-8031768",
      "ref": "relation/8031768",
      "kind": "water"
    },
    {
      "id": "water-way-93265507",
      "ref": "way/93265507",
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
