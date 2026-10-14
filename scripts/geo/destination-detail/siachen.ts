import type { DetailConfig } from './config.ts'
import { profilePlacesQuery, profileExtrasQuery, civilLanduseQuery, ladderRoadsQuery, inlandWaterQuery } from './queries.ts'

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
  "name": "Terong Kangri",
  "box": [
    35.32632554402641,
    77.22589663014551,
    35.476280544496696,
    77.4023801698545
  ],
  "core": [
    35.371545766509904,
    77.28106632437549,
    35.4258100334901,
    77.34721047562452
  ],
  "places": [],
  "names": [
    {
      "id": "district-5305858330",
      "ref": "node/5305858330",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5240926121",
      "ref": "node/5240926121",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3533480355",
      "ref": "node/3533480355",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5240926607",
      "ref": "node/5240926607",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5240921097",
      "ref": "node/5240921097",
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
  ]
},
discovery: (bbox: string) => ({ places: profilePlacesQuery(bbox, ["natural","hut","historic"]), extras: profileExtrasQuery(bbox) }),
landuse: civilLanduseQuery, roads: ladderRoadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
