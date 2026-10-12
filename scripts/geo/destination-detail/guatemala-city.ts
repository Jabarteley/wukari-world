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
  "name": "Guatemala City",
  "box": [
    14.46073331006602,
    -90.69913024974917,
    14.822495089933978,
    -90.32743695025081
  ],
  "core": [
    14.596393977516504,
    -90.55971629906786,
    14.686834422483495,
    -90.46685090093213
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/697014659",
      "line": "Platinum Centro Amėrica, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/775893135",
      "line": "Hamburguesas y Pizza Berlín, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/44813033",
      "line": "Universidad de San Carlos de Guatemala, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/6486850543",
      "line": "Hospital Nacional Especializado de Villa Nueva, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/40767684",
      "line": "Centro Cultural Miguel Angel Asturias, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/49531925",
      "line": "Tikal Futura, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/41765242",
      "line": "Guatemala City Guatemala Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/25906510",
      "line": "Parque Central; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/9805188082",
      "line": "RENAP, a mapped place for the game."
    },
    {
      "key": "osm-way-48203145",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/48203145",
      "line": "Universidad del Valle de Guatemala, a mapped place for the game."
    },
    {
      "key": "osm-node-2521598858",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2521598858",
      "line": "Estadio Julio Armando Cobar, a mapped place for the game."
    },
    {
      "key": "osm-way-1098138942",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1098138942",
      "line": "Mapa en Relieve, a mapped place for the game."
    },
    {
      "key": "osm-way-665884078",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665884078",
      "line": "Estadio Cementos Progreso, a mapped place for the game."
    },
    {
      "key": "osm-way-619635959",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/619635959",
      "line": "Centra Sur, a mapped place for the game."
    },
    {
      "key": "osm-way-53417985",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/53417985",
      "line": "Estadio Guillermo Slowing, a mapped place for the game."
    },
    {
      "key": "osm-node-7431985094",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7431985094",
      "line": "CC El Frutal, a mapped place for the game."
    },
    {
      "key": "osm-way-325466184",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/325466184",
      "line": "Kaminal Juyú, a mapped place for the game."
    },
    {
      "key": "osm-way-1262950847",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1262950847",
      "line": "Universidad Rafael Landívar, a mapped place for the game."
    },
    {
      "key": "osm-way-620744754",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/620744754",
      "line": "Iglesia Cerrito del Carmen, a mapped place for the game."
    },
    {
      "key": "osm-way-405394242",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/405394242",
      "line": "Iglesia Santo Domingo, a mapped place for the game."
    },
    {
      "key": "osm-way-258156539",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/258156539",
      "line": "Museo del Ferrocarril, a mapped place for the game."
    },
    {
      "key": "osm-relation-8610992",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/8610992",
      "line": "Universidad del Istmo, a mapped place for the game."
    },
    {
      "key": "osm-node-294933619",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/294933619",
      "line": "Unidad Asistencial, a mapped place for the game."
    },
    {
      "key": "osm-node-3999620682",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3999620682",
      "line": "El Columpio, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3644888051",
      "ref": "node/3644888051",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3975059277",
      "ref": "node/3975059277",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6484689679",
      "ref": "node/6484689679",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8596352683",
      "ref": "node/8596352683",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10004905845",
      "ref": "node/10004905845",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10005308029",
      "ref": "node/10005308029",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10007447056",
      "ref": "node/10007447056",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10007464410",
      "ref": "node/10007464410",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10017379686",
      "ref": "node/10017379686",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10049694776",
      "ref": "node/10049694776",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10052472258",
      "ref": "node/10052472258",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10052472259",
      "ref": "node/10052472259",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10083845816",
      "ref": "node/10083845816",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10083860105",
      "ref": "node/10083860105",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10088022042",
      "ref": "node/10088022042",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10088031116",
      "ref": "node/10088031116",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10096740850",
      "ref": "node/10096740850",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10099441122",
      "ref": "node/10099441122",
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
