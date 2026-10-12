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
  "name": "Malabo",
  "box": [
    3.5609961100660215,
    8.593982161081565,
    3.922757889933979,
    8.954150438918434
  ],
  "core": [
    3.6966567775165053,
    8.729052447544005,
    3.787097222483495,
    8.819080152455994
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4872455415",
      "line": "Puerto de Malabo, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3151789258",
      "line": "Equatore Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/276917529",
      "line": "Université nationale de Guinée équatoriale, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/678133924",
      "line": "Hospital de Sampaka, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/654502236",
      "line": "Malabo National Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/8442109718",
      "line": "VENTAGE, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/273891106",
      "line": "Cathédrale Sainte-Élisabeth, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/307509417",
      "line": "Ayuntamiento de Rebola; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/282840658",
      "line": "Senate of the Republic of Equatorial Guinea, a mapped place for the game."
    },
    {
      "key": "osm-way-1364477067",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1364477067",
      "line": "Campus Universitario de Basupu, a mapped place for the game."
    },
    {
      "key": "osm-way-347366427",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/347366427",
      "line": "Estadio de Malabo, a mapped place for the game."
    },
    {
      "key": "osm-node-5670102933",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5670102933",
      "line": "Trailhead, a mapped place for the game."
    },
    {
      "key": "osm-node-4638964990",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4638964990",
      "line": "ECG Fabrication Yard, a mapped place for the game."
    },
    {
      "key": "osm-way-272208994",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/272208994",
      "line": "La Paz Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-node-9970815565",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9970815565",
      "line": "Salón del Reino de los Testigos de Jehová, a mapped place for the game."
    },
    {
      "key": "osm-way-678128961",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/678128961",
      "line": "Colegio María Cano, a mapped place for the game."
    },
    {
      "key": "osm-way-363635642",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/363635642",
      "line": "Plaza de San Fernando, a mapped place for the game."
    },
    {
      "key": "osm-node-3299210014",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3299210014",
      "line": "Gran Reserva, a mapped place for the game."
    },
    {
      "key": "osm-node-5909941285",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5909941285",
      "line": "Finca Sampaka, a mapped place for the game."
    },
    {
      "key": "osm-node-9195927549",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/9195927549",
      "line": "Centro Comercial Tomos, a mapped place for the game."
    },
    {
      "key": "osm-node-9554184978",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9554184978",
      "line": "Cafetería Muankaba, a mapped place for the game."
    },
    {
      "key": "osm-way-638398364",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/638398364",
      "line": "Parque de Alcaide, a mapped place for the game."
    },
    {
      "key": "osm-node-14180562901",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/14180562901",
      "line": "Semu, a mapped place for the game."
    },
    {
      "key": "osm-way-678125725",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/678125725",
      "line": "Estadio Pablo Boyas, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11137498288",
      "ref": "node/11137498288",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11617741961",
      "ref": "node/11617741961",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12134018603",
      "ref": "node/12134018603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12134018604",
      "ref": "node/12134018604",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3144381629",
      "ref": "node/3144381629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3804151914",
      "ref": "node/3804151914",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3804151918",
      "ref": "node/3804151918",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3804151924",
      "ref": "node/3804151924",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6130222086",
      "ref": "node/6130222086",
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
