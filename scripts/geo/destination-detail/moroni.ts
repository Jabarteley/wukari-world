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
  "name": "Moroni",
  "box": [
    -11.884911489933979,
    43.068311021747114,
    -11.52314971006602,
    43.43550697825288
  ],
  "core": [
    -11.749250822483495,
    43.2060322375229,
    -11.658810377516504,
    43.2977857624771
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4002400944",
      "line": "Gare du Nord, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2716274465",
      "line": "le voyageur, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/4109090605",
      "line": "bibliothèque, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/370308263",
      "line": "Centre de santé de Mitsoudjé, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1423001401",
      "line": "Ancien terrain de foot, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1426824415",
      "line": "2éme marché, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/432094417",
      "line": "Ancienne Mosquée du Vendredi, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/405414129",
      "line": "Hotel de Ville Bambao Ya djou; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/437275265",
      "line": "Marché de Bangoi, a mapped place for the game."
    },
    {
      "key": "osm-way-392920702",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/392920702",
      "line": "Université des Comores, Faculté des Lettres et Sciences Humaines, a mapped place for the game."
    },
    {
      "key": "osm-way-646081451",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/646081451",
      "line": "Stade Olympique DeIkoni-Malouzini, a mapped place for the game."
    },
    {
      "key": "osm-node-6360028085",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6360028085",
      "line": "End of the 4x4 road (1580 m), a mapped place for the game."
    },
    {
      "key": "osm-node-8804811617",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8804811617",
      "line": "Chez Bruno, a mapped place for the game."
    },
    {
      "key": "osm-node-4784675163",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4784675163",
      "line": "Karthala Crater Viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-way-390008871",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/390008871",
      "line": "Plais Trambwe, a mapped place for the game."
    },
    {
      "key": "osm-way-452194135",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/452194135",
      "line": "zainaba said, a mapped place for the game."
    },
    {
      "key": "osm-node-13885184807",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/13885184807",
      "line": "Marché de Boeni Bambao, a mapped place for the game."
    },
    {
      "key": "osm-way-1430217861",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1430217861",
      "line": "marché public, a mapped place for the game."
    },
    {
      "key": "osm-way-1426392579",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1426392579",
      "line": "Poste de Santé, a mapped place for the game."
    },
    {
      "key": "osm-node-12222798279",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12222798279",
      "line": "Restau Maman Choureik, a mapped place for the game."
    },
    {
      "key": "osm-node-13076688783",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/13076688783",
      "line": "Stade Omni Sport, a mapped place for the game."
    },
    {
      "key": "osm-way-485209014",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/485209014",
      "line": "Université des Comores, Direction et Administration, a mapped place for the game."
    },
    {
      "key": "osm-way-397444369",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/397444369",
      "line": "Université des Comores, Faculté des Sciences et Technologies, a mapped place for the game."
    },
    {
      "key": "osm-node-6360018986",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6360018986",
      "line": "Starting Point Road to Karthala (380 m), a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-13200931248",
      "ref": "node/13200931248",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13200931249",
      "ref": "node/13200931249",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13200931250",
      "ref": "node/13200931250",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4294765231",
      "ref": "node/4294765231",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077732",
      "ref": "node/4942077732",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077733",
      "ref": "node/4942077733",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077734",
      "ref": "node/4942077734",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077735",
      "ref": "node/4942077735",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077736",
      "ref": "node/4942077736",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077737",
      "ref": "node/4942077737",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077738",
      "ref": "node/4942077738",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077739",
      "ref": "node/4942077739",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077740",
      "ref": "node/4942077740",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077741",
      "ref": "node/4942077741",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077742",
      "ref": "node/4942077742",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077743",
      "ref": "node/4942077743",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077744",
      "ref": "node/4942077744",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4942077745",
      "ref": "node/4942077745",
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
