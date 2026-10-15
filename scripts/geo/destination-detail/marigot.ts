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
    18.05469920419644,
    -63.27406249099159,
    18.13595089995478,
    -62.89571130900841
  ],
  "core": [
    18.055603608646106,
    -63.0966421985842,
    18.078105191353895,
    -63.0731316014158
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
      "key": "osm-node-3276974411",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3276974411",
      "line": "Observatoire aux Oiseaux, a mapped place for the game."
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
      "key": "osm-node-3324470538",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3324470538",
      "line": "Roche Gravée du Moho, a mapped place for the game."
    },
    {
      "key": "osm-node-542412470",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/542412470",
      "line": "Fort Louis, a mapped place for the game."
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
      "key": "osm-way-330812306",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/330812306",
      "line": "Carroserie, a mapped place for the game."
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
      "key": "osm-node-14181701799",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/14181701799",
      "line": "Baie de Cul de Sac, a mapped place for the game."
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
      "id": "district-2614129124",
      "ref": "node/2614129124",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2618026389",
      "ref": "node/2618026389",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2618026390",
      "ref": "node/2618026390",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-9208151",
      "ref": "relation/9208151",
      "kind": "water"
    }
  ],
  "playAreaWithinBox": true,
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
