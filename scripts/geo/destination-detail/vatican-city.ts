import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, coastWaterQuery } from './queries.ts'

export const CONFIG = {
...{
  "cell": 0.004,
  "grow": 2,
  "split": 12,
  "shore": 0,
  "minHole": 40,
  "minRoadKm": 0.2,
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
  "name": "Vatican City",
  "box": [
    41.72261031006602,
    12.210754277159126,
    42.08437208993398,
    12.694915522840873
  ],
  "core": [
    41.858270977516504,
    12.392443705225482,
    41.94871142248349,
    12.513226094774517
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2015144901",
      "line": "Vatican City, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1016871040",
      "line": "Bistròt La Pigna, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/30161132",
      "line": "Pontifical Ethiopian College, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/120654784",
      "line": "French Garden, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/215302734",
      "line": "Pauline Chapel, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/10044166",
      "line": "Saint Peter's Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/2616072088",
      "line": "Financial Information Authority, a mapped place for the game."
    },
    {
      "key": "osm-node-5108555139",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5108555139",
      "line": "Dome of Saint Peter, a mapped place for the game."
    },
    {
      "key": "osm-way-44402133",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/44402133",
      "line": "Pius IV House, a mapped place for the game."
    },
    {
      "key": "osm-way-111996197",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/111996197",
      "line": "Saint Peregrin's Church, a mapped place for the game."
    },
    {
      "key": "osm-way-112137587",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/112137587",
      "line": "Vatican Museums, a mapped place for the game."
    },
    {
      "key": "osm-node-10774102205",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10774102205",
      "line": "Galleria delle Carte Geografiche, a mapped place for the game."
    },
    {
      "key": "osm-way-111699749",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/111699749",
      "line": "Saints Martin and Sebastian of the Swiss, a mapped place for the game."
    },
    {
      "key": "osm-node-5737556419",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5737556419",
      "line": "Caffè delle carrozze, a mapped place for the game."
    },
    {
      "key": "osm-node-1272283718",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1272283718",
      "line": "Punto panoramico di viale della Galea, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-424311883",
      "ref": "node/424311883",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13020223521",
      "ref": "node/13020223521",
      "kind": "neighbourhood"
    },
    {
      "id": "district-135747106",
      "ref": "way/135747106",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10044166",
      "ref": "relation/10044166",
      "kind": "neighbourhood"
    },
    {
      "id": "district-388852949",
      "ref": "way/388852949",
      "kind": "neighbourhood"
    },
    {
      "id": "district-604750626",
      "ref": "way/604750626",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-15800929",
      "ref": "way/15800929",
      "kind": "water"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "clinic",
      "reason": "no unused named amenity=hospital or amenity=clinic feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
