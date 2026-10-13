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
  "name": "Almaty",
  "box": [
    43.05551151006602,
    76.69838406081209,
    43.41727328993398,
    77.19307093918792
  ],
  "core": [
    43.191172177516506,
    76.88402969483555,
    43.28161262248349,
    77.00742530516446
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/260543817",
      "line": "Almaty-1 station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1458336073",
      "line": "Aqqu, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/27480946",
      "line": "Narxoz University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4527578543",
      "line": "Қалалық кардиология орталығы, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1296886349",
      "line": "Kok-Tobe Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/17023570",
      "line": "Апорт Молл, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1512139326",
      "line": "St. Seraphim and Theognost Aksai Hermitage (monastery). Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/3244397",
      "line": "Almaty City Akimat; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1148828088",
      "line": "Wedding palace, a mapped place for the game."
    },
    {
      "key": "osm-way-1389306295",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1389306295",
      "line": "Sagadat Nurmagambetov Military Institute of the Ground Forces, a mapped place for the game."
    },
    {
      "key": "osm-way-1084732338",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1084732338",
      "line": "Jas Qyran Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-10713558763",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10713558763",
      "line": "Oktyabrskaya cave, a mapped place for the game."
    },
    {
      "key": "osm-node-13690633205",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13690633205",
      "line": "Бұтақты, a mapped place for the game."
    },
    {
      "key": "osm-node-13691030944",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13691030944",
      "line": "Сакский курган, a mapped place for the game."
    },
    {
      "key": "osm-way-231104375",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/231104375",
      "line": "Храм Христа Спасителя, a mapped place for the game."
    },
    {
      "key": "osm-way-389067729",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/389067729",
      "line": "Our Lady of Kazan church, a mapped place for the game."
    },
    {
      "key": "osm-way-210871483",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/210871483",
      "line": "Baum grove, a mapped place for the game."
    },
    {
      "key": "osm-way-411621076",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/411621076",
      "line": "Academy of Civil Aviation, a mapped place for the game."
    },
    {
      "key": "osm-way-207798752",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/207798752",
      "line": "MEGA Alma-Ata, a mapped place for the game."
    },
    {
      "key": "osm-relation-3048271",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/3048271",
      "line": "Almaty Botanical Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-50459830",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/50459830",
      "line": "Тумар, a mapped place for the game."
    },
    {
      "key": "osm-way-286610625",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/286610625",
      "line": "Almaty University of Power Engineering and Telecommunications, a mapped place for the game."
    },
    {
      "key": "osm-way-1456509345",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1456509345",
      "line": "Central Stadium, a mapped place for the game."
    },
    {
      "key": "osm-relation-10082036",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/10082036",
      "line": "Almaty Arena, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10616627664",
      "ref": "node/10616627664",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826309098",
      "ref": "node/1826309098",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826309278",
      "ref": "node/1826309278",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826331897",
      "ref": "node/1826331897",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826331910",
      "ref": "node/1826331910",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826331936",
      "ref": "node/1826331936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826331954",
      "ref": "node/1826331954",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1826439629",
      "ref": "node/1826439629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1844578739",
      "ref": "node/1844578739",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3309197841",
      "ref": "node/3309197841",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3309197842",
      "ref": "node/3309197842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4606057731",
      "ref": "node/4606057731",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4665144598",
      "ref": "node/4665144598",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9933409225",
      "ref": "node/9933409225",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9943964188",
      "ref": "node/9943964188",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10281667456",
      "ref": "node/10281667456",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10578186330",
      "ref": "node/10578186330",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11508419223",
      "ref": "node/11508419223",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-208488825",
      "ref": "way/208488825",
      "kind": "water"
    },
    {
      "id": "water-way-23647280",
      "ref": "way/23647280",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
