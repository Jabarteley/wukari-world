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
  "name": "Port-aux-Français",
  "box": [
    -49.39498092248349,
    70.15094490173844,
    -49.304540477516504,
    70.28896809826155
  ],
  "core": [
    -49.376892833490096,
    70.17856478207537,
    -49.3226285665099,
    70.26134821792462
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/187212509",
      "line": "Tiker, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/221034172",
      "line": "SuperDARN Radar (Kerguelen), a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/769773554",
      "line": "Samuker, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/187212500",
      "line": "Église Notre-Dame-des-Vents, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/221069326",
      "line": "Résidence; voting here is a fictional game activity."
    },
    {
      "key": "osm-way-187231295",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/187231295",
      "line": "Centre National d'Etudes Spatiales, a mapped place for the game."
    },
    {
      "key": "osm-way-187231297",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/187231297",
      "line": "Météo France, a mapped place for the game."
    },
    {
      "key": "osm-way-187212489",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/187212489",
      "line": "Biomar, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-8762081271",
      "ref": "node/8762081271",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8762075468",
      "ref": "node/8762075468",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6434636096",
      "ref": "node/6434636096",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6172689613",
      "ref": "node/6172689613",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3837068498",
      "ref": "node/3837068498",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3837068499",
      "ref": "node/3837068499",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6109920259",
      "ref": "node/6109920259",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-6063032",
      "ref": "relation/6063032",
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
      "slot": "recreation",
      "reason": "no unused named leisure=park, or the audited fallbacks (garden, stadium, sports_centre, pitch, nature_reserve, playground) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
