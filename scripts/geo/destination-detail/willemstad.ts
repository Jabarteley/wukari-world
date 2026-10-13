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
  "name": "Willemstad",
  "box": [
    11.925788610066022,
    -69.11900516055373,
    12.28755038993398,
    -68.75125623944628
  ],
  "core": [
    12.061449277516505,
    -68.98107574968557,
    12.151889722483496,
    -68.88918565031443
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/295125540",
      "line": "Punda Ferry Dock, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/335611671",
      "line": "Porto Marie Beach, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/12960093074",
      "line": "Biblioteka Nashonal Kòrsou, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/387975180",
      "line": "Curaçao Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/237592022",
      "line": "Rif Mangrove Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1552105131",
      "line": "LXRY Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/371810812",
      "line": "Katedral di Pietermaai, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/372920585",
      "line": "Bentana di informashon; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/250834080",
      "line": "Parliament of Curaçao, a mapped place for the game."
    },
    {
      "key": "osm-way-687410566",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/687410566",
      "line": "University of Curacao Dr. Moises Da Costa Gomez, a mapped place for the game."
    },
    {
      "key": "osm-way-696020924",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/696020924",
      "line": "Stadion Ergilio Hato, a mapped place for the game."
    },
    {
      "key": "osm-node-621938358",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/621938358",
      "line": "Hato Caves, a mapped place for the game."
    },
    {
      "key": "osm-way-946150393",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/946150393",
      "line": "Landhuis Daniël, a mapped place for the game."
    },
    {
      "key": "osm-node-8754288674",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8754288674",
      "line": "Museum Landhuis Ascencion, a mapped place for the game."
    },
    {
      "key": "osm-way-370349178",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/370349178",
      "line": "Sint Anna Basiliek, a mapped place for the game."
    },
    {
      "key": "osm-way-312133712",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/312133712",
      "line": "Mikvé Israel-Emanuel, a mapped place for the game."
    },
    {
      "key": "osm-way-301593974",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/301593974",
      "line": "Pearl of the Caribbean, a mapped place for the game."
    },
    {
      "key": "osm-node-614709247",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/614709247",
      "line": "Fuikbaai, a mapped place for the game."
    },
    {
      "key": "osm-node-1680059162",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1680059162",
      "line": "Kokomo Beach, a mapped place for the game."
    },
    {
      "key": "osm-node-4148045689",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4148045689",
      "line": "Overkempe Estate, a mapped place for the game."
    },
    {
      "key": "osm-way-375316022",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/375316022",
      "line": "Fromer I.P.O Police Academy, a mapped place for the game."
    },
    {
      "key": "osm-node-295322115",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/295322115",
      "line": "Flamingo observation tower, a mapped place for the game."
    },
    {
      "key": "osm-way-1380095524",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1380095524",
      "line": "St. Martinus University (Faculty of Medicine), a mapped place for the game."
    },
    {
      "key": "osm-node-3125134023",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/3125134023",
      "line": "Villapark Wind Gate, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1157611147",
      "ref": "node/1157611147",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1799969288",
      "ref": "node/1799969288",
      "kind": "neighbourhood"
    },
    {
      "id": "district-295125474",
      "ref": "node/295125474",
      "kind": "neighbourhood"
    },
    {
      "id": "district-295125484",
      "ref": "node/295125484",
      "kind": "neighbourhood"
    },
    {
      "id": "district-295125507",
      "ref": "node/295125507",
      "kind": "neighbourhood"
    },
    {
      "id": "district-295322113",
      "ref": "node/295322113",
      "kind": "neighbourhood"
    },
    {
      "id": "district-297064424",
      "ref": "node/297064424",
      "kind": "neighbourhood"
    },
    {
      "id": "district-297168264",
      "ref": "node/297168264",
      "kind": "neighbourhood"
    },
    {
      "id": "district-297229338",
      "ref": "node/297229338",
      "kind": "neighbourhood"
    },
    {
      "id": "district-297234354",
      "ref": "node/297234354",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3196411011",
      "ref": "node/3196411011",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3196411012",
      "ref": "node/3196411012",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3196411029",
      "ref": "node/3196411029",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3196517129",
      "ref": "node/3196517129",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3196532180",
      "ref": "node/3196532180",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3197111418",
      "ref": "node/3197111418",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3197111446",
      "ref": "node/3197111446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3197111453",
      "ref": "node/3197111453",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3968178",
      "ref": "relation/3968178",
      "kind": "water"
    },
    {
      "id": "water-relation-9130894",
      "ref": "relation/9130894",
      "kind": "water"
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
