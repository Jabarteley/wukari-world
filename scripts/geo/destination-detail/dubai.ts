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
  "name": "Dubai",
  "box": [
    25.083841810066023,
    55.09345169001182,
    25.445603589933977,
    55.49137750998818
  ],
  "core": [
    25.219502477516507,
    55.24272970763253,
    25.309942922483494,
    55.342099492367474
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/604304348",
      "line": "Burj Khalifa / Dubai Mall, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "node/641812240",
      "line": "Pizza Hut, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "node/3275135389",
      "line": "I.A.U - Islamic Azad University, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "way/98642909",
      "line": "Dubai Hospital, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "way/230622240",
      "line": "Al Wasl Park, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/797700047",
      "line": "Dubai Hills Mall, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "relation/7214752",
      "line": "Dubai Grand Masjid, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "node/4770571328",
      "line": "Arts Square; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "way/1115201459",
      "line": "Ministry of Human Resources & Emiratisation, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-relation-13303178",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/13303178",
      "line": "University of Dubai, a mapped place for the game."
    },
    {
      "key": "osm-way-202564429",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/202564429",
      "line": "Al-Maktoum Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-551627055",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/551627055",
      "line": "Dubai Safari Zoo Park, a mapped place for the game."
    },
    {
      "key": "osm-way-376417463",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/376417463",
      "line": "University Of Sharjah, a mapped place for the game."
    },
    {
      "key": "osm-way-238918057",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/238918057",
      "line": "City University College of Ajman, a mapped place for the game."
    },
    {
      "key": "osm-way-89654734",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/89654734",
      "line": "Jumeirah Beach, a mapped place for the game."
    },
    {
      "key": "osm-node-3272826588",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3272826588",
      "line": "Barjeel Art Foundation, a mapped place for the game."
    },
    {
      "key": "osm-way-364819836",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/364819836",
      "line": "Silicon Oasis Park, a mapped place for the game."
    },
    {
      "key": "osm-way-311254501",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/311254501",
      "line": "Mushrif National Park, a mapped place for the game."
    },
    {
      "key": "osm-way-175115425",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/175115425",
      "line": "Mall of The Emirates, a mapped place for the game."
    },
    {
      "key": "osm-way-104655711",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/104655711",
      "line": "Palm Jumeirah Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-201292184",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/201292184",
      "line": "Maktoum Bin Rashid Al Maktoum Stadium, a mapped place for the game."
    },
    {
      "key": "osm-relation-2844942",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/2844942",
      "line": "Latifa Hospital Women and Children, a mapped place for the game."
    },
    {
      "key": "osm-way-230629140",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/230629140",
      "line": "Iranian Hospital Dubai, a mapped place for the game."
    },
    {
      "key": "osm-node-1532272198",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1532272198",
      "line": "St Marys Catholic Church, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11799343463",
      "ref": "node/11799343463",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11799361794",
      "ref": "node/11799361794",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11799459161",
      "ref": "node/11799459161",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1257564184",
      "ref": "node/1257564184",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1261639076",
      "ref": "node/1261639076",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13263889491",
      "ref": "node/13263889491",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13263889495",
      "ref": "node/13263889495",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1625626655",
      "ref": "node/1625626655",
      "kind": "neighbourhood"
    },
    {
      "id": "district-281204517",
      "ref": "node/281204517",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204769",
      "ref": "node/8143204769",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204772",
      "ref": "node/8143204772",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204773",
      "ref": "node/8143204773",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204774",
      "ref": "node/8143204774",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204802",
      "ref": "node/8143204802",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204805",
      "ref": "node/8143204805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204820",
      "ref": "node/8143204820",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204824",
      "ref": "node/8143204824",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8143204827",
      "ref": "node/8143204827",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-10903283",
      "ref": "relation/10903283",
      "kind": "water"
    },
    {
      "id": "water-relation-10903284",
      "ref": "relation/10903284",
      "kind": "water"
    }
  ],
  "farWaterTolerance": 0.0012,
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
