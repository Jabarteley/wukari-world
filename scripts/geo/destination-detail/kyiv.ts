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
  "name": "Kyiv",
  "box": [
    50.26915271006602,
    30.24089722954983,
    50.63091448993398,
    30.90877819032727
  ],
  "core": [
    50.404813377516504,
    30.45352993172862,
    50.49525382248349,
    30.59474226827138
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/354092439",
      "line": "Prospekt Nauky, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7775614985",
      "line": "100 Rokiv Tomu Vpered, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/2275530238",
      "line": "Дитяча бібліотека №142, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/3430089",
      "line": "Київська міська клінічна лікарня швидкої медичної допомоги, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/14984045",
      "line": "Парк Тараса Шевченка, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/435080613",
      "line": "Retroville, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/481695850",
      "line": "Свято-Михайлівська церква, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8173531647",
      "line": "Kharkivska Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/803756038",
      "line": "Національна комісія регулювання енергетики та комунальних послуг, a mapped place for the game."
    },
    {
      "key": "osm-way-114113363",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/114113363",
      "line": "Університет Україна, a mapped place for the game."
    },
    {
      "key": "osm-way-832672170",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/832672170",
      "line": "Spartak, a mapped place for the game."
    },
    {
      "key": "osm-node-309594358",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/309594358",
      "line": "Bunker No 453 KIFR, a mapped place for the game."
    },
    {
      "key": "osm-node-6423216738",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6423216738",
      "line": "Л-410, a mapped place for the game."
    },
    {
      "key": "osm-way-158025803",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/158025803",
      "line": "Mezhyhiria, a mapped place for the game."
    },
    {
      "key": "osm-way-552929873",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/552929873",
      "line": "Serpent's Wall, a mapped place for the game."
    },
    {
      "key": "osm-way-1052304759",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1052304759",
      "line": "Санаторій «Конча-Заспа», a mapped place for the game."
    },
    {
      "key": "osm-way-152179973",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/152179973",
      "line": "Парк «Пуща-Водиця», a mapped place for the game."
    },
    {
      "key": "osm-way-223762038",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/223762038",
      "line": "Kyiv Ukraine Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-41378030",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/41378030",
      "line": "Cathedral of St. Pantaleon, a mapped place for the game."
    },
    {
      "key": "osm-way-642676042",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/642676042",
      "line": "Національний університет біоресурсів і природокористування України, a mapped place for the game."
    },
    {
      "key": "osm-way-192594997",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/192594997",
      "line": "Kyiv Medical College No. 3, a mapped place for the game."
    },
    {
      "key": "osm-way-438649004",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/438649004",
      "line": "Kyiv City Maternity Hospital 1, a mapped place for the game."
    },
    {
      "key": "osm-relation-14694175",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/14694175",
      "line": "Локомотив, a mapped place for the game."
    },
    {
      "key": "osm-way-191681151",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/191681151",
      "line": "Ocean Plaza, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10245075087",
      "ref": "node/10245075087",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1307125190",
      "ref": "node/1307125190",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227676",
      "ref": "node/1308227676",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227679",
      "ref": "node/1308227679",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227680",
      "ref": "node/1308227680",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227683",
      "ref": "node/1308227683",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227684",
      "ref": "node/1308227684",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227685",
      "ref": "node/1308227685",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227686",
      "ref": "node/1308227686",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227687",
      "ref": "node/1308227687",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227688",
      "ref": "node/1308227688",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308227689",
      "ref": "node/1308227689",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308283977",
      "ref": "node/1308283977",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308283981",
      "ref": "node/1308283981",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308283982",
      "ref": "node/1308283982",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308283983",
      "ref": "node/1308283983",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308283984",
      "ref": "node/1308283984",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308284001",
      "ref": "node/1308284001",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1597452",
      "ref": "relation/1597452",
      "kind": "water"
    },
    {
      "id": "water-relation-1671922",
      "ref": "relation/1671922",
      "kind": "water"
    },
    {
      "id": "water-relation-18468494",
      "ref": "relation/18468494",
      "kind": "water"
    },
    {
      "id": "water-relation-2002308",
      "ref": "relation/2002308",
      "kind": "water"
    },
    {
      "id": "water-relation-66386",
      "ref": "relation/66386",
      "kind": "water"
    },
    {
      "id": "water-relation-9087319",
      "ref": "relation/9087319",
      "kind": "water"
    },
    {
      "id": "water-way-1378420764",
      "ref": "way/1378420764",
      "kind": "water"
    },
    {
      "id": "water-way-174578777",
      "ref": "way/174578777",
      "kind": "water"
    },
    {
      "id": "water-way-23686484",
      "ref": "way/23686484",
      "kind": "water"
    },
    {
      "id": "water-way-26409357",
      "ref": "way/26409357",
      "kind": "water"
    },
    {
      "id": "water-way-27879975",
      "ref": "way/27879975",
      "kind": "water"
    },
    {
      "id": "water-way-5218569",
      "ref": "way/5218569",
      "kind": "water"
    },
    {
      "id": "water-way-56684319",
      "ref": "way/56684319",
      "kind": "water"
    },
    {
      "id": "water-way-59151539",
      "ref": "way/59151539",
      "kind": "water"
    },
    {
      "id": "water-way-98893916",
      "ref": "way/98893916",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
