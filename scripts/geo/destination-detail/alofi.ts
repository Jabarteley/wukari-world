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
  "name": "Alofi",
  "box": [
    -19.23429678993398,
    -170.10948301342634,
    -18.872535010066024,
    -169.72891498657364
  ],
  "core": [
    -19.098636122483494,
    -169.96673086966172,
    -19.008195677516508,
    -169.87166713033827
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3173841974",
      "line": "Israel Cafe, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/1557077",
      "line": "Niue Foou Hospital, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/547136282",
      "line": "Market of Niue, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "node/13458765949"
      },
      "ref": "node/13458765949",
      "line": "Niue Assembly; voting here is a fictional game activity."
    },
    {
      "key": "osm-node-3173841972",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3173841972",
      "line": "Anaana Lookout, a mapped place for the game."
    },
    {
      "key": "osm-node-8637114457",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8637114457",
      "line": "Togo Chasm, a mapped place for the game."
    },
    {
      "key": "osm-node-3173841987",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3173841987",
      "line": "Talava Arches, a mapped place for the game."
    },
    {
      "key": "osm-node-3173841984",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3173841984",
      "line": "Anapala Chasm, a mapped place for the game."
    },
    {
      "key": "osm-node-5084852122",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5084852122",
      "line": "Hio Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-693372026",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/693372026",
      "line": "Swanson Complex, a mapped place for the game."
    },
    {
      "key": "osm-node-3174114636",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3174114636",
      "line": "Vaiolama Cafe & Mini-golf, a mapped place for the game."
    },
    {
      "key": "osm-way-1191533235",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1191533235",
      "line": "Peniamina’s Grave, a mapped place for the game."
    },
    {
      "key": "osm-way-111378893",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/111378893",
      "line": "Niue Cultural Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-310211852",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/310211852",
      "line": "Washaway Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-311687085",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/311687085",
      "line": "Falala Cafe & Bar, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1259905102",
      "ref": "node/1259905102",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1259905076",
      "ref": "node/1259905076",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1259905097",
      "ref": "node/1259905097",
      "kind": "neighbourhood"
    },
    {
      "id": "district-448768955",
      "ref": "node/448768955",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1259905083",
      "ref": "node/1259905083",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1259905136",
      "ref": "node/1259905136",
      "kind": "neighbourhood"
    },
    {
      "id": "district-448768941",
      "ref": "node/448768941",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1259905134",
      "ref": "node/1259905134",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1259905073",
      "ref": "node/1259905073",
      "kind": "neighbourhood"
    },
    {
      "id": "district-448768947",
      "ref": "node/448768947",
      "kind": "neighbourhood"
    },
    {
      "id": "district-448768944",
      "ref": "node/448768944",
      "kind": "neighbourhood"
    },
    {
      "id": "district-448768952",
      "ref": "node/448768952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8637066147",
      "ref": "node/8637066147",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8637066154",
      "ref": "node/8637066154",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8637066155",
      "ref": "node/8637066155",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8637066145",
      "ref": "node/8637066145",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8637066311",
      "ref": "node/8637066311",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8637066208",
      "ref": "node/8637066208",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "community",
      "reason": "no unused named amenity=university, college, library, community_centre or conference_centre feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "recreation",
      "reason": "no unused named leisure=park, or the audited fallbacks (garden, stadium, sports_centre, pitch, nature_reserve, playground) feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "worship",
      "reason": "no unused named amenity=place_of_worship feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: coastWaterQuery,
} satisfies DetailConfig
