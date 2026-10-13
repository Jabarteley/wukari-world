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
  "name": "Villa Las Estrellas",
  "box": [
    -62.38130678993398,
    -59.35291859748897,
    -62.01954501006602,
    -58.57781940251103
  ],
  "core": [
    -62.24564612248349,
    -59.06182018568934,
    -62.155205677516506,
    -58.86891781431066
  ],
  "places": [
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/446987858",
      "line": "Villa Las Estrellas, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/277056528",
      "line": "Medical Unit, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/277045528",
      "line": "Chapel of Saint Mary Queen of Peace, a mapped place for the game."
    },
    {
      "key": "osm-node-2011467410",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2011467410",
      "line": "Carlini Base, a mapped place for the game."
    },
    {
      "key": "osm-node-2011467454",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2011467454",
      "line": "King Sejong Station, a mapped place for the game."
    },
    {
      "key": "osm-node-5314158621",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5314158621",
      "line": "Collins Base, a mapped place for the game."
    },
    {
      "key": "osm-way-749856717",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/749856717",
      "line": "Holy Trinity Church, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10684180473",
      "ref": "node/10684180473",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5316835183",
      "ref": "node/5316835183",
      "kind": "neighbourhood"
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
