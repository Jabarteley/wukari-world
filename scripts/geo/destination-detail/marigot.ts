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
  "name": "Marigot",
  "box": [
    17.885973510066023,
    -63.27406249099159,
    18.247735289933978,
    -62.89571130900841
  ],
  "core": [
    18.021634177516507,
    -63.13214403872752,
    18.112074622483494,
    -63.037629761272484
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3694768574",
      "line": "Voyage de Standing, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3983179937",
      "line": "Le Sand, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/323057986",
      "line": "Médiathèque, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/524462591",
      "line": "Hospital Louis Constant Fleming, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1335555796",
      "line": "Lili's Tropical Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/465741045",
      "line": "Centre Commercial Aventura, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/354942727",
      "line": "Église Saint-Joseph, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "way/323656342"
      },
      "ref": "way/323656342",
      "line": "Réserve Naturelle de Saint-Martin; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/257664652",
      "line": "Préfecture déléguée, a mapped place for the game."
    },
    {
      "key": "osm-node-3893659644",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3893659644",
      "line": "Babit Point, a mapped place for the game."
    },
    {
      "key": "osm-relation-9565439",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/9565439",
      "line": "Pinel Island, a mapped place for the game."
    },
    {
      "key": "osm-node-542487242",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/542487242",
      "line": "Border Monument, a mapped place for the game."
    },
    {
      "key": "osm-node-3324470538",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3324470538",
      "line": "Roche Gravée du Moho, a mapped place for the game."
    },
    {
      "key": "osm-way-399788872",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/399788872",
      "line": "Pearch Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-334678758",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/334678758",
      "line": "Le Santal, a mapped place for the game."
    },
    {
      "key": "osm-way-369607931",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/369607931",
      "line": "L'observatoire des baleines, a mapped place for the game."
    },
    {
      "key": "osm-node-3969654359",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3969654359",
      "line": "Observatoire des Oiseaux, a mapped place for the game."
    },
    {
      "key": "osm-way-366902209",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/366902209",
      "line": "Marina Royale, a mapped place for the game."
    },
    {
      "key": "osm-node-3375689678",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3375689678",
      "line": "Howell Center, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1759839533",
      "ref": "node/1759839533",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2611778003",
      "ref": "node/2611778003",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2611778000",
      "ref": "node/2611778000",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2611778001",
      "ref": "node/2611778001",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2611778002",
      "ref": "node/2611778002",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2611778004",
      "ref": "node/2611778004",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028195",
      "ref": "node/2614028195",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028201",
      "ref": "node/2614028201",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028204",
      "ref": "node/2614028204",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028207",
      "ref": "node/2614028207",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028210",
      "ref": "node/2614028210",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028212",
      "ref": "node/2614028212",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028215",
      "ref": "node/2614028215",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028218",
      "ref": "node/2614028218",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028221",
      "ref": "node/2614028221",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028224",
      "ref": "node/2614028224",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028227",
      "ref": "node/2614028227",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2614028230",
      "ref": "node/2614028230",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2314243",
      "ref": "relation/2314243",
      "kind": "water"
    },
    {
      "id": "water-relation-9204905",
      "ref": "relation/9204905",
      "kind": "water"
    },
    {
      "id": "water-relation-9208151",
      "ref": "relation/9208151",
      "kind": "water"
    }
  ],
  "profile": "microstate",
  "emptySlots": [],
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
