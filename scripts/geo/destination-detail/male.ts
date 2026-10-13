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
  "name": "Malé",
  "box": [
    3.997107010066021,
    73.33055529711906,
    4.358868789933978,
    73.69092210288095
  ],
  "core": [
    4.132767677516505,
    73.46570085131668,
    4.223208122483494,
    73.55577654868333
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3063811852",
      "line": "Heinveru Ferry Terminal (public ferry to other atolls), a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5818314168",
      "line": "Fukuya Teppanyaki, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1317793006",
      "line": "Villa College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/151403710",
      "line": "Indira Gandhi Memorial Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/436805451",
      "line": "Sunset Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/153106623",
      "line": "Marché Local, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1037933653",
      "line": "Bihuroazu Kamanaa Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/6367296535",
      "line": "Secretariat of th Huraa Council Maaleatolhu; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/14081772854",
      "line": "Ministry of Foreign Affairs, a mapped place for the game."
    },
    {
      "key": "osm-node-6294958141",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6294958141",
      "line": "Avid College, a mapped place for the game."
    },
    {
      "key": "osm-way-186667274",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/186667274",
      "line": "National Football Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-306746570",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/306746570",
      "line": "Medhu Ziyaaraiy, a mapped place for the game."
    },
    {
      "key": "osm-way-959150179",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/959150179",
      "line": "King Salman Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-1317929099",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1317929099",
      "line": "ADK Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-151402193",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/151402193",
      "line": "Masjid-al-Sultan Muhammad Thakurufaanu Al Auzam, a mapped place for the game."
    },
    {
      "key": "osm-node-8935561366",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/8935561366",
      "line": "Maldives National University, a mapped place for the game."
    },
    {
      "key": "osm-way-19881993",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/19881993",
      "line": "Vihamanaafushi, a mapped place for the game."
    },
    {
      "key": "osm-node-12109909429",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12109909429",
      "line": "Vista Del Mar, a mapped place for the game."
    },
    {
      "key": "osm-way-116704222",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/116704222",
      "line": "Lime Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-9559425955",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/9559425955",
      "line": "Marina Clinic, a mapped place for the game."
    },
    {
      "key": "osm-node-12849075901",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12849075901",
      "line": "Sharks and rays viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-node-6398078446",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6398078446",
      "line": "Sunset View Point, a mapped place for the game."
    },
    {
      "key": "osm-way-897444516",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/897444516",
      "line": "Redbull Park, a mapped place for the game."
    },
    {
      "key": "osm-way-437135029",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/437135029",
      "line": "Tree Tower Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-14391899",
      "ref": "relation/14391899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-302137566",
      "ref": "way/302137566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882009",
      "ref": "way/19882009",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6615241",
      "ref": "relation/6615241",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882189",
      "ref": "way/19882189",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19881993",
      "ref": "way/19881993",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6615242",
      "ref": "relation/6615242",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882113",
      "ref": "way/19882113",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19881978",
      "ref": "way/19881978",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19881944",
      "ref": "way/19881944",
      "kind": "neighbourhood"
    },
    {
      "id": "district-602730308",
      "ref": "way/602730308",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882143",
      "ref": "way/19882143",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882024",
      "ref": "way/19882024",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882115",
      "ref": "way/19882115",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882199",
      "ref": "way/19882199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-234993294",
      "ref": "way/234993294",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3990127",
      "ref": "way/3990127",
      "kind": "neighbourhood"
    },
    {
      "id": "district-19882148",
      "ref": "way/19882148",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [],
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
