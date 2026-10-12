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
  "name": "Baku",
  "box": [
    40.19470761006602,
    49.59633026354774,
    40.55646938993398,
    50.06927153645226
  ],
  "core": [
    40.330368277516506,
    49.77380262170338,
    40.42080872248349,
    49.89179917829662
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/670199298",
      "line": "Shah Ismail Khatai, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13847210164",
      "line": "Buta Palace Baku, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/32720577",
      "line": "Baku Engineering University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3796901116",
      "line": "Nationa Center of Oncology, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/152322861",
      "line": "Botanical Gardens, Baku, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/188605211",
      "line": "28 Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/7815953638",
      "line": "Cümə Məscidi, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1328471295",
      "line": "Freedom Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/10977608956",
      "line": "Daşınmaz Əmlakın Reyestri İdarəsi, a mapped place for the game."
    },
    {
      "key": "osm-way-323398478",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/323398478",
      "line": "Heydər Əliyev adına Ali Hərbi Məktəb, a mapped place for the game."
    },
    {
      "key": "osm-way-663814207",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/663814207",
      "line": "Palms Sports Arena, a mapped place for the game."
    },
    {
      "key": "osm-node-5320172364",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5320172364",
      "line": "Mud Volcano Lokbatan, a mapped place for the game."
    },
    {
      "key": "osm-node-2947442051",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2947442051",
      "line": "Bibi Heybat Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-2768993504",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2768993504",
      "line": "Yanar Dag Burning Mountain, a mapped place for the game."
    },
    {
      "key": "osm-node-10119666141",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10119666141",
      "line": "Ramana Castle, a mapped place for the game."
    },
    {
      "key": "osm-way-1204756170",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1204756170",
      "line": "Moskva Dövlət Universitetinin Bakı Filialı, a mapped place for the game."
    },
    {
      "key": "osm-node-12766646790",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12766646790",
      "line": "Heydar Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-357033239",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/357033239",
      "line": "Baku Olympic Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-271983522",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/271983522",
      "line": "Dövlət Sərhəd Xidmətinin Akademiyası, a mapped place for the game."
    },
    {
      "key": "osm-way-323751981",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/323751981",
      "line": "ASCO Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-178593266",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/178593266",
      "line": "Izmir Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-674677959",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/674677959",
      "line": "Ganjlik Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-299424032",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/299424032",
      "line": "Sabir Park, a mapped place for the game."
    },
    {
      "key": "osm-way-384863335",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/384863335",
      "line": "Sharg Bazaar, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1117022680",
      "ref": "node/1117022680",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1117022693",
      "ref": "node/1117022693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1117022714",
      "ref": "node/1117022714",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1642800271",
      "ref": "node/1642800271",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1880415471",
      "ref": "node/1880415471",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1885278455",
      "ref": "node/1885278455",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1930089730",
      "ref": "node/1930089730",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933649511",
      "ref": "node/1933649511",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1979028281",
      "ref": "node/1979028281",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2947442052",
      "ref": "node/2947442052",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3565500393",
      "ref": "node/3565500393",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3582597593",
      "ref": "node/3582597593",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3636125135",
      "ref": "node/3636125135",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9701286903",
      "ref": "node/9701286903",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3987743",
      "ref": "relation/3987743",
      "kind": "water"
    },
    {
      "id": "water-relation-8293744",
      "ref": "relation/8293744",
      "kind": "water"
    },
    {
      "id": "water-way-1122945453",
      "ref": "way/1122945453",
      "kind": "water"
    },
    {
      "id": "water-way-1200933198",
      "ref": "way/1200933198",
      "kind": "water"
    },
    {
      "id": "water-way-164920057",
      "ref": "way/164920057",
      "kind": "water"
    },
    {
      "id": "water-way-196530432",
      "ref": "way/196530432",
      "kind": "water"
    },
    {
      "id": "water-way-24497975",
      "ref": "way/24497975",
      "kind": "water"
    },
    {
      "id": "water-way-30660324",
      "ref": "way/30660324",
      "kind": "water"
    },
    {
      "id": "water-way-361431033",
      "ref": "way/361431033",
      "kind": "water"
    }
  ],
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
