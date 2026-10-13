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
  "name": "Ramallah",
  "box": [
    31.722173410066024,
    34.983177336342926,
    32.08393518993398,
    35.40727366365707
  ],
  "core": [
    31.857834077516507,
    35.142291882457826,
    31.948274522483494,
    35.24815911754217
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/432275909",
      "line": "Ramallah Bus And Taxi Center Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/432261211",
      "line": "Yafa Cafe, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/193255177",
      "line": "Birzeit University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/684825570",
      "line": "مستشفى الشهيد ياسر عرفات الحكومي, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/231308770",
      "line": "Mahmoud Darwish Museum (Al-Birweh Park), a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/9038402171",
      "line": "abu khalid market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1177037502",
      "line": "Basilique de la Manifestation du Seigneur, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1005833414",
      "line": "Al Manara Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4294364595",
      "line": "Palestinian Pension Authority, a mapped place for the game."
    },
    {
      "key": "osm-node-432281542",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/432281542",
      "line": "Al Quds Open University, a mapped place for the game."
    },
    {
      "key": "osm-way-41819706",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/41819706",
      "line": "Faisal Al-Husseini International Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-4753096643",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4753096643",
      "line": "Khirbet Tel Ai, a mapped place for the game."
    },
    {
      "key": "osm-node-2675850287",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2675850287",
      "line": "Tel A-Nasbe, a mapped place for the game."
    },
    {
      "key": "osm-node-432267397",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/432267397",
      "line": "Lazarus Tomb, a mapped place for the game."
    },
    {
      "key": "osm-way-701954745",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/701954745",
      "line": "Yasser Arafat, a mapped place for the game."
    },
    {
      "key": "osm-way-253373054",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/253373054",
      "line": "Istishari Arab Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-257319379",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/257319379",
      "line": "latin church, a mapped place for the game."
    },
    {
      "key": "osm-way-345024242",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/345024242",
      "line": "Al-Quds University, a mapped place for the game."
    },
    {
      "key": "osm-node-5133731942",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5133731942",
      "line": "مجمع فلسطين الطبي, a mapped place for the game."
    },
    {
      "key": "osm-node-432262059",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/432262059",
      "line": "Abo Maysar, a mapped place for the game."
    },
    {
      "key": "osm-node-432274045",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/432274045",
      "line": "Turmus Ayaa Sweet, a mapped place for the game."
    },
    {
      "key": "osm-node-432260801",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/432260801",
      "line": "Selwad Park, a mapped place for the game."
    },
    {
      "key": "osm-way-419484958",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/419484958",
      "line": "Aboud Gardens, a mapped place for the game."
    },
    {
      "key": "osm-node-432286032",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/432286032",
      "line": "Stadium, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2431013419",
      "ref": "node/2431013419",
      "kind": "neighbourhood"
    },
    {
      "id": "district-334238394",
      "ref": "node/334238394",
      "kind": "neighbourhood"
    },
    {
      "id": "district-334238808",
      "ref": "node/334238808",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8236506232",
      "ref": "node/8236506232",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1388203504",
      "ref": "node/1388203504",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432261625",
      "ref": "node/432261625",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432267280",
      "ref": "node/432267280",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432269101",
      "ref": "node/432269101",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432269952",
      "ref": "node/432269952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432276039",
      "ref": "node/432276039",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432277882",
      "ref": "node/432277882",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432282309",
      "ref": "node/432282309",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432282318",
      "ref": "node/432282318",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432295516",
      "ref": "node/432295516",
      "kind": "neighbourhood"
    },
    {
      "id": "district-432296399",
      "ref": "node/432296399",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
