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
  "name": "Bishkek",
  "box": [
    42.69526151006602,
    74.35778696922806,
    43.0703420444967,
    74.84955783077193
  ],
  "core": [
    42.830922177516506,
    74.54233656653902,
    42.92136262248349,
    74.66500823346097
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/240449433",
      "line": "Bishkek 2, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3105696426",
      "line": "Royal Fish, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/341105734",
      "line": "Ala-Too International University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3423325424",
      "line": "Амбулатория, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/25487201",
      "line": "Panfilov Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/25491570",
      "line": "Dordoi Bazaar, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/177274786",
      "line": "Resurrection Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/4406838990",
      "line": "Байтик акимиаты; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4704895397",
      "line": "Кантский энергосбыт, a mapped place for the game."
    },
    {
      "key": "osm-way-769141527",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/769141527",
      "line": "Kyrgyz-Turkish Manas University Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-25487169",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/25487169",
      "line": "Dolen Omurzakov Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-11865797560",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11865797560",
      "line": "Найманбай манасчы, a mapped place for the game."
    },
    {
      "key": "osm-node-6786453658",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6786453658",
      "line": "УНПК Международный Университет Кыргызстана Центральный Кампус, a mapped place for the game."
    },
    {
      "key": "osm-way-329702889",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/329702889",
      "line": "Kyrgyz-Russian Slavic University, a mapped place for the game."
    },
    {
      "key": "osm-relation-4775068",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/4775068",
      "line": "Osh Bazaar, a mapped place for the game."
    },
    {
      "key": "osm-way-49130695",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/49130695",
      "line": "Mikhail Frunze Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-165833844",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/165833844",
      "line": "Кара-Жыгач багы, a mapped place for the game."
    },
    {
      "key": "osm-node-4085389965",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4085389965",
      "line": "Зоологический музей, a mapped place for the game."
    },
    {
      "key": "osm-node-9805150731",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9805150731",
      "line": "Sultan Hall, a mapped place for the game."
    },
    {
      "key": "osm-node-11758597705",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11758597705",
      "line": "Obryv Artura, a mapped place for the game."
    },
    {
      "key": "osm-way-1448008187",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1448008187",
      "line": "Овощной сектор, a mapped place for the game."
    },
    {
      "key": "osm-node-1224398024",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1224398024",
      "line": "Панорама, a mapped place for the game."
    },
    {
      "key": "osm-node-12617822550",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/12617822550",
      "line": "FIELD, a mapped place for the game."
    },
    {
      "key": "osm-way-1025447782",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1025447782",
      "line": "стадион, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10295528087",
      "ref": "node/10295528087",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10296613685",
      "ref": "node/10296613685",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11896299983",
      "ref": "node/11896299983",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11896382386",
      "ref": "node/11896382386",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11896387830",
      "ref": "node/11896387830",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11950581807",
      "ref": "node/11950581807",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11951485927",
      "ref": "node/11951485927",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11951957126",
      "ref": "node/11951957126",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12093742128",
      "ref": "node/12093742128",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12122727043",
      "ref": "node/12122727043",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12808929909",
      "ref": "node/12808929909",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13174229723",
      "ref": "node/13174229723",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13174238350",
      "ref": "node/13174238350",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13470095190",
      "ref": "node/13470095190",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13718630896",
      "ref": "node/13718630896",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13718660226",
      "ref": "node/13718660226",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13718660250",
      "ref": "node/13718660250",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13718795211",
      "ref": "node/13718795211",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15034778",
      "ref": "relation/15034778",
      "kind": "water"
    },
    {
      "id": "water-relation-17071044",
      "ref": "relation/17071044",
      "kind": "water"
    },
    {
      "id": "water-way-22776952",
      "ref": "way/22776952",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
