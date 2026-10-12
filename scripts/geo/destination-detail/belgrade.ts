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
  "name": "Belgrade",
  "box": [
    44.63693221006602,
    20.202822421982965,
    44.99869398993398,
    20.710972378017033
  ],
  "core": [
    44.77259287751651,
    20.393528511011297,
    44.863033322483496,
    20.5202662889887
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/259997361",
      "line": "Ripanj, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/465243125",
      "line": "Aleksandar club Ski staza, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/7041829486",
      "line": "Public Library \"Milutin Bojić\", a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/409829311",
      "line": "Дом здравља Земун, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/68321074",
      "line": "Барутана, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/503379357",
      "line": "BIG Fashion Shopping Center, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/253990537",
      "line": "Црква Свете Петке, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/6760759093",
      "line": "Republic Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/675620894",
      "line": "Security Information Agency, a mapped place for the game."
    },
    {
      "key": "osm-way-370226754",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/370226754",
      "line": "Vinca Institute of Nuclear Sciences, a mapped place for the game."
    },
    {
      "key": "osm-way-1387911268",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1387911268",
      "line": "ФК БСК Борча, a mapped place for the game."
    },
    {
      "key": "osm-node-5589378733",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5589378733",
      "line": "Monument to Nikola Tesla, a mapped place for the game."
    },
    {
      "key": "osm-node-11425530815",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11425530815",
      "line": "Споменик палим борцима Сремчице, a mapped place for the game."
    },
    {
      "key": "osm-way-1444519027",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1444519027",
      "line": "Црква Свете Тројице, a mapped place for the game."
    },
    {
      "key": "osm-way-474077436",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/474077436",
      "line": "Црква светих арханђела Михаила и Гаврила, a mapped place for the game."
    },
    {
      "key": "osm-node-3017515469",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3017515469",
      "line": "Споменик палим борцима Црвене армије 1944., a mapped place for the game."
    },
    {
      "key": "osm-way-93145927",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/93145927",
      "line": "FZk Resnik, a mapped place for the game."
    },
    {
      "key": "osm-way-438907241",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/438907241",
      "line": "ОШ Алекса Шантић, a mapped place for the game."
    },
    {
      "key": "osm-way-371964365",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/371964365",
      "line": "Стадион Бежанија, a mapped place for the game."
    },
    {
      "key": "osm-node-12869419136",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/12869419136",
      "line": "Мегатренд универзитет, a mapped place for the game."
    },
    {
      "key": "osm-way-482462319",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/482462319",
      "line": "Jajinci Memorial Park, a mapped place for the game."
    },
    {
      "key": "osm-way-1350045138",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1350045138",
      "line": "Faculty of Security Studies, University of Belgrade, a mapped place for the game."
    },
    {
      "key": "osm-way-392169933",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/392169933",
      "line": "Дом здравља Раковица, a mapped place for the game."
    },
    {
      "key": "osm-way-715373965",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/715373965",
      "line": "Хотел „Авала”, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10693254170",
      "ref": "node/10693254170",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10742262741",
      "ref": "node/10742262741",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10746580219",
      "ref": "node/10746580219",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11582139369",
      "ref": "node/11582139369",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1190635141",
      "ref": "node/1190635141",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12001055254",
      "ref": "node/12001055254",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12321218591",
      "ref": "node/12321218591",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1366287035",
      "ref": "node/1366287035",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1367144378",
      "ref": "node/1367144378",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13731088623",
      "ref": "node/13731088623",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1486059453",
      "ref": "node/1486059453",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158636400",
      "ref": "node/158636400",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158642055",
      "ref": "node/158642055",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1680156159",
      "ref": "node/1680156159",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1726396960",
      "ref": "node/1726396960",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1867304610",
      "ref": "node/1867304610",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2005042826",
      "ref": "node/2005042826",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071836198",
      "ref": "node/2071836198",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-14675465",
      "ref": "relation/14675465",
      "kind": "water"
    },
    {
      "id": "water-relation-1739017",
      "ref": "relation/1739017",
      "kind": "water"
    },
    {
      "id": "water-relation-2089103",
      "ref": "relation/2089103",
      "kind": "water"
    },
    {
      "id": "water-way-15800521",
      "ref": "way/15800521",
      "kind": "water"
    },
    {
      "id": "water-way-15939677",
      "ref": "way/15939677",
      "kind": "water"
    },
    {
      "id": "water-way-15939678",
      "ref": "way/15939678",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
