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
  "name": "Tegucigalpa",
  "box": [
    13.924932610066021,
    -87.39010126391533,
    14.286694389933979,
    -87.01930933608467
  ],
  "core": [
    14.060593277516505,
    -87.25102649194308,
    14.151033722483495,
    -87.15838410805692
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2339342433",
      "line": "Empresa Aurora, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11965383438",
      "line": "Espresso Americano, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/33918120",
      "line": "UNITEC, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/961803937",
      "line": "Hospital Escuela Universitario, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/32406022",
      "line": "Parque España, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/761273404",
      "line": "Mercado Municipal, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/373853817",
      "line": "Tegucigalpa Honduras Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8677909851",
      "line": "Municipalidad de Cantarranas; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/312607114",
      "line": "Corte Suprema de Justicia, a mapped place for the game."
    },
    {
      "key": "osm-way-33908433",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/33908433",
      "line": "Universidad Nacional Autónoma de Honduras, a mapped place for the game."
    },
    {
      "key": "osm-way-637292919",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/637292919",
      "line": "Estadio Nacional José de la Paz Herrera Uclés, a mapped place for the game."
    },
    {
      "key": "osm-way-545966016",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/545966016",
      "line": "Museo del Aire, a mapped place for the game."
    },
    {
      "key": "osm-way-421304389",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/421304389",
      "line": "Expresso Americano, a mapped place for the game."
    },
    {
      "key": "osm-node-388490985",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/388490985",
      "line": "Cristo del Picacho, a mapped place for the game."
    },
    {
      "key": "osm-way-309332039",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/309332039",
      "line": "Universidad Católica de Honduras - Campus Sagrado Corazón de Jesús, a mapped place for the game."
    },
    {
      "key": "osm-way-1203375623",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1203375623",
      "line": "Museo de Historia Republicana Villa Roy, a mapped place for the game."
    },
    {
      "key": "osm-way-406969067",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/406969067",
      "line": "Universidad Pedagógica Nacional Francisco Morazán, a mapped place for the game."
    },
    {
      "key": "osm-way-1207066140",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1207066140",
      "line": "Basílica de Nuestra Señora de Suyapa, a mapped place for the game."
    },
    {
      "key": "osm-way-132362943",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/132362943",
      "line": "Iglesia San Francisco, a mapped place for the game."
    },
    {
      "key": "osm-node-472563369",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/472563369",
      "line": "Hospital Adventista, a mapped place for the game."
    },
    {
      "key": "osm-node-3887643459",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3887643459",
      "line": "Restaurante Revilla, a mapped place for the game."
    },
    {
      "key": "osm-node-12184570445",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/12184570445",
      "line": "CODEL AMARATECA, a mapped place for the game."
    },
    {
      "key": "osm-node-12184594653",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/12184594653",
      "line": "CODEL ALDEA COFRADIA, a mapped place for the game."
    },
    {
      "key": "osm-node-11872479469",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11872479469",
      "line": "Torre, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10030734382",
      "ref": "node/10030734382",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10035286670",
      "ref": "node/10035286670",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166055280",
      "ref": "node/11166055280",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166124442",
      "ref": "node/11166124442",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166154694",
      "ref": "node/11166154694",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166168283",
      "ref": "node/11166168283",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166210907",
      "ref": "node/11166210907",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166213212",
      "ref": "node/11166213212",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166218404",
      "ref": "node/11166218404",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166253494",
      "ref": "node/11166253494",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166253953",
      "ref": "node/11166253953",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166265348",
      "ref": "node/11166265348",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11167188450",
      "ref": "node/11167188450",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11168607027",
      "ref": "node/11168607027",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11170817788",
      "ref": "node/11170817788",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11170847677",
      "ref": "node/11170847677",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11171026963",
      "ref": "node/11171026963",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11176709503",
      "ref": "node/11176709503",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-113534660",
      "ref": "way/113534660",
      "kind": "water"
    },
    {
      "id": "water-way-30318967",
      "ref": "way/30318967",
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
