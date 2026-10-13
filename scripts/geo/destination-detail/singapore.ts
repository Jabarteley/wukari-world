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
  "maxRoads": 600,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Singapore",
  "box": [
    1.1090366100660216,
    103.67218575336207,
    1.4707983899339785,
    104.03162864663793
  ],
  "core": [
    1.2446972775165055,
    103.80697944371889,
    1.3351377224834946,
    103.89683495628111
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/206477134",
      "line": "Aljunied, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/54032319",
      "line": "The Alkaff Mansion, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/1847853715",
      "line": "Woodlands Regional Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/162644392",
      "line": "St Luke’s Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/180909686",
      "line": "Punggol Waterway Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/744520551",
      "line": "Jewel Changi Airport, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/3280252625",
      "line": "The Kusu Kramats, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/9457446345",
      "line": "Ang Mo Kio Town Council (Avenue 1 Office); voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/41895536",
      "line": "Istana, a mapped place for the game."
    },
    {
      "key": "osm-way-115105262",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/115105262",
      "line": "Nanyang Technological University, a mapped place for the game."
    },
    {
      "key": "osm-way-677411847",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/677411847",
      "line": "Bedok Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-4300422591",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4300422591",
      "line": "Chek Jawa Wetlands, a mapped place for the game."
    },
    {
      "key": "osm-way-33175767",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/33175767",
      "line": "Yishun Park, a mapped place for the game."
    },
    {
      "key": "osm-way-175550316",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/175550316",
      "line": "Clementi Woods, a mapped place for the game."
    },
    {
      "key": "osm-way-34583847",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/34583847",
      "line": "Tampines Meridian Junior College, a mapped place for the game."
    },
    {
      "key": "osm-way-35096650",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/35096650",
      "line": "Masjid En-Naeem, a mapped place for the game."
    },
    {
      "key": "osm-way-232204347",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/232204347",
      "line": "Masjid Al-Iman, a mapped place for the game."
    },
    {
      "key": "osm-way-890591248",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/890591248",
      "line": "Steps of Syonan Jinja, a mapped place for the game."
    },
    {
      "key": "osm-relation-2535118",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/2535118",
      "line": "Ngee Ann Polytechnic, a mapped place for the game."
    },
    {
      "key": "osm-way-262885931",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/262885931",
      "line": "Singapore Zoo, a mapped place for the game."
    },
    {
      "key": "osm-way-152598430",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/152598430",
      "line": "Icon Village, a mapped place for the game."
    },
    {
      "key": "osm-way-173131856",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/173131856",
      "line": "Lot One Shoppers' Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-397219610",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/397219610",
      "line": "Parkway East Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-74715098",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/74715098",
      "line": "Mount Alvernia Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10059204012",
      "ref": "node/10059204012",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10059204013",
      "ref": "node/10059204013",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10059204014",
      "ref": "node/10059204014",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10068273286",
      "ref": "node/10068273286",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10199497346",
      "ref": "node/10199497346",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10787218558",
      "ref": "node/10787218558",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10896251387",
      "ref": "node/10896251387",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11547117460",
      "ref": "node/11547117460",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11741537987",
      "ref": "node/11741537987",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11743590954",
      "ref": "node/11743590954",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11743590955",
      "ref": "node/11743590955",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11743590956",
      "ref": "node/11743590956",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13348024998",
      "ref": "node/13348024998",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13348031103",
      "ref": "node/13348031103",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13348031104",
      "ref": "node/13348031104",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13348031107",
      "ref": "node/13348031107",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13348031109",
      "ref": "node/13348031109",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13348031115",
      "ref": "node/13348031115",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15343630",
      "ref": "relation/15343630",
      "kind": "water"
    },
    {
      "id": "water-relation-15699700",
      "ref": "relation/15699700",
      "kind": "water"
    },
    {
      "id": "water-relation-1989681",
      "ref": "relation/1989681",
      "kind": "water"
    },
    {
      "id": "water-relation-2178315",
      "ref": "relation/2178315",
      "kind": "water"
    },
    {
      "id": "water-relation-2239677",
      "ref": "relation/2239677",
      "kind": "water"
    },
    {
      "id": "water-relation-2239709",
      "ref": "relation/2239709",
      "kind": "water"
    },
    {
      "id": "water-relation-3520530",
      "ref": "relation/3520530",
      "kind": "water"
    },
    {
      "id": "water-relation-4569326",
      "ref": "relation/4569326",
      "kind": "water"
    },
    {
      "id": "water-relation-5576218",
      "ref": "relation/5576218",
      "kind": "water"
    },
    {
      "id": "water-relation-6525758",
      "ref": "relation/6525758",
      "kind": "water"
    },
    {
      "id": "water-relation-9542146",
      "ref": "relation/9542146",
      "kind": "water"
    },
    {
      "id": "water-way-180551420",
      "ref": "way/180551420",
      "kind": "water"
    },
    {
      "id": "water-way-20250182",
      "ref": "way/20250182",
      "kind": "water"
    },
    {
      "id": "water-way-20423973",
      "ref": "way/20423973",
      "kind": "water"
    },
    {
      "id": "water-way-20498763",
      "ref": "way/20498763",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
