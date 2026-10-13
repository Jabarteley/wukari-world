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
  "name": "Avarua",
  "box": [
    -21.388354489933977,
    -159.96376526193234,
    -21.026592710066023,
    -159.57786373806766
  ],
  "core": [
    -21.252693822483494,
    -159.81900763388916,
    -21.162253377516507,
    -159.72262136611084
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2171160885",
      "line": "Cook's Corner Bus Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13521835939",
      "line": "Cafe Puretu, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/207000207",
      "line": "Takamoa Theological College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/198974940",
      "line": "Rarotonga Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/901216183",
      "line": "Raemaru Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2936558679",
      "line": "Muri Night Market, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "way/207000165"
      },
      "ref": "way/207000165",
      "line": "Parliament of the Cook Islands; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4682743570",
      "line": "Infrastructure Cook Islands, a mapped place for the game."
    },
    {
      "key": "osm-way-1079320783",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1079320783",
      "line": "Cook Islands Tertiary and Training Institute Faculty of Hospitality and Services, a mapped place for the game."
    },
    {
      "key": "osm-way-201214783",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/201214783",
      "line": "BCI Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-6324434485",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6324434485",
      "line": "National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-1079412410",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1079412410",
      "line": "Muri Lagoon, a mapped place for the game."
    },
    {
      "key": "osm-node-12237139801",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12237139801",
      "line": "The Circles Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-2111683565",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2111683565",
      "line": "Clear View, a mapped place for the game."
    },
    {
      "key": "osm-node-2187931298",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2187931298",
      "line": "Kaena, a mapped place for the game."
    },
    {
      "key": "osm-node-2148100832",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2148100832",
      "line": "Good View of Needle, a mapped place for the game."
    },
    {
      "key": "osm-node-2100754933",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2100754933",
      "line": "Whale and Wildlife Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-593816781",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/593816781",
      "line": "CTIC Building Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-1081629061",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1081629061",
      "line": "Nikao Social Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-196945531",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/196945531",
      "line": "Punanga Nui Market, a mapped place for the game."
    },
    {
      "key": "osm-way-598519609",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/598519609",
      "line": "University of Southern Pacific, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-8641790446",
      "ref": "node/8641790446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8641790453",
      "ref": "node/8641790453",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8641790452",
      "ref": "node/8641790452",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8641790448",
      "ref": "node/8641790448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8641790450",
      "ref": "node/8641790450",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8641790447",
      "ref": "node/8641790447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9896674247",
      "ref": "node/9896674247",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8641790451",
      "ref": "node/8641790451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9896674246",
      "ref": "node/9896674246",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9913290707",
      "ref": "node/9913290707",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9913290706",
      "ref": "node/9913290706",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9913290705",
      "ref": "node/9913290705",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9913290704",
      "ref": "node/9913290704",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8372062475",
      "ref": "node/8372062475",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
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
