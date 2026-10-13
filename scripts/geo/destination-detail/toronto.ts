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
  "minWaterKm2": 1,
  "name": "Toronto",
  "box": [
    43.47260081006602,
    -79.64184322710955,
    43.83436258993398,
    -79.13486908374745
  ],
  "core": [
    43.60826147751651,
    -79.44606004912784,
    43.698701922483494,
    -79.32180935087216
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/25991314",
      "line": "Bay, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10866107005",
      "line": "Tiflisi, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/349203862",
      "line": "Toronto Public Library - North York Central Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/5520155",
      "line": "Scarborough Health Network - Centenary Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/364925801",
      "line": "Étienne Brûlé Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/29466121",
      "line": "Woodbine Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/67140605",
      "line": "Knox Presbyterian Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/79664993",
      "line": "Etobicoke Civic Centre; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/8153684524",
      "line": "Archives of Ontario, a mapped place for the game."
    },
    {
      "key": "osm-way-703666033",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/703666033",
      "line": "Seneca Polytechnic, a mapped place for the game."
    },
    {
      "key": "osm-way-35545706",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/35545706",
      "line": "Birchmount Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-2424870841",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2424870841",
      "line": "Legoland Discovery Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-299944185",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/299944185",
      "line": "Mississauga Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-656128849",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/656128849",
      "line": "Edwards Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-33711256",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/33711256",
      "line": "Colonel Samuel Smith Park, a mapped place for the game."
    },
    {
      "key": "osm-way-30082934",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/30082934",
      "line": "Lawrence Allen Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-60483157",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/60483157",
      "line": "Toronto and Region Islamic Congregation, a mapped place for the game."
    },
    {
      "key": "osm-way-61956858",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/61956858",
      "line": "Heintzman House, a mapped place for the game."
    },
    {
      "key": "osm-way-85544826",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/85544826",
      "line": "Holy Family Catholic Church, a mapped place for the game."
    },
    {
      "key": "osm-relation-11005099",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/11005099",
      "line": "Centreville, a mapped place for the game."
    },
    {
      "key": "osm-way-661050155",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/661050155",
      "line": "Pacific Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-681295729",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/681295729",
      "line": "Scarborough Health Network - General Campus, a mapped place for the game."
    },
    {
      "key": "osm-node-5369170123",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5369170123",
      "line": "Shoushin, a mapped place for the game."
    },
    {
      "key": "osm-way-702100748",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/702100748",
      "line": "Tyndale University, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10772405686",
      "ref": "node/10772405686",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10772419926",
      "ref": "node/10772419926",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10772420104",
      "ref": "node/10772420104",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11565123860",
      "ref": "node/11565123860",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702642727",
      "ref": "node/11702642727",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702643776",
      "ref": "node/11702643776",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702643785",
      "ref": "node/11702643785",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702643803",
      "ref": "node/11702643803",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702643819",
      "ref": "node/11702643819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702643857",
      "ref": "node/11702643857",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11702643862",
      "ref": "node/11702643862",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1306348568",
      "ref": "node/1306348568",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13715421905",
      "ref": "node/13715421905",
      "kind": "neighbourhood"
    },
    {
      "id": "district-139339178",
      "ref": "node/139339178",
      "kind": "neighbourhood"
    },
    {
      "id": "district-139347757",
      "ref": "node/139347757",
      "kind": "neighbourhood"
    },
    {
      "id": "district-139354747",
      "ref": "node/139354747",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1979666316",
      "ref": "node/1979666316",
      "kind": "neighbourhood"
    },
    {
      "id": "district-20510417",
      "ref": "node/20510417",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1206310",
      "ref": "relation/1206310",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
