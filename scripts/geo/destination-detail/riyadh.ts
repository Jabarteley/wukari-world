import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, inlandWaterQuery } from './queries.ts'

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
  "name": "Riyadh",
  "box": [
    24.45803511006602,
    46.51806438549398,
    24.966644044496697,
    46.913956414506025
  ],
  "core": [
    24.593695777516505,
    46.666577888121545,
    24.68413622248349,
    46.76544291187846
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/492520789",
      "line": "Riyadh Railway Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/586570960",
      "line": "Firdays, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/13296000",
      "line": "King Saud University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/53193801",
      "line": "King Fahad Medical City, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/915570666",
      "line": "King Salman Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/220845002",
      "line": "Sahara Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4193342092",
      "line": "مسجد, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1385940115",
      "line": "Deera Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/302308518",
      "line": "Ministry of Foreign Affairs, a mapped place for the game."
    },
    {
      "key": "osm-way-161612193",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/161612193",
      "line": "Princess Nora bint Abdulrahman University, a mapped place for the game."
    },
    {
      "key": "osm-way-119616744",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/119616744",
      "line": "King Fahd International Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-329990284",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/329990284",
      "line": "Yamamah Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-978220391",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/978220391",
      "line": "At-Turaif District in ad-Dir'iyah, a mapped place for the game."
    },
    {
      "key": "osm-way-221634202",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/221634202",
      "line": "Al Yamamah University, a mapped place for the game."
    },
    {
      "key": "osm-way-264745917",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/264745917",
      "line": "Kingdom Centre, a mapped place for the game."
    },
    {
      "key": "osm-node-3351034516",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3351034516",
      "line": "Boeing 707-386C, a mapped place for the game."
    },
    {
      "key": "osm-way-328365837",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/328365837",
      "line": "Riyadh College of Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-441769548",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/441769548",
      "line": "King Abdullah Park, a mapped place for the game."
    },
    {
      "key": "osm-way-1193082860",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1193082860",
      "line": "Prince Sultan Military Medical City, a mapped place for the game."
    },
    {
      "key": "osm-way-53157805",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/53157805",
      "line": "Prince Faisal bin Fahd Sports City Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-623544763",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/623544763",
      "line": "Al-Awwal Park, a mapped place for the game."
    },
    {
      "key": "osm-way-331075149",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/331075149",
      "line": "Medical City, a mapped place for the game."
    },
    {
      "key": "osm-way-168522856",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/168522856",
      "line": "Suwaidi Park, a mapped place for the game."
    },
    {
      "key": "osm-way-161100723",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/161100723",
      "line": "Granada Mall, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1236400125",
      "ref": "node/1236400125",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703633",
      "ref": "node/1236703633",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703638",
      "ref": "node/1236703638",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703650",
      "ref": "node/1236703650",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703661",
      "ref": "node/1236703661",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703717",
      "ref": "node/1236703717",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703720",
      "ref": "node/1236703720",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703837",
      "ref": "node/1236703837",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703842",
      "ref": "node/1236703842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703857",
      "ref": "node/1236703857",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703867",
      "ref": "node/1236703867",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1236703875",
      "ref": "node/1236703875",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11870002843",
      "ref": "node/11870002843",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11870048313",
      "ref": "node/11870048313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11870048606",
      "ref": "node/11870048606",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11870220235",
      "ref": "node/11870220235",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11870275678",
      "ref": "node/11870275678",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11870738324",
      "ref": "node/11870738324",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
