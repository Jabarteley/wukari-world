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
  "name": "Île Boddam",
  "box": [
    -5.429786655973592,
    72.1327328879786,
    -5.285081944026409,
    72.2771105120214
  ],
  "core": [
    -5.384566433490098,
    72.17785291774244,
    -5.330302166509903,
    72.23199048225756
  ],
  "places": [
    {
      "key": "osm-node-5194716720",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5194716720",
      "line": "Black Rose, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-32596963",
      "ref": "way/32596963",
      "kind": "neighbourhood"
    },
    {
      "id": "district-546485159",
      "ref": "way/546485159",
      "kind": "neighbourhood"
    },
    {
      "id": "district-44038375",
      "ref": "way/44038375",
      "kind": "neighbourhood"
    },
    {
      "id": "district-536779324",
      "ref": "way/536779324",
      "kind": "neighbourhood"
    },
    {
      "id": "district-44038373",
      "ref": "way/44038373",
      "kind": "neighbourhood"
    },
    {
      "id": "district-32597333",
      "ref": "way/32597333",
      "kind": "neighbourhood"
    },
    {
      "id": "district-545121559",
      "ref": "way/545121559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-32597120",
      "ref": "way/32597120",
      "kind": "neighbourhood"
    },
    {
      "id": "district-546441956",
      "ref": "way/546441956",
      "kind": "neighbourhood"
    }
  ],
  "profile": "wilderness",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "meal",
      "reason": "no unused named amenity=restaurant or amenity=cafe feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "community",
      "reason": "no unused named amenity=university, college, library, community_centre or conference_centre feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
discovery: (bbox: string) => ({ places: profilePlacesQuery(bbox, ["natural","hut","historic"]), extras: profileExtrasQuery(bbox) }),
landuse: civilLanduseQuery, roads: ladderRoadsQuery,
water: coastWaterQuery,
} satisfies DetailConfig
