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
  "name": "Monaco",
  "box": [
    43.55013551006602,
    7.171569331894352,
    43.91189728993398,
    7.670349068105649
  ],
  "core": [
    43.68579617751651,
    7.358753354219005,
    43.776236622483495,
    7.4831650457809955
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/9952646938",
      "line": "Monaco - Monte Carlo, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4316767531",
      "line": "Café de Paris, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/6865960209",
      "line": "International University of Monaco, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/94252399",
      "line": "Centre Cardio Thoracique de Monaco, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/16250182",
      "line": "Fontvieille Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1106783860",
      "line": "Marché de Monte-Carlo, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/334846659",
      "line": "Église des Carmes, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/11144655",
      "line": "Casino Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/49209608",
      "line": "Palais de Justice, a mapped place for the game."
    },
    {
      "key": "osm-way-49209155",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/49209155",
      "line": "Louis II Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-5919288520",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5919288520",
      "line": "Musée des Timbres et des Monnaies, a mapped place for the game."
    },
    {
      "key": "osm-way-157719658",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/157719658",
      "line": "Japanese Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-23715051",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/23715051",
      "line": "Oceanographic Museum of Monaco, a mapped place for the game."
    },
    {
      "key": "osm-relation-13453960",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/13453960",
      "line": "New National Museum of Monaco, a mapped place for the game."
    },
    {
      "key": "osm-way-94399398",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/94399398",
      "line": "Chapelle Sainte-Dévote, a mapped place for the game."
    },
    {
      "key": "osm-way-49209644",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/49209644",
      "line": "Chapelle de la Miséricorde, a mapped place for the game."
    },
    {
      "key": "osm-node-4893574386",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4893574386",
      "line": "Le Grill, a mapped place for the game."
    },
    {
      "key": "osm-node-7857077111",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7857077111",
      "line": "Pavyllon, a mapped place for the game."
    },
    {
      "key": "osm-way-49209406",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/49209406",
      "line": "Princess Grace Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-7930513065",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/7930513065",
      "line": "Fondation Hector Ott, a mapped place for the game."
    },
    {
      "key": "osm-node-6461009225",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6461009225",
      "line": "Jardin exotique - allée louis Barral, a mapped place for the game."
    },
    {
      "key": "osm-way-201286353",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/201286353",
      "line": "Halles du marché de la Condamine, a mapped place for the game."
    },
    {
      "key": "osm-node-4354597820",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4354597820",
      "line": "Le Métropole, a mapped place for the game."
    },
    {
      "key": "osm-way-157719659",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/157719659",
      "line": "Jardins de la Petite Afrique, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1704462398",
      "ref": "node/1704462398",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1780610146",
      "ref": "node/1780610146",
      "kind": "neighbourhood"
    },
    {
      "id": "district-25258130",
      "ref": "node/25258130",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4011405437",
      "ref": "node/4011405437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4011405438",
      "ref": "node/4011405438",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4011405439",
      "ref": "node/4011405439",
      "kind": "neighbourhood"
    },
    {
      "id": "district-624452094",
      "ref": "node/624452094",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4011359438",
      "ref": "node/4011359438",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4011359439",
      "ref": "node/4011359439",
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
