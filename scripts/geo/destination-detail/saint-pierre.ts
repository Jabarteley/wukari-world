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
  "name": "Saint-Pierre",
  "box": [
    46.59666881006602,
    -56.44009746434139,
    46.95843058993398,
    -55.9136369356586
  ],
  "core": [
    46.73232947751651,
    -56.24250852426768,
    46.822769922483495,
    -56.111225875732316
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/220423505",
      "line": "Maison Jézéquel, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/1930750763",
      "line": "Bibliothèque-Médiathèque municipale, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/527494747",
      "line": "Hôpital de Saint-Pierre-et-Miquelon, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/220425927",
      "line": "Place Alain Savary, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/220422999",
      "line": "Église Notre-Dame-des-Marins, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/220423004",
      "line": "Ancienne Mairie de l'Ile-aux-Marins; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/40654222",
      "line": "Mairie de Saint-Pierre, a mapped place for the game."
    },
    {
      "key": "osm-node-5624753621",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5624753621",
      "line": "Belvédère, a mapped place for the game."
    },
    {
      "key": "osm-way-220420801",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/220420801",
      "line": "Arche Musée, a mapped place for the game."
    },
    {
      "key": "osm-way-220421609",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/220421609",
      "line": "Cathédrale Saint-Pierre, a mapped place for the game."
    },
    {
      "key": "osm-way-220427315",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/220427315",
      "line": "Église Sainte-Bernadette, a mapped place for the game."
    },
    {
      "key": "osm-node-4513534690",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4513534690",
      "line": "Maison et saline Morel, a mapped place for the game."
    },
    {
      "key": "osm-node-6761993666",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6761993666",
      "line": "Musée Héritage, a mapped place for the game."
    },
    {
      "key": "osm-node-6763941639",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6763941639",
      "line": "Café Solid'air, a mapped place for the game."
    },
    {
      "key": "osm-node-6762357225",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6762357225",
      "line": "Fort Lorraine, a mapped place for the game."
    },
    {
      "key": "osm-node-5624754821",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5624754821",
      "line": "Crêperie du Vieux Port, a mapped place for the game."
    },
    {
      "key": "osm-way-220421608",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/220421608",
      "line": "Square Joffre, a mapped place for the game."
    },
    {
      "key": "osm-way-1352967166",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1352967166",
      "line": "Place du Général de Gaulle, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-246842649",
      "ref": "node/246842649",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4673714434",
      "ref": "node/4673714434",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11346419513",
      "ref": "node/11346419513",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1840464700",
      "ref": "node/1840464700",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4673714433",
      "ref": "node/4673714433",
      "kind": "neighbourhood"
    },
    {
      "id": "district-492720932",
      "ref": "node/492720932",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2608601797",
      "ref": "node/2608601797",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3747511538",
      "ref": "node/3747511538",
      "kind": "neighbourhood"
    },
    {
      "id": "district-480912534",
      "ref": "node/480912534",
      "kind": "neighbourhood"
    },
    {
      "id": "district-494396224",
      "ref": "node/494396224",
      "kind": "neighbourhood"
    },
    {
      "id": "district-493910995",
      "ref": "node/493910995",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2608601793",
      "ref": "node/2608601793",
      "kind": "neighbourhood"
    },
    {
      "id": "district-492036397",
      "ref": "node/492036397",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2608601795",
      "ref": "node/2608601795",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2608601794",
      "ref": "node/2608601794",
      "kind": "neighbourhood"
    },
    {
      "id": "district-492028223",
      "ref": "node/492028223",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3747511539",
      "ref": "node/3747511539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10124766635",
      "ref": "node/10124766635",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
