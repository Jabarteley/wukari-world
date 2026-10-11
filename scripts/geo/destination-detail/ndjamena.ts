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
  "name": "N'Djamena",
  "box": [
    11.93827341006602,
    14.866392607896925,
    12.300035189933979,
    15.234158992103074
  ],
  "core": [
    12.073934077516505,
    15.00432859336466,
    12.164374522483495,
    15.09622300663534
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/3134981852",
      "line": "Gare d'Abeché, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "node/3997990146",
      "line": "Maquis d'à côté, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "way/438541531",
      "line": "Institut AVD, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "way/679766331",
      "line": "Centre de santé de Ndjamena-Koudou, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "relation/2813502",
      "line": "Jardin Botanique, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "node/4335243174",
      "line": "Marché a betail, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/125359481",
      "line": "Cathédrale Notre-Dame de N'Djaména, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "node/10826298705",
      "line": "Commune du 7ème Arrondissement LA MAIRIE; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "node/4108575389",
      "line": "Centre de détention, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-node-11176434237",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/11176434237",
      "line": "Complexe Abou Hourayra, a mapped place for the game."
    },
    {
      "key": "osm-way-1415633322",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1415633322",
      "line": "Stade Olympique Maréchal Idriss Déby Itno, a mapped place for the game."
    },
    {
      "key": "osm-way-199599925",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/199599925",
      "line": "musée national du Tchad, a mapped place for the game."
    },
    {
      "key": "osm-node-4502748090",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4502748090",
      "line": "Parc de jeux, a mapped place for the game."
    },
    {
      "key": "osm-node-8652966419",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8652966419",
      "line": "Khassam, a mapped place for the game."
    },
    {
      "key": "osm-node-7174815188",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7174815188",
      "line": "Ferme David Durant, a mapped place for the game."
    },
    {
      "key": "osm-node-12350268725",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/12350268725",
      "line": "Académie Royale, a mapped place for the game."
    },
    {
      "key": "osm-node-13208665829",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/13208665829",
      "line": "hopital de toukra, a mapped place for the game."
    },
    {
      "key": "osm-node-4146090928",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4146090928",
      "line": "La caravelle, a mapped place for the game."
    },
    {
      "key": "osm-node-11135875905",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/11135875905",
      "line": "Centre de santé revitalise de Goudji, a mapped place for the game."
    },
    {
      "key": "osm-node-4108051090",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4108051090",
      "line": "مسجد Mosquée, a mapped place for the game."
    },
    {
      "key": "osm-way-1451346354",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1451346354",
      "line": "Marché de Wara, a mapped place for the game."
    },
    {
      "key": "osm-way-156565063",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/156565063",
      "line": "Marché a Mil, a mapped place for the game."
    },
    {
      "key": "osm-way-1066128727",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1066128727",
      "line": "parc du marche Koweïtien, a mapped place for the game."
    },
    {
      "key": "osm-way-678864284",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/678864284",
      "line": "Université virtuelle du Tchad, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12761916451",
      "ref": "node/12761916451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12970285341",
      "ref": "node/12970285341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13110365319",
      "ref": "node/13110365319",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13130571339",
      "ref": "node/13130571339",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248455",
      "ref": "node/4409248455",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248456",
      "ref": "node/4409248456",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248457",
      "ref": "node/4409248457",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248458",
      "ref": "node/4409248458",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248459",
      "ref": "node/4409248459",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248460",
      "ref": "node/4409248460",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248461",
      "ref": "node/4409248461",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248462",
      "ref": "node/4409248462",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248463",
      "ref": "node/4409248463",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4409248464",
      "ref": "node/4409248464",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4419542599",
      "ref": "node/4419542599",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4419542600",
      "ref": "node/4419542600",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4419542601",
      "ref": "node/4419542601",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4419542602",
      "ref": "node/4419542602",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
