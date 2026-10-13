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
  "name": "Pago Pago",
  "box": [
    -14.456359489933979,
    -170.89036648516475,
    -14.09459771006602,
    -170.51929311483525
  ],
  "core": [
    -14.320698822483495,
    -170.7511858050069,
    -14.230258377516504,
    -170.65847379499309
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1235134005",
      "line": "Sweetie's, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/123454235",
      "line": "American Samoa Community College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/585450401",
      "line": "Lyndon Baines Johnson Tropical Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/359258660",
      "line": "Pago Pago Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/107474782",
      "line": "Fagatogo Market, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/332359599"
      },
      "ref": "way/332359599",
      "line": "Courthouse of American Samoa; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/8285563450",
      "line": "American Samoa Fono, a mapped place for the game."
    },
    {
      "key": "osm-way-253635520",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/253635520",
      "line": "Veterans Memorial Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-9049560467",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9049560467",
      "line": "Poloa Defensive Fortifications, a mapped place for the game."
    },
    {
      "key": "osm-node-9049637848",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9049637848",
      "line": "Masefau Defensive Fortifications, a mapped place for the game."
    },
    {
      "key": "osm-node-9049560470",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9049560470",
      "line": "Fagalele Boys School, a mapped place for the game."
    },
    {
      "key": "osm-node-359258592",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/359258592",
      "line": "Gagamoe Field, a mapped place for the game."
    },
    {
      "key": "osm-node-3844905202",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3844905202",
      "line": "Tisa's Barefoot Bar, a mapped place for the game."
    },
    {
      "key": "osm-node-4791141236",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4791141236",
      "line": "Internet Café, a mapped place for the game."
    },
    {
      "key": "osm-way-1205108937",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1205108937",
      "line": "Utulei Beach Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1974152079",
      "ref": "node/1974152079",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4064913189",
      "ref": "node/4064913189",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12857195283",
      "ref": "node/12857195283",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4433463613",
      "ref": "node/4433463613",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2335566675",
      "ref": "node/2335566675",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2335555990",
      "ref": "node/2335555990",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2335518602",
      "ref": "node/2335518602",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2335518566",
      "ref": "node/2335518566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600172902",
      "ref": "node/8600172902",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2335518590",
      "ref": "node/2335518590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600089270",
      "ref": "node/8600089270",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600089271",
      "ref": "node/8600089271",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600172903",
      "ref": "node/8600172903",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600172906",
      "ref": "node/8600172906",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600172905",
      "ref": "node/8600172905",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2335518609",
      "ref": "node/2335518609",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600172904",
      "ref": "node/8600172904",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8600172907",
      "ref": "node/8600172907",
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
