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
  "name": "Stanley",
  "box": [
    -51.87394248993398,
    -58.147526081988616,
    -51.51218071006602,
    -57.56552391801138
  ],
  "core": [
    -51.73828182248349,
    -57.92905665721613,
    -51.64784137751651,
    -57.783993342783866
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1822389348",
      "line": "Tasty Treat Bakery, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/4743397596",
      "line": "Christie Community Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/210255821",
      "line": "King Edward Memorial Hospital, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/209294648",
      "line": "Saint Mary's Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/394209968",
      "line": "Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/211749548",
      "line": "Gilbert House, a mapped place for the game."
    },
    {
      "key": "osm-way-942254769",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/942254769",
      "line": "Falkland College, a mapped place for the game."
    },
    {
      "key": "osm-node-1791574651",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1791574651",
      "line": "Cape Pembroke, a mapped place for the game."
    },
    {
      "key": "osm-node-9563237706",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9563237706",
      "line": "Moody Brook Barracks, a mapped place for the game."
    },
    {
      "key": "osm-way-209298805",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/209298805",
      "line": "Falkland Islands Museum and National Trust, a mapped place for the game."
    },
    {
      "key": "osm-way-168220217",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/168220217",
      "line": "Christ Church Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-135001622",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/135001622",
      "line": "1982 Liberation Memorial, a mapped place for the game."
    },
    {
      "key": "osm-node-10095786051",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10095786051",
      "line": "Sea Cabbage Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-323534124",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/323534124",
      "line": "Cafe, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-139145015",
      "ref": "node/139145015",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4366263936",
      "ref": "node/4366263936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9563237706",
      "ref": "node/9563237706",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1791574651",
      "ref": "node/1791574651",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4522412350",
      "ref": "node/4522412350",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4676949101",
      "ref": "node/4676949101",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4371231453",
      "ref": "node/4371231453",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10837322511",
      "ref": "node/10837322511",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10095632075",
      "ref": "node/10095632075",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10174370011",
      "ref": "node/10174370011",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11634549405",
      "ref": "node/11634549405",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4376437126",
      "ref": "node/4376437126",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4652906517",
      "ref": "node/4652906517",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4564866409",
      "ref": "node/4564866409",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4511295230",
      "ref": "node/4511295230",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4661179767",
      "ref": "node/4661179767",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4652884728",
      "ref": "node/4652884728",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4658193515",
      "ref": "node/4658193515",
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
