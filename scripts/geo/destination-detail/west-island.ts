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
  "name": "West Island",
  "box": [
    -12.298376433960387,
    96.72011938112345,
    -12.081319366039613,
    96.94077781887654
  ],
  "core": [
    -12.226024077986796,
    96.79368228595747,
    -12.153671722013204,
    96.86721491404252
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3024982382",
      "line": "Ferry to Home Island, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3024003734",
      "line": "Salty's Airport Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-4547647294",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4547647294",
      "line": "Yacht Club, a mapped place for the game."
    },
    {
      "key": "osm-way-1015047086",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1015047086",
      "line": "Sula Sula Servery, a mapped place for the game."
    },
    {
      "key": "osm-way-1204779092",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1204779092",
      "line": "Muslim Cemetery, a mapped place for the game."
    },
    {
      "key": "osm-node-4547647295",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4547647295",
      "line": "Twiss Memorial, a mapped place for the game."
    },
    {
      "key": "osm-way-198316207",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/198316207",
      "line": "Surfer Girl Restaurant & Brewery, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1986233349",
      "ref": "node/1986233349",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1927498780",
      "ref": "node/1927498780",
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
discovery: (bbox: string) => ({ places: profilePlacesQuery(bbox, ["post_office","hut","research","historic","ferry"]), extras: profileExtrasQuery(bbox) }),
landuse: civilLanduseQuery, roads: ladderRoadsQuery,
water: coastWaterQuery,
} satisfies DetailConfig
