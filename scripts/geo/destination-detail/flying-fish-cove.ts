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
  "name": "Flying Fish Cove",
  "box": [
    -10.602215289933978,
    105.49163034263032,
    -10.24045351006602,
    105.85719565736969
  ],
  "core": [
    -10.466554622483494,
    105.62873745112485,
    -10.376114177516504,
    105.72008854887515
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4160092424",
      "line": "Flying Fish Cove, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4721188139",
      "line": "Rumah Tinggi, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3751248046",
      "line": "Christmas Island Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/747451092",
      "line": "Drumsite Park, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/661594160",
      "line": "Goddess of Mercy Temple, a mapped place for the game."
    },
    {
      "key": "osm-node-6473626309",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6473626309",
      "line": "Martin Point Lookout, a mapped place for the game."
    },
    {
      "key": "osm-node-4551940689",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4551940689",
      "line": "Tai Jin House, a mapped place for the game."
    },
    {
      "key": "osm-node-4160092423",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4160092423",
      "line": "Phosphate Mining Company Abandoned Railway, a mapped place for the game."
    },
    {
      "key": "osm-node-4551931090",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4551931090",
      "line": "Pink House Research Station, a mapped place for the game."
    },
    {
      "key": "osm-node-4551940189",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4551940189",
      "line": "LB4 look out, a mapped place for the game."
    },
    {
      "key": "osm-node-4551940589",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4551940589",
      "line": "Margaret Knoll, a mapped place for the game."
    },
    {
      "key": "osm-node-11529873274",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11529873274",
      "line": "Island Alchemy Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-438454016",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/438454016",
      "line": "Le Cla, a mapped place for the game."
    },
    {
      "key": "osm-way-1550247964",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1550247964",
      "line": "Poon Saan Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2119420175",
      "ref": "node/2119420175",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2119420254",
      "ref": "node/2119420254",
      "kind": "neighbourhood"
    },
    {
      "id": "district-358668254",
      "ref": "node/358668254",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2119420171",
      "ref": "node/2119420171",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "community",
      "reason": "no unused named amenity=university, college, library, community_centre or conference_centre feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "polling",
      "reason": "no unused named place=square, amenity=townhall, or the audited fallbacks (courthouse, office=government, building=government, building=public, community_centre) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "government",
      "reason": "no unused named amenity=townhall, courthouse or parliament, office=government or building=government feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
