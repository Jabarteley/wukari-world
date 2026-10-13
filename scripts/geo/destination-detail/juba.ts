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
  "name": "Juba",
  "box": [
    4.665043710066022,
    31.415561382556415,
    5.026805489933978,
    31.776273217443585
  ],
  "core": [
    4.800704377516506,
    31.550837582813326,
    4.891144822483494,
    31.640997017186674
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3836194057",
      "line": "Customs Bus Depot, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2086918124",
      "line": "Sunrise Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/206932868",
      "line": "University of Juba, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/8003574774",
      "line": "Kwerjik Luri PHCU, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/312829137",
      "line": "#Nr143, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1012825296",
      "line": "Gudele Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/192610317",
      "line": "St. Theresa Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/13562765",
      "line": "Juba City Council - Mayor's Office; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/6977650248",
      "line": "PABX, a mapped place for the game."
    },
    {
      "key": "osm-node-3713157073",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/3713157073",
      "line": "St Mary's College, a mapped place for the game."
    },
    {
      "key": "osm-relation-2893806",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/2893806",
      "line": "Juba Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-7290956786",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7290956786",
      "line": "Back side gate, a mapped place for the game."
    },
    {
      "key": "osm-node-5765453653",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5765453653",
      "line": "Mobil -Bori, a mapped place for the game."
    },
    {
      "key": "osm-node-7290956785",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7290956785",
      "line": "Good Shepherd, a mapped place for the game."
    },
    {
      "key": "osm-node-8003564619",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/8003564619",
      "line": "Nyakuron PHCC, a mapped place for the game."
    },
    {
      "key": "osm-way-786546062",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/786546062",
      "line": "DMI Nursery, a mapped place for the game."
    },
    {
      "key": "osm-node-7250053086",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7250053086",
      "line": "Rajaf training centre., a mapped place for the game."
    },
    {
      "key": "osm-node-3830429174",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3830429174",
      "line": "Rock City Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-822146512",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/822146512",
      "line": "Munuki Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-3453472489",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3453472489",
      "line": "Curry & Hurry, a mapped place for the game."
    },
    {
      "key": "osm-node-11847004207",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/11847004207",
      "line": "BOFA, a mapped place for the game."
    },
    {
      "key": "osm-way-320299511",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/320299511",
      "line": "Gabat Market, a mapped place for the game."
    },
    {
      "key": "osm-node-5719627126",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5719627126",
      "line": "Nya ying, a mapped place for the game."
    },
    {
      "key": "osm-node-14022544197",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/14022544197",
      "line": "Upper Nile University, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2695840486",
      "ref": "node/2695840486",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3775311457",
      "ref": "node/3775311457",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642424",
      "ref": "node/4009642424",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642425",
      "ref": "node/4009642425",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642426",
      "ref": "node/4009642426",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642427",
      "ref": "node/4009642427",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642428",
      "ref": "node/4009642428",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642429",
      "ref": "node/4009642429",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642430",
      "ref": "node/4009642430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642431",
      "ref": "node/4009642431",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642432",
      "ref": "node/4009642432",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642433",
      "ref": "node/4009642433",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642434",
      "ref": "node/4009642434",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642436",
      "ref": "node/4009642436",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642437",
      "ref": "node/4009642437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642438",
      "ref": "node/4009642438",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642439",
      "ref": "node/4009642439",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4009642440",
      "ref": "node/4009642440",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
