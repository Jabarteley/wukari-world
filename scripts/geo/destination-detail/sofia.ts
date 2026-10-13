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
  "name": "Sofia",
  "box": [
    42.51682191006602,
    23.076562729712798,
    42.87858368993398,
    23.566909070287203
  ],
  "core": [
    42.65248257751651,
    23.260576898671783,
    42.742923022483495,
    23.382894901328218
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/281144692",
      "line": "Obelya, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/302808867",
      "line": "Под липите, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/255130835",
      "line": "University of finance, business and entrepreneurship, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/335394232",
      "line": "ДПБ за лечение на наркомании и алкохолизъм, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/21397443",
      "line": "Park „St. St. Peter & Pavel“, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/170658898",
      "line": "Sofia Ring Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/726636079",
      "line": "Балшенски манастир \"Св. Теодор Стратилат\", a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/9586161523",
      "line": "Kapitan Petko Voivoda Sq.; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/213428184",
      "line": "Regional Court - Kostinbrod, a mapped place for the game."
    },
    {
      "key": "osm-way-1523767655",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1523767655",
      "line": "State University of Library Studies and Information Technologies, a mapped place for the game."
    },
    {
      "key": "osm-node-3001939533",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3001939533",
      "line": "Kamen del, a mapped place for the game."
    },
    {
      "key": "osm-node-1406576355",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1406576355",
      "line": "Кладнишка крепост, a mapped place for the game."
    },
    {
      "key": "osm-way-409292553",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/409292553",
      "line": "Seslavtsi Monastery St Nicholas, a mapped place for the game."
    },
    {
      "key": "osm-way-258411873",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/258411873",
      "line": "Германски манастир \"Св. Иван Рилски\", a mapped place for the game."
    },
    {
      "key": "osm-node-6221811642",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6221811642",
      "line": "Vazov's Oak, a mapped place for the game."
    },
    {
      "key": "osm-node-3114348357",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3114348357",
      "line": "Pyramids of Katina, a mapped place for the game."
    },
    {
      "key": "osm-way-207570571",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/207570571",
      "line": "Стадион \"Драгалевци\", a mapped place for the game."
    },
    {
      "key": "osm-way-292960618",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/292960618",
      "line": "Lokomotiv Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-179145803",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/179145803",
      "line": "West Park, a mapped place for the game."
    },
    {
      "key": "osm-way-315468410",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/315468410",
      "line": "Technical University of Sofia, a mapped place for the game."
    },
    {
      "key": "osm-way-111605510",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/111605510",
      "line": "SkyCity, a mapped place for the game."
    },
    {
      "key": "osm-relation-16476740",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/16476740",
      "line": "УМБАЛ „Лозенец“, a mapped place for the game."
    },
    {
      "key": "osm-node-14109563211",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/14109563211",
      "line": "СБАЛОТ „Витоша“, a mapped place for the game."
    },
    {
      "key": "osm-way-1001043616",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1001043616",
      "line": "Мадарска градинка, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1699545833",
      "ref": "node/1699545833",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1699688022",
      "ref": "node/1699688022",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2178207632",
      "ref": "node/2178207632",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2178221613",
      "ref": "node/2178221613",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2178222173",
      "ref": "node/2178222173",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2178222386",
      "ref": "node/2178222386",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2178223630",
      "ref": "node/2178223630",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2185173877",
      "ref": "node/2185173877",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2382101454",
      "ref": "node/2382101454",
      "kind": "neighbourhood"
    },
    {
      "id": "district-248937176",
      "ref": "node/248937176",
      "kind": "neighbourhood"
    },
    {
      "id": "district-248937182",
      "ref": "node/248937182",
      "kind": "neighbourhood"
    },
    {
      "id": "district-248937392",
      "ref": "node/248937392",
      "kind": "neighbourhood"
    },
    {
      "id": "district-249105235",
      "ref": "node/249105235",
      "kind": "neighbourhood"
    },
    {
      "id": "district-253244740",
      "ref": "node/253244740",
      "kind": "neighbourhood"
    },
    {
      "id": "district-253245134",
      "ref": "node/253245134",
      "kind": "neighbourhood"
    },
    {
      "id": "district-253525981",
      "ref": "node/253525981",
      "kind": "neighbourhood"
    },
    {
      "id": "district-253526142",
      "ref": "node/253526142",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3176611873",
      "ref": "node/3176611873",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11943054",
      "ref": "relation/11943054",
      "kind": "water"
    },
    {
      "id": "water-way-25236640",
      "ref": "way/25236640",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
