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
  "name": "Khartoum",
  "box": [
    15.382716310066021,
    32.34824662889724,
    15.74447808993398,
    32.72157797110276
  ],
  "core": [
    15.518376977516505,
    32.48827688160687,
    15.608817422483495,
    32.58154771839313
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/35462161",
      "line": "صينية القندول, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2142312829",
      "line": "كفتريا حاتيكم, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/294267503",
      "line": "International University of Africa, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/7726686414",
      "line": "AL-Huda Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1559424933",
      "line": "Children Area, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5786075353",
      "line": "سوق سته, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/5243098751",
      "line": "مسجد ابو نخيلة, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8280144066",
      "line": "ميدان قلب الاسد; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/344160930",
      "line": "Ministry of Energy and Oil, a mapped place for the game."
    },
    {
      "key": "osm-way-309577358",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/309577358",
      "line": "University of Khartoum, a mapped place for the game."
    },
    {
      "key": "osm-way-5775815",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/5775815",
      "line": "Al Merrikh Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-303334100",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/303334100",
      "line": "National Museum of Sudan, a mapped place for the game."
    },
    {
      "key": "osm-way-5772972",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/5772972",
      "line": "Al-Hilal Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1007170590",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1007170590",
      "line": "Ahfad University for Women, a mapped place for the game."
    },
    {
      "key": "osm-node-7095798160",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/7095798160",
      "line": "كلية الشرطة والقانون, a mapped place for the game."
    },
    {
      "key": "osm-way-1450938789",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1450938789",
      "line": "Local Market, a mapped place for the game."
    },
    {
      "key": "osm-way-108830728",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/108830728",
      "line": "Usine pharmaceutique Al Shifa, a mapped place for the game."
    },
    {
      "key": "osm-node-6207175685",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6207175685",
      "line": "أراضي القماراب صالحة, a mapped place for the game."
    },
    {
      "key": "osm-node-7079529828",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7079529828",
      "line": "مطعم مودة, a mapped place for the game."
    },
    {
      "key": "osm-node-7039345257",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7039345257",
      "line": "مطعم العطبراوي للمأكولات, a mapped place for the game."
    },
    {
      "key": "osm-way-788773933",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/788773933",
      "line": "AL- Rajhi Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-7079627016",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7079627016",
      "line": "مسجد الاندلس مربع 7, a mapped place for the game."
    },
    {
      "key": "osm-way-815520727",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/815520727",
      "line": "مستشفى شرق النيل, a mapped place for the game."
    },
    {
      "key": "osm-node-7161280085",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7161280085",
      "line": "منزل ضياء, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1100613539",
      "ref": "node/1100613539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11056429487",
      "ref": "node/11056429487",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1137250434",
      "ref": "node/1137250434",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1137250435",
      "ref": "node/1137250435",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11841204490",
      "ref": "node/11841204490",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11841217978",
      "ref": "node/11841217978",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11904868038",
      "ref": "node/11904868038",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1246405898",
      "ref": "node/1246405898",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13328012404",
      "ref": "node/13328012404",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368569609",
      "ref": "node/13368569609",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368575712",
      "ref": "node/13368575712",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368588570",
      "ref": "node/13368588570",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368592879",
      "ref": "node/13368592879",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368593041",
      "ref": "node/13368593041",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368598405",
      "ref": "node/13368598405",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368598406",
      "ref": "node/13368598406",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368598721",
      "ref": "node/13368598721",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13368602385",
      "ref": "node/13368602385",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
