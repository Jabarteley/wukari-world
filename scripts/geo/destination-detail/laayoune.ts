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
  "name": "Laayoune",
  "box": [
    26.973631110066023,
    -13.39763842466019,
    27.335392889933978,
    -12.993145775339809
  ],
  "core": [
    27.109291777516507,
    -13.245892014568964,
    27.199732222483494,
    -13.144892185431035
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/1034652636",
      "line": "Gare routier, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11091107405",
      "line": "Café Rio, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/316771246",
      "line": "EST : École Supérieure de Technologie, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/311290860",
      "line": "Moulay Hassan Ben Mehdi Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/247543284",
      "line": "ali, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1098678391",
      "line": "سوق الماشية Marché aux Bestiaux, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/310863257",
      "line": "Catholic Church of Saint Francis of Assisi, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/11762484638",
      "line": "Collège Anoual، Laayoune; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1266326120",
      "line": "Cour d'appel, a mapped place for the game."
    },
    {
      "key": "osm-way-316763285",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/316763285",
      "line": "Lycee Ibn Battouta, a mapped place for the game."
    },
    {
      "key": "osm-way-232401859",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/232401859",
      "line": "Stade Moulay Rachid, a mapped place for the game."
    },
    {
      "key": "osm-node-7178769989",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7178769989",
      "line": "Ville Marocaine de Laâyoune, a mapped place for the game."
    },
    {
      "key": "osm-way-232401813",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/232401813",
      "line": "Sheikh Mohamed Laghdaf, a mapped place for the game."
    },
    {
      "key": "osm-way-1279760117",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1279760117",
      "line": "Saïd Chengriha, a mapped place for the game."
    },
    {
      "key": "osm-way-607707452",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/607707452",
      "line": "Mosquée Arraha, a mapped place for the game."
    },
    {
      "key": "osm-way-1264986401",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1264986401",
      "line": "Marché 25 Mars, a mapped place for the game."
    },
    {
      "key": "osm-node-11757225441",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/11757225441",
      "line": "uni, a mapped place for the game."
    },
    {
      "key": "osm-way-1266314236",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1266314236",
      "line": "Marché aux légumes et fruits en gros, a mapped place for the game."
    },
    {
      "key": "osm-way-1264837437",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1264837437",
      "line": "lala malika hight school, a mapped place for the game."
    },
    {
      "key": "osm-way-1463167333",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1463167333",
      "line": "Stade 84, a mapped place for the game."
    },
    {
      "key": "osm-node-11477229086",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11477229086",
      "line": "coffee shop Colombia, a mapped place for the game."
    },
    {
      "key": "osm-node-8638080418",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8638080418",
      "line": "Café Mazagan, a mapped place for the game."
    },
    {
      "key": "osm-way-1266320835",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1266320835",
      "line": "Hôpital Militaire, a mapped place for the game."
    },
    {
      "key": "osm-node-7178772089",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7178772089",
      "line": "Ville de Laâyoune, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11185624244",
      "ref": "node/11185624244",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4510208590",
      "ref": "node/4510208590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5746070070",
      "ref": "node/5746070070",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9626790374",
      "ref": "node/9626790374",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2191422596",
      "ref": "node/2191422596",
      "kind": "neighbourhood"
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
