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
  "name": "Dushanbe",
  "box": [
    38.39582361006602,
    68.55503820132188,
    38.75758538993398,
    69.01582779867812
  ],
  "core": [
    38.531484277516505,
    68.72794341619667,
    38.62192472248349,
    68.84292258380333
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/252791512",
      "line": "Dushanbe, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2357110559",
      "line": "Алмос, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/993587672",
      "line": "Tajik Agrarian University Shirinsho Shotemur, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/9027926117",
      "line": "роддом рудаки, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/520892162",
      "line": "Rudaki Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/13526286670",
      "line": "Darvoz, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/610952154",
      "line": "St. Nicholas Orthodox Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/13526356871",
      "line": "МВД; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/528417507",
      "line": "Supreme Assembly, a mapped place for the game."
    },
    {
      "key": "osm-way-247152234",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/247152234",
      "line": "Tajik State University of Commerce, a mapped place for the game."
    },
    {
      "key": "osm-node-9655730217",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9655730217",
      "line": "climbing place, a mapped place for the game."
    },
    {
      "key": "osm-way-42488771",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/42488771",
      "line": "Hisar Fortress, a mapped place for the game."
    },
    {
      "key": "osm-way-521097387",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/521097387",
      "line": "Park Khayyam, a mapped place for the game."
    },
    {
      "key": "osm-node-405093878",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/405093878",
      "line": "Victory Park, a mapped place for the game."
    },
    {
      "key": "osm-way-486297646",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/486297646",
      "line": "Tajik State Pedagogical University named after S. Aini, a mapped place for the game."
    },
    {
      "key": "osm-way-574403086",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/574403086",
      "line": "Tajik National University, a mapped place for the game."
    },
    {
      "key": "osm-way-105572713",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/105572713",
      "line": "Mevlana Yakub Charki Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-486255310",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/486255310",
      "line": "Майдони вазишӣ, a mapped place for the game."
    },
    {
      "key": "osm-way-482515768",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/482515768",
      "line": "stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-12064585531",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12064585531",
      "line": "Панҷ дег, a mapped place for the game."
    },
    {
      "key": "osm-node-5563662637",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5563662637",
      "line": "Ошхонаи Оби шифо, a mapped place for the game."
    },
    {
      "key": "osm-node-4467243189",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4467243189",
      "line": "Маркази саломати, a mapped place for the game."
    },
    {
      "key": "osm-way-623245028",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/623245028",
      "line": "Бозори Балх, a mapped place for the game."
    },
    {
      "key": "osm-way-27154229",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/27154229",
      "line": "РКТБ №3 \"Мачитон\", a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-13526356864",
      "ref": "node/13526356864",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13526413781",
      "ref": "node/13526413781",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13526413782",
      "ref": "node/13526413782",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13526413783",
      "ref": "node/13526413783",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2399097005",
      "ref": "node/2399097005",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7373669686",
      "ref": "node/7373669686",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7377058744",
      "ref": "node/7377058744",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7377058745",
      "ref": "node/7377058745",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7377058746",
      "ref": "node/7377058746",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7377058752",
      "ref": "node/7377058752",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7418060554",
      "ref": "node/7418060554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7419789426",
      "ref": "node/7419789426",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7419789430",
      "ref": "node/7419789430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7419789455",
      "ref": "node/7419789455",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7423834082",
      "ref": "node/7423834082",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7423893385",
      "ref": "node/7423893385",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7423893395",
      "ref": "node/7423893395",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7426271059",
      "ref": "node/7426271059",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
