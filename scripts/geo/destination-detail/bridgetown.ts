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
  "name": "Bridgetown",
  "box": [
    12.916902310066021,
    -59.803015947974664,
    13.27866408993398,
    -59.43382085202534
  ],
  "core": [
    13.052562977516505,
    -59.66454214348014,
    13.143003422483496,
    -59.572294656519865
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "relation/12724653",
      "line": "Speightstown Bus Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/608405858",
      "line": "Round House Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/231339988",
      "line": "Samuel Jackman Prescod Institute of Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/440523260",
      "line": "Queen Elizabeth Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/471281496",
      "line": "Farley Hill National Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/95179441",
      "line": "Sheraton Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/741736399",
      "line": "St. Philip's Parish Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/235142705"
      },
      "ref": "way/235142705",
      "line": "Barbados Supreme Court Complex; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/479780102",
      "line": "Caribbean Examinations Council (CXC), a mapped place for the game."
    },
    {
      "key": "osm-way-385052120",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/385052120",
      "line": "Queen's College, a mapped place for the game."
    },
    {
      "key": "osm-way-1137316499",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1137316499",
      "line": "National Stadium and Sports Center, a mapped place for the game."
    },
    {
      "key": "osm-way-864190108",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/864190108",
      "line": "Gun Hill Signal Station, a mapped place for the game."
    },
    {
      "key": "osm-way-384916728",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/384916728",
      "line": "St. James Parish Church, a mapped place for the game."
    },
    {
      "key": "osm-way-440434642",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/440434642",
      "line": "St. Margaret's Anglican Church, a mapped place for the game."
    },
    {
      "key": "osm-way-255443003",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/255443003",
      "line": "Fort Charles, a mapped place for the game."
    },
    {
      "key": "osm-way-1432859122",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1432859122",
      "line": "Saint Joseph Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-480461489",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/480461489",
      "line": "Barbados Community College (BCC), a mapped place for the game."
    },
    {
      "key": "osm-way-576678586",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/576678586",
      "line": "Kensington Oval, a mapped place for the game."
    },
    {
      "key": "osm-way-1042768231",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1042768231",
      "line": "Erdiston Teachers' Training College, a mapped place for the game."
    },
    {
      "key": "osm-way-37935746",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/37935746",
      "line": "National Heroes Square, a mapped place for the game."
    },
    {
      "key": "osm-way-93917192",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/93917192",
      "line": "Queen's Park, a mapped place for the game."
    },
    {
      "key": "osm-node-11686666569",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11686666569",
      "line": "mamu's cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-8393535458",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8393535458",
      "line": "L'Azure Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-13686266671",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/13686266671",
      "line": "Franz Phillips Memorial Picture Hole, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3876626752",
      "ref": "node/3876626752",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3893748646",
      "ref": "node/3893748646",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3893894323",
      "ref": "node/3893894323",
      "kind": "neighbourhood"
    },
    {
      "id": "district-439985106",
      "ref": "node/439985106",
      "kind": "neighbourhood"
    },
    {
      "id": "district-440675782",
      "ref": "node/440675782",
      "kind": "neighbourhood"
    },
    {
      "id": "district-441264880",
      "ref": "node/441264880",
      "kind": "neighbourhood"
    },
    {
      "id": "district-441264895",
      "ref": "node/441264895",
      "kind": "neighbourhood"
    },
    {
      "id": "district-445330768",
      "ref": "node/445330768",
      "kind": "neighbourhood"
    },
    {
      "id": "district-445414402",
      "ref": "node/445414402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-445415087",
      "ref": "node/445415087",
      "kind": "neighbourhood"
    },
    {
      "id": "district-445415088",
      "ref": "node/445415088",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4784798135",
      "ref": "node/4784798135",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5142339085",
      "ref": "node/5142339085",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5212561106",
      "ref": "node/5212561106",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10011523789",
      "ref": "node/10011523789",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10017281435",
      "ref": "node/10017281435",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10035147823",
      "ref": "node/10035147823",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10160600739",
      "ref": "node/10160600739",
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
