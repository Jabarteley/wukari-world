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
  "name": "Grytviken",
  "box": [
    -54.325868322483494,
    -36.5868190710594,
    -54.23542787751651,
    -36.432780928940595
  ],
  "core": [
    -54.3077802334901,
    -36.55599113205045,
    -54.2535159665099,
    -36.463608867949546
  ],
  "places": [
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/533041734",
      "line": "Église luthérienne norvégienne de Grytviken, a mapped place for the game."
    },
    {
      "key": "osm-node-828768166",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/828768166",
      "line": "Shackleton's Grave, a mapped place for the game."
    },
    {
      "key": "osm-way-533046863",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/533046863",
      "line": "Musée de Géorgie du Sud, a mapped place for the game."
    },
    {
      "key": "osm-node-6579560468",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6579560468",
      "line": "Frank Wild's Grave, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-5722989121",
      "ref": "node/5722989121",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6764600494",
      "ref": "node/6764600494",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3721643189",
      "ref": "node/3721643189",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9141127571",
      "ref": "node/9141127571",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9049845842",
      "ref": "node/9049845842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9166115544",
      "ref": "node/9166115544",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9143952629",
      "ref": "node/9143952629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9055511466",
      "ref": "node/9055511466",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9194787931",
      "ref": "node/9194787931",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9166115545",
      "ref": "node/9166115545",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9055511467",
      "ref": "node/9055511467",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9141127580",
      "ref": "node/9141127580",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9073070848",
      "ref": "node/9073070848",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9097325225",
      "ref": "node/9097325225",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9073090197",
      "ref": "node/9073090197",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9143952630",
      "ref": "node/9143952630",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9073070847",
      "ref": "node/9073070847",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9166115548",
      "ref": "node/9166115548",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-8795446",
      "ref": "relation/8795446",
      "kind": "water"
    },
    {
      "id": "water-relation-8798156",
      "ref": "relation/8798156",
      "kind": "water"
    }
  ],
  "profile": "outpost",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station (or amenity=ferry_terminal) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "meal",
      "reason": "no unused named amenity=restaurant or amenity=cafe feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
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
