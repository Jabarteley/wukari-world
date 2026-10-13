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
  "name": "Moscow",
  "box": [
    55.56966031006602,
    37.29675860998793,
    55.986530044496696,
    37.93819779001207
  ],
  "core": [
    55.70532097751651,
    37.53757782946084,
    55.795761422483494,
    37.697378570539165
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/54626031",
      "line": "Черкизово, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1732706925",
      "line": "Му-Му, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/3148830081",
      "line": "Российская экономическая школа, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/8220601",
      "line": "Детская городская клиническая больница имени З.А. Башляевой, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/365223",
      "line": "Garden of the Future, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/3789959",
      "line": "Aviapark, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/39288715",
      "line": "Храм Троицы Живоначальной, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8093485166",
      "line": "площадь Амилкара Кабрала; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4221178591",
      "line": "ЗАГС, a mapped place for the game."
    },
    {
      "key": "osm-relation-2801575",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/2801575",
      "line": "Мытищинский филиал МГТУ им. Н. Э. Баумана (МГУЛ), a mapped place for the game."
    },
    {
      "key": "osm-relation-7821481",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/7821481",
      "line": "Zorky, a mapped place for the game."
    },
    {
      "key": "osm-node-4862008461",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4862008461",
      "line": "Покровское, a mapped place for the game."
    },
    {
      "key": "osm-relation-1944912",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/1944912",
      "line": "Brateevo park, a mapped place for the game."
    },
    {
      "key": "osm-way-227741770",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/227741770",
      "line": "Tupolev Tu-104, a mapped place for the game."
    },
    {
      "key": "osm-way-1317128307",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1317128307",
      "line": "Спецобъект Коммунарка, a mapped place for the game."
    },
    {
      "key": "osm-way-242466020",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/242466020",
      "line": "Храм во имя иконы Божией Матери «Знамение» в Аксиньине, a mapped place for the game."
    },
    {
      "key": "osm-way-50612064",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/50612064",
      "line": "Church of the Exaltation of the Holy Cross in Altufyevo, a mapped place for the game."
    },
    {
      "key": "osm-relation-6912449",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/6912449",
      "line": "Москворецкий дендропарк, a mapped place for the game."
    },
    {
      "key": "osm-relation-64496",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/64496",
      "line": "МГТУ им. Н. Э. Баумана (Главный учебный корпус), a mapped place for the game."
    },
    {
      "key": "osm-relation-162802",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/162802",
      "line": "Grand Sports Arena of the Luzhniki Olympic Complex, a mapped place for the game."
    },
    {
      "key": "osm-way-91742617",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/91742617",
      "line": "Mytishchi Arena, a mapped place for the game."
    },
    {
      "key": "osm-relation-9993909",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/9993909",
      "line": "FSB Academy, a mapped place for the game."
    },
    {
      "key": "osm-relation-4080379",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/4080379",
      "line": "ЦКБ Управления делами Президента РФ, a mapped place for the game."
    },
    {
      "key": "osm-node-3887492858",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3887492858",
      "line": "Рижский рынок, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1067307733",
      "ref": "node/1067307733",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1128048216",
      "ref": "node/1128048216",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1133363131",
      "ref": "node/1133363131",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1274540186",
      "ref": "node/1274540186",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1295827991",
      "ref": "node/1295827991",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625648082",
      "ref": "node/1625648082",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625648102",
      "ref": "node/1625648102",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625648105",
      "ref": "node/1625648105",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625648111",
      "ref": "node/1625648111",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625648122",
      "ref": "node/1625648122",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625648129",
      "ref": "node/1625648129",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1662142510",
      "ref": "node/1662142510",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1666368780",
      "ref": "node/1666368780",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1798368411",
      "ref": "node/1798368411",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2017086951",
      "ref": "node/2017086951",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2052630845",
      "ref": "node/2052630845",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2052650362",
      "ref": "node/2052650362",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2082215070",
      "ref": "node/2082215070",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1528602",
      "ref": "relation/1528602",
      "kind": "water"
    },
    {
      "id": "water-relation-1926721",
      "ref": "relation/1926721",
      "kind": "water"
    },
    {
      "id": "water-relation-2279003",
      "ref": "relation/2279003",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
