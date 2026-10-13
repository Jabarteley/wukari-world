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
  "name": "Funafuti",
  "box": [
    -8.70084418993398,
    179.01650087872326,
    -8.339082410066021,
    179.38000872127674
  ],
  "core": [
    -8.565183522483496,
    179.152832650996,
    -8.474743077516505,
    179.243676949004
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6950273685",
      "line": "Fast Food Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1559314434",
      "line": "MUSTER STATION/PARADE GROUNDS, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/651129681",
      "line": "Princess Margaret Hospital, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/133496185",
      "line": "Teone Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "way/136839527"
      },
      "ref": "way/136839527",
      "line": "Partnership House; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/7456977",
      "line": "Government of Tuvalu, a mapped place for the game."
    },
    {
      "key": "osm-node-13987101601",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13987101601",
      "line": "Conservation Area Tour Office, a mapped place for the game."
    },
    {
      "key": "osm-way-136840917",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/136840917",
      "line": "Ahmadiyya Tuvalu Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-13332937401",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13332937401",
      "line": "3 Ts Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-12470543601",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12470543601",
      "line": "Joy Seafood Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-13987101501",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13987101501",
      "line": "David's Drill (Royal Society Scientific Expedition 1896), a mapped place for the game."
    },
    {
      "key": "osm-way-1560044520",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1560044520",
      "line": "SICKBAY, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2989284034",
      "ref": "node/2989284034",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2989284037",
      "ref": "node/2989284037",
      "kind": "neighbourhood"
    },
    {
      "id": "district-649015243",
      "ref": "node/649015243",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2989284035",
      "ref": "node/2989284035",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2989284036",
      "ref": "node/2989284036",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13917477070",
      "ref": "node/13917477070",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13917480836",
      "ref": "node/13917480836",
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
      "slot": "recreation",
      "reason": "no unused named leisure=park, or the audited fallbacks (garden, stadium, sports_centre, pitch, nature_reserve, playground) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
