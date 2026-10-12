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
  "name": "Victoria",
  "box": [
    -4.804089389933978,
    55.272063365586185,
    -4.442327610066021,
    55.63265463441382
  ],
  "core": [
    -4.668428722483494,
    55.4072939327296,
    -4.577988277516505,
    55.4974240672704
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/770076850",
      "line": "Port Launay Turning Point, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/391846396",
      "line": "Anchor Cafe, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/363504575",
      "line": "University of Seychelles, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4397223784",
      "line": "Euromedical Family Clinic (Providence branch), a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/466330196",
      "line": "Parc de la Paix, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/616299522",
      "line": "Enjoy Supermarket, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/518099006",
      "line": "Cathédrale Saint-Paul, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/458812934",
      "line": "Beau Vallon District Administration; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4176627383",
      "line": "State House, a mapped place for the game."
    },
    {
      "key": "osm-node-9694888508",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9694888508",
      "line": "Basen Diri, a mapped place for the game."
    },
    {
      "key": "osm-node-769201090",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/769201090",
      "line": "Seychelles Youth Village, a mapped place for the game."
    },
    {
      "key": "osm-node-2387375448",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2387375448",
      "line": "Venn's Town, a mapped place for the game."
    },
    {
      "key": "osm-node-1198043911",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1198043911",
      "line": "Cascade Sauzier, a mapped place for the game."
    },
    {
      "key": "osm-way-616378214",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/616378214",
      "line": "Cathédrale de l'Immaculée Conception, a mapped place for the game."
    },
    {
      "key": "osm-way-1017469211",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1017469211",
      "line": "Lorizon, a mapped place for the game."
    },
    {
      "key": "osm-node-9454112784",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9454112784",
      "line": "Point de vue Sainte-Anne, a mapped place for the game."
    },
    {
      "key": "osm-relation-8526443",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/8526443",
      "line": "Centre de Santé d'Anse Boileau, a mapped place for the game."
    },
    {
      "key": "osm-node-10223564817",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10223564817",
      "line": "Green House, a mapped place for the game."
    },
    {
      "key": "osm-node-3092794671",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3092794671",
      "line": "Eureka Specialist Medical Clinic, a mapped place for the game."
    },
    {
      "key": "osm-node-8757739017",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/8757739017",
      "line": "Красивый вид на залив, a mapped place for the game."
    },
    {
      "key": "osm-way-276438928",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/276438928",
      "line": "Eden plaza, a mapped place for the game."
    },
    {
      "key": "osm-node-4547496634",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4547496634",
      "line": "STC Hypermarket, a mapped place for the game."
    },
    {
      "key": "osm-way-504513920",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/504513920",
      "line": "Parc Bazar Victoria, a mapped place for the game."
    },
    {
      "key": "osm-way-699263049",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/699263049",
      "line": "Parc Éden, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1422540559",
      "ref": "node/1422540559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-533796691",
      "ref": "node/533796691",
      "kind": "neighbourhood"
    },
    {
      "id": "district-533796695",
      "ref": "node/533796695",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533035",
      "ref": "node/1422533035",
      "kind": "neighbourhood"
    },
    {
      "id": "district-769270461",
      "ref": "node/769270461",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422537317",
      "ref": "node/1422537317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422537316",
      "ref": "node/1422537316",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422537315",
      "ref": "node/1422537315",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533029",
      "ref": "node/1422533029",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422537318",
      "ref": "node/1422537318",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533022",
      "ref": "node/1422533022",
      "kind": "neighbourhood"
    },
    {
      "id": "district-533796698",
      "ref": "node/533796698",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533036",
      "ref": "node/1422533036",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1413601065",
      "ref": "node/1413601065",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533024",
      "ref": "node/1422533024",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533023",
      "ref": "node/1422533023",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533020",
      "ref": "node/1422533020",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1422533030",
      "ref": "node/1422533030",
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
