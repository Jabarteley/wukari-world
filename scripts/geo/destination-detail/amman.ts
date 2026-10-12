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
  "name": "Amman",
  "box": [
    31.713556892403304,
    35.71180163823021,
    32.13245028993398,
    36.13612336176979
  ],
  "core": [
    31.906349177516507,
    35.871000897380746,
    31.996789622483494,
    35.97692410261926
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/798905112",
      "line": "Qasr Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1193976556",
      "line": "Hekayet Nebo Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/179944869",
      "line": "University of Jordan, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/276753162",
      "line": "Arab Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/153915077",
      "line": "Hada'iq al-Malik Hussein, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/263470895",
      "line": "Taj Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/696170482",
      "line": "Great Mosque of Salt, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/651678324",
      "line": "Hashemite Plaza; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/3987031215",
      "line": "Al-Zarqaa Manucipality, a mapped place for the game."
    },
    {
      "key": "osm-way-1532937257",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1532937257",
      "line": "جامعة عمان العربية, a mapped place for the game."
    },
    {
      "key": "osm-way-98868798",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/98868798",
      "line": "Prince Mohammed Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-164106288",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/164106288",
      "line": "Qasr Mshatta, a mapped place for the game."
    },
    {
      "key": "osm-way-695615687",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/695615687",
      "line": "Tell Hesban, a mapped place for the game."
    },
    {
      "key": "osm-way-956954592",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/956954592",
      "line": "Tall al-Umayri, a mapped place for the game."
    },
    {
      "key": "osm-node-1789652385",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1789652385",
      "line": "Masjid Fatima Alzahraa, a mapped place for the game."
    },
    {
      "key": "osm-way-333946090",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/333946090",
      "line": "King Abdullah I Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-200734506",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/200734506",
      "line": "Petra University, a mapped place for the game."
    },
    {
      "key": "osm-way-588418001",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/588418001",
      "line": "German Jordanian University, a mapped place for the game."
    },
    {
      "key": "osm-node-547993845",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/547993845",
      "line": "Mount Nebo, a mapped place for the game."
    },
    {
      "key": "osm-node-6593897285",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6593897285",
      "line": "شارع الستين ٦٠, a mapped place for the game."
    },
    {
      "key": "osm-node-13128408649",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/13128408649",
      "line": "مزرعة اليازوري, a mapped place for the game."
    },
    {
      "key": "osm-node-13391032813",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13391032813",
      "line": "Abood Coffee, a mapped place for the game."
    },
    {
      "key": "osm-node-12395982125",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12395982125",
      "line": "my resaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-4201615774",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4201615774",
      "line": "Baby Cord, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-4064715581",
      "ref": "node/4064715581",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4172845356",
      "ref": "node/4172845356",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4267499255",
      "ref": "node/4267499255",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7542395887",
      "ref": "node/7542395887",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9092799866",
      "ref": "node/9092799866",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9092799869",
      "ref": "node/9092799869",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14094018316",
      "ref": "node/14094018316",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1923515191",
      "ref": "node/1923515191",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3312713071",
      "ref": "node/3312713071",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3315345898",
      "ref": "node/3315345898",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3315345899",
      "ref": "node/3315345899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3315345900",
      "ref": "node/3315345900",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3987014159",
      "ref": "node/3987014159",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3987069937",
      "ref": "node/3987069937",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3988759008",
      "ref": "node/3988759008",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3992495132",
      "ref": "node/3992495132",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4003468941",
      "ref": "node/4003468941",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4003468991",
      "ref": "node/4003468991",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
