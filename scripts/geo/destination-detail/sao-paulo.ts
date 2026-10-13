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
  "name": "São Paulo",
  "box": [
    -23.731531589933976,
    -46.82963992592198,
    -23.36976981006602,
    -46.43712487407802
  ],
  "core": [
    -23.595870922483492,
    -46.68239590011482,
    -23.505430477516505,
    -46.584368899885185
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/605663613",
      "line": "Vila Madalena, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3190899581",
      "line": "Ragazzo, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/5140286031",
      "line": "Instituto Martius-Staden, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/198297951",
      "line": "Hospital e Maternidade São Cristóvão, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/5110800",
      "line": "Recanto Municipal da Árvore - Bosque Maia, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/425971603",
      "line": "Mercado Central de Osasco Walter Edson de Abreu, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1499108656",
      "line": "Basílica Menor Nossa Senhora do Rosário, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/299599250",
      "line": "Subprefeitura Jabaquara; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/486885422",
      "line": "Prefeitura Regional de Perus, a mapped place for the game."
    },
    {
      "key": "osm-way-1082441931",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1082441931",
      "line": "UNINOVE - Campus São Bernardo do Campo, a mapped place for the game."
    },
    {
      "key": "osm-way-218678632",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/218678632",
      "line": "Neo Química Arena, a mapped place for the game."
    },
    {
      "key": "osm-relation-6711205",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/6711205",
      "line": "Museum of Sacred Art of São Paulo, a mapped place for the game."
    },
    {
      "key": "osm-way-547462224",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/547462224",
      "line": "Parque Ecológico Guapituba, a mapped place for the game."
    },
    {
      "key": "osm-way-243738993",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/243738993",
      "line": "Parque Rodrigo de Gasperi, a mapped place for the game."
    },
    {
      "key": "osm-node-5890753625",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5890753625",
      "line": "Capela de São Miguel Paulista, a mapped place for the game."
    },
    {
      "key": "osm-node-5602604506",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5602604506",
      "line": "Museu Florestal Octávio Vecchi, a mapped place for the game."
    },
    {
      "key": "osm-way-276636672",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/276636672",
      "line": "Escola Superior de Propaganda e Marketing ESPM, a mapped place for the game."
    },
    {
      "key": "osm-node-6732845827",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6732845827",
      "line": "Igreja de Nossa Senhora da Penha, a mapped place for the game."
    },
    {
      "key": "osm-way-158967597",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/158967597",
      "line": "Faculdade de Medicina Veterinária e Zootecnia, a mapped place for the game."
    },
    {
      "key": "osm-node-4732250495",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4732250495",
      "line": "Parque da Mônica, a mapped place for the game."
    },
    {
      "key": "osm-way-196866078",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/196866078",
      "line": "Estádio Municipal Anacleto Campanella, a mapped place for the game."
    },
    {
      "key": "osm-way-1251674385",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1251674385",
      "line": "Casa VilaNova Artigas, a mapped place for the game."
    },
    {
      "key": "osm-way-455336051",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/455336051",
      "line": "Hospital Heliópolis, a mapped place for the game."
    },
    {
      "key": "osm-way-75490092",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/75490092",
      "line": "Albert Einstein Israelite Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1000297670",
      "ref": "node/1000297670",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11033412771",
      "ref": "node/11033412771",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11033584793",
      "ref": "node/11033584793",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128941048",
      "ref": "node/11128941048",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975324",
      "ref": "node/11128975324",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975326",
      "ref": "node/11128975326",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975327",
      "ref": "node/11128975327",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975328",
      "ref": "node/11128975328",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975336",
      "ref": "node/11128975336",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975337",
      "ref": "node/11128975337",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11128975338",
      "ref": "node/11128975338",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11880166656",
      "ref": "node/11880166656",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11880166657",
      "ref": "node/11880166657",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12992960545",
      "ref": "node/12992960545",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13043512236",
      "ref": "node/13043512236",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13043556693",
      "ref": "node/13043556693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1610605045",
      "ref": "node/1610605045",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1610612161",
      "ref": "node/1610612161",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-126251707",
      "ref": "way/126251707",
      "kind": "water"
    },
    {
      "id": "water-way-153360180",
      "ref": "way/153360180",
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
