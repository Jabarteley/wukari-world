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
  "name": "Hagåtña",
  "box": [
    13.293933910066022,
    144.56673042568102,
    13.65569568993398,
    144.93650777431898
  ],
  "core": [
    13.429594577516506,
    144.70542337599264,
    13.520035022483496,
    144.79781482400736
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/361386388",
      "line": "Ruby Tuesday, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/367142716",
      "line": "Nieves M Flores Memorial Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/585214438",
      "line": "Guam Memorial Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/504214572",
      "line": "Atantano Shrine, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/32524264",
      "line": "Micronesia Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1204265345",
      "line": "Yigo Guam Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/504322436",
      "line": "Asan Community Center; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/11014712827",
      "line": "NASA Guam MSFN Station (Decommisioned), a mapped place for the game."
    },
    {
      "key": "osm-way-1159666361",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1159666361",
      "line": "Paseo Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-943230481",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/943230481",
      "line": "Orote Air Field, a mapped place for the game."
    },
    {
      "key": "osm-way-611934431",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/611934431",
      "line": "Taleyfac Spanish Bridge, a mapped place for the game."
    },
    {
      "key": "osm-node-358672300",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/358672300",
      "line": "Saint Anthony Catholic Church, a mapped place for the game."
    },
    {
      "key": "osm-way-576086363",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/576086363",
      "line": "Fort Santa Agueda, a mapped place for the game."
    },
    {
      "key": "osm-way-320402586",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/320402586",
      "line": "Cathédrale du Doux-Nom-de-Marie, a mapped place for the game."
    },
    {
      "key": "osm-node-358671978",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/358671978",
      "line": "Barrigada War Memorial Park, a mapped place for the game."
    },
    {
      "key": "osm-way-606591976",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/606591976",
      "line": "Chief Quipuha Park, a mapped place for the game."
    },
    {
      "key": "osm-node-6203091886",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6203091886",
      "line": "Coco Palm Garden Beach, a mapped place for the game."
    },
    {
      "key": "osm-node-738952422",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/738952422",
      "line": "Jeff's Pirates Cove, a mapped place for the game."
    },
    {
      "key": "osm-way-547350935",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/547350935",
      "line": "Guam Regional Medical City, a mapped place for the game."
    },
    {
      "key": "osm-way-345025136",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/345025136",
      "line": "Young Pagat Market, a mapped place for the game."
    },
    {
      "key": "osm-node-3939176179",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3939176179",
      "line": "Cetti Bay Overlook, a mapped place for the game."
    },
    {
      "key": "osm-node-2133106594",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2133106594",
      "line": "Two Lovers Leap, a mapped place for the game."
    },
    {
      "key": "osm-way-256252073",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/256252073",
      "line": "Tumon Sands Plaza, a mapped place for the game."
    },
    {
      "key": "osm-node-358672212",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/358672212",
      "line": "Northern Region Community Health Center, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-5030412305",
      "ref": "node/5030412305",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5030411015",
      "ref": "node/5030411015",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5030411016",
      "ref": "node/5030411016",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5030412443",
      "ref": "node/5030412443",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4113352789",
      "ref": "node/4113352789",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5030411017",
      "ref": "node/5030411017",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12412134451",
      "ref": "node/12412134451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12412160689",
      "ref": "node/12412160689",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12874532088",
      "ref": "node/12874532088",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-34945059",
      "ref": "way/34945059",
      "kind": "water"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
