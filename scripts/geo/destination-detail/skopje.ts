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
  "name": "Skopje",
  "box": [
    41.81532451006602,
    21.18945288314154,
    42.17708628993398,
    21.674323316858455
  ],
  "core": [
    41.95098517751651,
    21.371408866033246,
    42.041425622483494,
    21.49236733396675
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/482156739",
      "line": "Kadina Reka, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/309894643",
      "line": "Pelister, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/179091097",
      "line": "ФОН Универзитет, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/28212201",
      "line": "ГОБ 8-ми Септември, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1330252489",
      "line": "Monastery of Shishevo, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/32813170",
      "line": "Bit pazar, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/470409981",
      "line": "Манастир Св. Ѓорѓија, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1367341315",
      "line": "Град Скопје; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/174464032",
      "line": "National Bank of the Republic of North Macedonia, a mapped place for the game."
    },
    {
      "key": "osm-way-1486501468",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1486501468",
      "line": "University \"Mother Teresa\", a mapped place for the game."
    },
    {
      "key": "osm-way-38071327",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/38071327",
      "line": "Стадион Борис Трајковски, a mapped place for the game."
    },
    {
      "key": "osm-way-1521621170",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1521621170",
      "line": "Tauresium, a mapped place for the game."
    },
    {
      "key": "osm-way-1395332286",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1395332286",
      "line": "St. Peter & St. Paul, a mapped place for the game."
    },
    {
      "key": "osm-way-481402867",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/481402867",
      "line": "Sveto Prepolovenie Rusa Sreda, a mapped place for the game."
    },
    {
      "key": "osm-way-229939246",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/229939246",
      "line": "Millennium Cross, a mapped place for the game."
    },
    {
      "key": "osm-node-3951819342",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3951819342",
      "line": "Markovi Kuli, a mapped place for the game."
    },
    {
      "key": "osm-way-414650719",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/414650719",
      "line": "Парк Бановина, a mapped place for the game."
    },
    {
      "key": "osm-way-35778021",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/35778021",
      "line": "Avtokomanda Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-231098674",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/231098674",
      "line": "Рајски парк, a mapped place for the game."
    },
    {
      "key": "osm-way-174495088",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/174495088",
      "line": "Todor Proeski National Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-1559869019",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1559869019",
      "line": "South East European University, a mapped place for the game."
    },
    {
      "key": "osm-way-16669251",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/16669251",
      "line": "Ss. Cyril and Methodius University, a mapped place for the game."
    },
    {
      "key": "osm-node-4110147399",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4110147399",
      "line": "Етно кујна Вила Елена, a mapped place for the game."
    },
    {
      "key": "osm-node-9896205907",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9896205907",
      "line": "Caffe \"Te Sevda\", a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12128543535",
      "ref": "node/12128543535",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13354593332",
      "ref": "node/13354593332",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1929313959",
      "ref": "node/1929313959",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1929334016",
      "ref": "node/1929334016",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1929418852",
      "ref": "node/1929418852",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2883877897",
      "ref": "node/2883877897",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2883877899",
      "ref": "node/2883877899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-357897267",
      "ref": "node/357897267",
      "kind": "neighbourhood"
    },
    {
      "id": "district-367220375",
      "ref": "node/367220375",
      "kind": "neighbourhood"
    },
    {
      "id": "district-370514799",
      "ref": "node/370514799",
      "kind": "neighbourhood"
    },
    {
      "id": "district-371348947",
      "ref": "node/371348947",
      "kind": "neighbourhood"
    },
    {
      "id": "district-470409274",
      "ref": "node/470409274",
      "kind": "neighbourhood"
    },
    {
      "id": "district-470409501",
      "ref": "node/470409501",
      "kind": "neighbourhood"
    },
    {
      "id": "district-470410407",
      "ref": "node/470410407",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6147226901",
      "ref": "node/6147226901",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10877619769",
      "ref": "node/10877619769",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11889159297",
      "ref": "node/11889159297",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11889159298",
      "ref": "node/11889159298",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-701868141",
      "ref": "way/701868141",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
