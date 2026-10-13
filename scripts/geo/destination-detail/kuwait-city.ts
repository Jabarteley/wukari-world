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
  "name": "Kuwait City",
  "box": [
    29.198772310066023,
    47.766869900506066,
    29.560534089933977,
    48.17996489949394
  ],
  "core": [
    29.334432977516506,
    47.9218496308093,
    29.424873422483493,
    48.02498516919071
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1281235473",
      "line": "Hassawi, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/452185124",
      "line": "Johnny Carino's, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/992647941",
      "line": "Gulf University for Science & Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/154721776",
      "line": "Amiri Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/937507535",
      "line": "Northwest Sulaibikhat Public Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/11185097754",
      "line": "A5 Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/316759515",
      "line": "Imam Zayn Al-Aabideen Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/608671337",
      "line": "Al-Mailam Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/9667134917",
      "line": "warba disabled sport club, a mapped place for the game."
    },
    {
      "key": "osm-way-336814876",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/336814876",
      "line": "American University of Kuwait, a mapped place for the game."
    },
    {
      "key": "osm-way-159761965",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/159761965",
      "line": "Thamir Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-5284460222",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5284460222",
      "line": "Kuwait National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-627399824",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/627399824",
      "line": "Kuwait Towers, a mapped place for the game."
    },
    {
      "key": "osm-way-1456434409",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1456434409",
      "line": "Liberation Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-616859990",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/616859990",
      "line": "Al-Sadaqua Walsalam Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-47393892",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/47393892",
      "line": "Sabah al-Salem Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-10211965934",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/10211965934",
      "line": "Australian University, a mapped place for the game."
    },
    {
      "key": "osm-way-698737981",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/698737981",
      "line": "يوسف يعقوب المطوع وموضي يوسف المطوع, a mapped place for the game."
    },
    {
      "key": "osm-way-360268449",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/360268449",
      "line": "الدعوة, a mapped place for the game."
    },
    {
      "key": "osm-node-4365886397",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4365886397",
      "line": "وزارة الصحة, a mapped place for the game."
    },
    {
      "key": "osm-way-457096707",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/457096707",
      "line": "Al-Dabbus Shopping Mall, a mapped place for the game."
    },
    {
      "key": "osm-node-10178336317",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10178336317",
      "line": "Al-Shayeb Karak, a mapped place for the game."
    },
    {
      "key": "osm-node-14177476101",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/14177476101",
      "line": "Hardees, a mapped place for the game."
    },
    {
      "key": "osm-way-456447601",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/456447601",
      "line": "Sahah Al Nasser Mall Society, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11866163109",
      "ref": "node/11866163109",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12125798677",
      "ref": "node/12125798677",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12135506439",
      "ref": "node/12135506439",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12143388455",
      "ref": "node/12143388455",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1759552757",
      "ref": "node/1759552757",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1759971859",
      "ref": "node/1759971859",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691771",
      "ref": "node/4603691771",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691772",
      "ref": "node/4603691772",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691782",
      "ref": "node/4603691782",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691783",
      "ref": "node/4603691783",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691892",
      "ref": "node/4603691892",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691893",
      "ref": "node/4603691893",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4603691895",
      "ref": "node/4603691895",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9535528377",
      "ref": "node/9535528377",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10840179098",
      "ref": "node/10840179098",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11166002698",
      "ref": "node/11166002698",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11850261210",
      "ref": "node/11850261210",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12114092256",
      "ref": "node/12114092256",
      "kind": "neighbourhood"
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
