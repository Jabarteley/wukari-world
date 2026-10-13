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
  "name": "Road Town",
  "box": [
    18.244885110066022,
    -64.81266223703753,
    18.606646889933977,
    -64.43352056296249
  ],
  "core": [
    18.380545777516506,
    -64.67044649370678,
    18.470986222483493,
    -64.57573630629324
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3363957247",
      "line": "Great Harbour Ferry Dock, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2287910830",
      "line": "Fat Hogs Bob, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/398580541",
      "line": "H. Lavity Stoutt Community College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/398620009",
      "line": "Peebles Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/4011791651",
      "line": "The Baths National Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4015267149",
      "line": "Harbour Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/399684164",
      "line": "St. Williams Catholic Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/399711084"
      },
      "ref": "way/399711084",
      "line": "Virgin Islands Supreme Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/336882327",
      "line": "Department of Motor Vehicles, a mapped place for the game."
    },
    {
      "key": "osm-node-3985384932",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3985384932",
      "line": "JR O'Neal Trail, a mapped place for the game."
    },
    {
      "key": "osm-node-4736438731",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4736438731",
      "line": "Cane Garden Beach, a mapped place for the game."
    },
    {
      "key": "osm-way-25839951",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/25839951",
      "line": "Pirates Bight, a mapped place for the game."
    },
    {
      "key": "osm-way-521988587",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/521988587",
      "line": "Cooper Island Beach Club, a mapped place for the game."
    },
    {
      "key": "osm-way-398441044",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/398441044",
      "line": "Culture Ville, a mapped place for the game."
    },
    {
      "key": "osm-node-2762140557",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2762140557",
      "line": "Swim with Dolphins, a mapped place for the game."
    },
    {
      "key": "osm-node-13623762300",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13623762300",
      "line": "Big Fig Tree, a mapped place for the game."
    },
    {
      "key": "osm-node-4653554739",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4653554739",
      "line": "Half Moon Point, a mapped place for the game."
    },
    {
      "key": "osm-node-13714339195",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13714339195",
      "line": "Island Tours & Taxi gathering, a mapped place for the game."
    },
    {
      "key": "osm-node-4014810501",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4014810501",
      "line": "Tortola Express, a mapped place for the game."
    },
    {
      "key": "osm-way-398735674",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/398735674",
      "line": "Queen Elizabeth Park, a mapped place for the game."
    },
    {
      "key": "osm-way-399518614",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/399518614",
      "line": "The Noel Lloyd Positive Action Movement Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12145164606",
      "ref": "node/12145164606",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164607",
      "ref": "node/12145164607",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164604",
      "ref": "node/12145164604",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164603",
      "ref": "node/12145164603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164608",
      "ref": "node/12145164608",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164609",
      "ref": "node/12145164609",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164602",
      "ref": "node/12145164602",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138196",
      "ref": "node/12145138196",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164601",
      "ref": "node/12145164601",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138200",
      "ref": "node/12145138200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138199",
      "ref": "node/12145138199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145164605",
      "ref": "node/12145164605",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138195",
      "ref": "node/12145138195",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138198",
      "ref": "node/12145138198",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138197",
      "ref": "node/12145138197",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138194",
      "ref": "node/12145138194",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12145138193",
      "ref": "node/12145138193",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5478634470",
      "ref": "node/5478634470",
      "kind": "neighbourhood"
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
