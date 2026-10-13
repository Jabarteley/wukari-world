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
  "name": "Kingston",
  "box": [
    -29.237237289933976,
    167.75368143514592,
    -28.87547551006602,
    168.16546516485406
  ],
  "core": [
    -29.101576622483492,
    167.9081683165095,
    -29.011136177516505,
    168.0109782834905
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3514375769",
      "line": "SeaView, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/345690796",
      "line": "Public Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3514370471",
      "line": "Norfolk Island Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/681850439",
      "line": "Pop's Corner, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/345690804",
      "line": "Norfolk Mall, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "relation/3227220"
      },
      "ref": "relation/3227220",
      "line": "Government House; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/6385443242",
      "line": "Council Chambers, a mapped place for the game."
    },
    {
      "key": "osm-node-291675297",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/291675297",
      "line": "Mount Pitt, a mapped place for the game."
    },
    {
      "key": "osm-node-14248062703",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/14248062703",
      "line": "Kingston and Arthur's Vale Historic Area, a mapped place for the game."
    },
    {
      "key": "osm-way-671777091",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/671777091",
      "line": "The Arches, a mapped place for the game."
    },
    {
      "key": "osm-node-6385462303",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6385462303",
      "line": "Sublime Lounge Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-3514345221",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3514345221",
      "line": "Dry Waterfall, a mapped place for the game."
    },
    {
      "key": "osm-node-6385448042",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6385448042",
      "line": "Anson Coffee, a mapped place for the game."
    },
    {
      "key": "osm-way-681850758",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/681850758",
      "line": "Norfolk Island Memorial Park, a mapped place for the game."
    },
    {
      "key": "osm-node-4780829101",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4780829101",
      "line": "Arthur's Vale Viewing Platform, a mapped place for the game."
    },
    {
      "key": "osm-node-6385467662",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6385467662",
      "line": "Polynesian Settlement Site, a mapped place for the game."
    },
    {
      "key": "osm-way-681850666",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/681850666",
      "line": "Lions Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-289559361",
      "ref": "node/289559361",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559370",
      "ref": "node/289559370",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2470797094",
      "ref": "node/2470797094",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289558580",
      "ref": "node/289558580",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5653671648",
      "ref": "node/5653671648",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559086",
      "ref": "node/289559086",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5653671650",
      "ref": "node/5653671650",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289558786",
      "ref": "node/289558786",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559302",
      "ref": "node/289559302",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289558875",
      "ref": "node/289558875",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559301",
      "ref": "node/289559301",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559008",
      "ref": "node/289559008",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5653671824",
      "ref": "node/5653671824",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5653671681",
      "ref": "node/5653671681",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5653671823",
      "ref": "node/5653671823",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559152",
      "ref": "node/289559152",
      "kind": "neighbourhood"
    },
    {
      "id": "district-289559088",
      "ref": "node/289559088",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5653671683",
      "ref": "node/5653671683",
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
      "slot": "worship",
      "reason": "no unused named amenity=place_of_worship feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
