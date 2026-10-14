import type { DetailConfig } from './config.ts'
import { profilePlacesQuery, profileExtrasQuery, civilLanduseQuery, ladderRoadsQuery, coastWaterQuery } from './queries.ts'

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
  "name": "Adamstown",
  "box": [
    -25.111887222483492,
    -130.1498091000751,
    -25.021446777516505,
    -130.0506008999249
  ],
  "core": [
    -25.093799133490094,
    -130.12996305843575,
    -25.039534866509904,
    -130.07044694156423
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/9392374700",
      "line": "Pitcairn, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7320730513",
      "line": "Andy's Pizzeria, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "node/8754381330"
      },
      "ref": "node/8754381330",
      "line": "Pitcairne Courthouse; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/6060119375",
      "line": "Secretary's Office, a mapped place for the game."
    },
    {
      "key": "osm-node-1196324630",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1196324630",
      "line": "Polynesian Petroglyphs, a mapped place for the game."
    },
    {
      "key": "osm-node-7034086618",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7034086618",
      "line": "Longboat, a mapped place for the game."
    },
    {
      "key": "osm-node-14080325436",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/14080325436",
      "line": "Memorial plaque HMS Bounty, a mapped place for the game."
    },
    {
      "key": "osm-node-6982653163",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6982653163",
      "line": "The Whale's Tooth Tavern, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2134592841",
      "ref": "node/2134592841",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14080314424",
      "ref": "node/14080314424",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4238254229",
      "ref": "node/4238254229",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4238254228",
      "ref": "node/4238254228",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4238254231",
      "ref": "node/4238254231",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4238254230",
      "ref": "node/4238254230",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14080338222",
      "ref": "node/14080338222",
      "kind": "neighbourhood"
    }
  ],
  "profile": "outpost",
  "emptySlots": [
    {
      "slot": "community",
      "reason": "no unused named amenity=university, college, library, community_centre or conference_centre (or office=research or amenity=research_institute) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "clinic",
      "reason": "no unused named amenity=hospital or amenity=clinic feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "recreation",
      "reason": "no unused named leisure=park, or the audited fallbacks (garden, stadium, sports_centre, pitch, nature_reserve, playground) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
discovery: (bbox: string) => ({ places: profilePlacesQuery(bbox, ["post_office","hut","research","historic","ferry"]), extras: profileExtrasQuery(bbox) }),
landuse: civilLanduseQuery, roads: ladderRoadsQuery,
water: coastWaterQuery,
} satisfies DetailConfig
