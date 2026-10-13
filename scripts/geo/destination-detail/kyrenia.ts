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
  "name": "Kyrenia",
  "box": [
    35.1440199555033,
    33.09978836489444,
    35.520509989933984,
    33.54126903510556
  ],
  "core": [
    35.29440887751651,
    33.26543657627874,
    35.3848493224835,
    33.375620823721256
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2012091240",
      "line": "Kyrenia Port, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1788750774",
      "line": "Patrio my Fair, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/16750860",
      "line": "Near East University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1030789769",
      "line": "Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/322104089",
      "line": "Çağlayan Parkı, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/629540154",
      "line": "Municipal Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/2017924410",
      "line": "Sourp Magar Armenian Monastery, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/697772851",
      "line": "Atatürk Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/686121404",
      "line": "Presidential Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-443934864",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/443934864",
      "line": "Cyprus International University, a mapped place for the game."
    },
    {
      "key": "osm-way-206176262",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/206176262",
      "line": "Nicosia Atatürk Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-102190298",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/102190298",
      "line": "Buffavento Castle, a mapped place for the game."
    },
    {
      "key": "osm-relation-2747685",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/2747685",
      "line": "Bellapais Abbey, a mapped place for the game."
    },
    {
      "key": "osm-node-12115453579",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12115453579",
      "line": "C1974 Memorial Ship, a mapped place for the game."
    },
    {
      "key": "osm-way-1266800351",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1266800351",
      "line": "Final International University, a mapped place for the game."
    },
    {
      "key": "osm-way-205139721",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/205139721",
      "line": "Ağa Cafer Paşa Camii, a mapped place for the game."
    },
    {
      "key": "osm-way-435833503",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/435833503",
      "line": "Agios Agridaki Church, a mapped place for the game."
    },
    {
      "key": "osm-way-169391630",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/169391630",
      "line": "Girne Amerikan Üniversitesi, a mapped place for the game."
    },
    {
      "key": "osm-node-4695087598",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4695087598",
      "line": "Gelincik Cafeterya, a mapped place for the game."
    },
    {
      "key": "osm-node-4776629726",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4776629726",
      "line": "Fota Kasap Meyhane, a mapped place for the game."
    },
    {
      "key": "osm-way-435291543",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/435291543",
      "line": "yıkım aşamasında kapalı iflas, a mapped place for the game."
    },
    {
      "key": "osm-node-4211959892",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4211959892",
      "line": "1 eğtim yeri, a mapped place for the game."
    },
    {
      "key": "osm-way-512030566",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/512030566",
      "line": "Karşıyaka Atatürk Parkı, a mapped place for the game."
    },
    {
      "key": "osm-way-956076118",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/956076118",
      "line": "Hamitköy Avrupa Birliği Parkı, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11691620489",
      "ref": "node/11691620489",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620492",
      "ref": "node/11691620492",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620493",
      "ref": "node/11691620493",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620494",
      "ref": "node/11691620494",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620495",
      "ref": "node/11691620495",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620508",
      "ref": "node/11691620508",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620510",
      "ref": "node/11691620510",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620511",
      "ref": "node/11691620511",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620512",
      "ref": "node/11691620512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11691620538",
      "ref": "node/11691620538",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11914043519",
      "ref": "node/11914043519",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11914043526",
      "ref": "node/11914043526",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11914043527",
      "ref": "node/11914043527",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11914043528",
      "ref": "node/11914043528",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11914043529",
      "ref": "node/11914043529",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11914043533",
      "ref": "node/11914043533",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12053258227",
      "ref": "node/12053258227",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12053258228",
      "ref": "node/12053258228",
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
