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
  "name": "Jakarta",
  "box": [
    -6.356285789933978,
    106.64639449165824,
    -5.994524010066022,
    107.00794150834176
  ],
  "core": [
    -6.2206251224834945,
    106.78198641307657,
    -6.130184677516506,
    106.87234958692343
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/316743611",
      "line": "Kranji, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/274194694",
      "line": "Restoran Sederhana - Taman Mini, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/13326343093",
      "line": "Jakarta International College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/485074669",
      "line": "Rumah Sakit Siloam, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28705164",
      "line": "Lapangan Banteng, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/529392697",
      "line": "Baywalk Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/528649901",
      "line": "Vihara Bahtera Bhakti, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/368542626",
      "line": "Taman Fatahillah; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/157362135",
      "line": "Kementerian Pertanian, a mapped place for the game."
    },
    {
      "key": "osm-way-687400650",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/687400650",
      "line": "Institut Teknologi Indonesia, a mapped place for the game."
    },
    {
      "key": "osm-way-34748225",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/34748225",
      "line": "Stadion Tugu, a mapped place for the game."
    },
    {
      "key": "osm-node-13546873949",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13546873949",
      "line": "KRI Matjan Tutul, a mapped place for the game."
    },
    {
      "key": "osm-way-877465306",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/877465306",
      "line": "Politeknik Keuangan Negara STAN, a mapped place for the game."
    },
    {
      "key": "osm-way-248297920",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/248297920",
      "line": "Universitas Terbuka, a mapped place for the game."
    },
    {
      "key": "osm-way-1156849545",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1156849545",
      "line": "Warteg Kharisma Bahari · Sedia Soto Ayam, a mapped place for the game."
    },
    {
      "key": "osm-way-1082234947",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1082234947",
      "line": "J.CO Donuts & Coffee, a mapped place for the game."
    },
    {
      "key": "osm-relation-18873178",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/18873178",
      "line": "Benteng Martello, a mapped place for the game."
    },
    {
      "key": "osm-way-510896714",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/510896714",
      "line": "Museum MACAN, a mapped place for the game."
    },
    {
      "key": "osm-way-28193134",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28193134",
      "line": "Taman Menteng, a mapped place for the game."
    },
    {
      "key": "osm-way-121919489",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/121919489",
      "line": "Mall of Indonesia, a mapped place for the game."
    },
    {
      "key": "osm-way-119451364",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/119451364",
      "line": "Lippo Plaza Kramatjati, a mapped place for the game."
    },
    {
      "key": "osm-way-498482968",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/498482968",
      "line": "Al-Azhar Great Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-626583660",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/626583660",
      "line": "Stadion Patriot Candrabhaga, a mapped place for the game."
    },
    {
      "key": "osm-way-29203124",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/29203124",
      "line": "Indonesia Arena, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-9191746033",
      "ref": "node/9191746033",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11264058349",
      "ref": "node/11264058349",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11515575019",
      "ref": "node/11515575019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11699113019",
      "ref": "node/11699113019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11759061531",
      "ref": "node/11759061531",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11890975108",
      "ref": "node/11890975108",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11896573447",
      "ref": "node/11896573447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11898774577",
      "ref": "node/11898774577",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11955845885",
      "ref": "node/11955845885",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11983017102",
      "ref": "node/11983017102",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11992324339",
      "ref": "node/11992324339",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11992359711",
      "ref": "node/11992359711",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11992396382",
      "ref": "node/11992396382",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11992402436",
      "ref": "node/11992402436",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11993100335",
      "ref": "node/11993100335",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11993103293",
      "ref": "node/11993103293",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12017380253",
      "ref": "node/12017380253",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12085963389",
      "ref": "node/12085963389",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15591872",
      "ref": "relation/15591872",
      "kind": "water"
    },
    {
      "id": "water-way-28745793",
      "ref": "way/28745793",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
