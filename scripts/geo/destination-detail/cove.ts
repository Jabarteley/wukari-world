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
  "name": "Atlas Cove Station",
  "box": [
    -53.109442344966986,
    73.24381350822969,
    -52.92856145503301,
    73.5431066917703
  ],
  "core": [
    -53.0461340334901,
    73.34863208842818,
    -52.9918697665099,
    73.43828811157182
  ],
  "places": [],
  "names": [
    {
      "id": "district-2855510564",
      "ref": "node/2855510564",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2855510568",
      "ref": "node/2855510568",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2854195653",
      "ref": "node/2854195653",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2854192041",
      "ref": "node/2854192041",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2762334883",
      "ref": "node/2762334883",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2772292464",
      "ref": "node/2772292464",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2855510566",
      "ref": "node/2855510566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2855510782",
      "ref": "node/2855510782",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8761184540",
      "ref": "node/8761184540",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13259155574",
      "ref": "node/13259155574",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2855510572",
      "ref": "node/2855510572",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2855510574",
      "ref": "node/2855510574",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2855510781",
      "ref": "node/2855510781",
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
