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
  "name": "Kabul",
  "box": [
    34.34606941006602,
    68.9665088115245,
    34.707831189933984,
    69.4036079884755
  ],
  "core": [
    34.48173007751651,
    69.13051030710811,
    34.572170522483496,
    69.2396064928919
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/11137703487",
      "line": "Minibuses to Bamyan, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13472526480",
      "line": "China Lanzhou Beef Noodles, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/706056301",
      "line": "Dawat University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/991171093",
      "line": "French Medical Institute for Children, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/387447673",
      "line": "Chihilsitoon Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/1392109020",
      "line": "Kabul City Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/199569685",
      "line": "Puli Khishti Jamia Masjid, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8037609484",
      "line": "Mamoriat Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/5307575",
      "line": "National Assembly of Afghanistan, a mapped place for the game."
    },
    {
      "key": "osm-way-991169055",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/991169055",
      "line": "Kabul Polytechnic University, a mapped place for the game."
    },
    {
      "key": "osm-way-1494767421",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1494767421",
      "line": "Ghazi Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-772243563",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/772243563",
      "line": "Guldara Stupa, a mapped place for the game."
    },
    {
      "key": "osm-node-2551955816",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2551955816",
      "line": "Minar-i Chakri, a mapped place for the game."
    },
    {
      "key": "osm-way-710563825",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/710563825",
      "line": "شفاخانه جناح, a mapped place for the game."
    },
    {
      "key": "osm-way-199353387",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/199353387",
      "line": "Gardens of Babur, a mapped place for the game."
    },
    {
      "key": "osm-way-200364379",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/200364379",
      "line": "د داود خان نظامي روغتون, a mapped place for the game."
    },
    {
      "key": "osm-way-1339181429",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1339181429",
      "line": "Bala Hissar, a mapped place for the game."
    },
    {
      "key": "osm-way-793260749",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/793260749",
      "line": "Sakhi Shrine, a mapped place for the game."
    },
    {
      "key": "osm-way-864540700",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/864540700",
      "line": "Shah-i du Shamshira, a mapped place for the game."
    },
    {
      "key": "osm-way-201198534",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/201198534",
      "line": "Zarnergar Park, a mapped place for the game."
    },
    {
      "key": "osm-way-199999770",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/199999770",
      "line": "Kabul University, a mapped place for the game."
    },
    {
      "key": "osm-way-560456603",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/560456603",
      "line": "Alokozay International Cricket Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-13597152438",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13597152438",
      "line": "Aqcha Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-7965537558",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7965537558",
      "line": "Restaurant Gharb Kabul, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2244682137",
      "ref": "node/2244682137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4191933726",
      "ref": "node/4191933726",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4309995668",
      "ref": "node/4309995668",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5173565428",
      "ref": "node/5173565428",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5318514555",
      "ref": "node/5318514555",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5476200276",
      "ref": "node/5476200276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6591432139",
      "ref": "node/6591432139",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6603105770",
      "ref": "node/6603105770",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6634173912",
      "ref": "node/6634173912",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7784856415",
      "ref": "node/7784856415",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9025827741",
      "ref": "node/9025827741",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095208813",
      "ref": "node/9095208813",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095208814",
      "ref": "node/9095208814",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095208842",
      "ref": "node/9095208842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095208869",
      "ref": "node/9095208869",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095208877",
      "ref": "node/9095208877",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095208955",
      "ref": "node/9095208955",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9095209147",
      "ref": "node/9095209147",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-10884510",
      "ref": "relation/10884510",
      "kind": "water"
    },
    {
      "id": "water-relation-9761598",
      "ref": "relation/9761598",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
