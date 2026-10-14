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
  "name": "Jamestown",
  "box": [
    -16.108610489933977,
    -5.90309170536018,
    -15.74684871006602,
    -5.529082694639819
  ],
  "core": [
    -15.972949822483494,
    -5.7628065109293205,
    -15.882509377516504,
    -5.669367889070679
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10591540340",
      "line": "Mantis St. Helena, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1231084281",
      "line": "General Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/455727922",
      "line": "Domaine du Pavillon des Briars, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/556912651",
      "line": "St. Paul’s Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/552579257"
      },
      "ref": "way/552579257",
      "line": "Law Courts; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/254448018",
      "line": "The Castle, a mapped place for the game."
    },
    {
      "key": "osm-node-13908472202",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/13908472202",
      "line": "Jacob's Ladder Viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-way-35798100",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/35798100",
      "line": "Longwood House, a mapped place for the game."
    },
    {
      "key": "osm-node-1568670948",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1568670948",
      "line": "High Knoll Fort, a mapped place for the game."
    },
    {
      "key": "osm-way-550478777",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/550478777",
      "line": "Plantation House, a mapped place for the game."
    },
    {
      "key": "osm-way-254448055",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/254448055",
      "line": "Saint James' Church, a mapped place for the game."
    },
    {
      "key": "osm-way-754718688",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/754718688",
      "line": "Baptist Chapel, a mapped place for the game."
    },
    {
      "key": "osm-node-11755023051",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11755023051",
      "line": "The Departures Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-552579270",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/552579270",
      "line": "Tasty Bites, a mapped place for the game."
    },
    {
      "key": "osm-way-146163203",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/146163203",
      "line": "Castle Gardens, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3970630153",
      "ref": "node/3970630153",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4254620837",
      "ref": "node/4254620837",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107639",
      "ref": "node/8397107639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107642",
      "ref": "node/8397107642",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4254616274",
      "ref": "node/4254616274",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107635",
      "ref": "node/8397107635",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107638",
      "ref": "node/8397107638",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107636",
      "ref": "node/8397107636",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107637",
      "ref": "node/8397107637",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107641",
      "ref": "node/8397107641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397106714",
      "ref": "node/8397106714",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397106715",
      "ref": "node/8397106715",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397106716",
      "ref": "node/8397106716",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397107643",
      "ref": "node/8397107643",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397133918",
      "ref": "node/8397133918",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397133917",
      "ref": "node/8397133917",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10860915893",
      "ref": "node/10860915893",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8397106713",
      "ref": "node/8397106713",
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
      "slot": "community",
      "reason": "no unused named amenity=university, college, library, community_centre or conference_centre feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
