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
  "name": "Oranjestad",
  "box": [
    12.339221510066022,
    -70.22130160114335,
    12.70098328993398,
    -69.85296419885665
  ],
  "core": [
    12.474882177516506,
    -70.083150647727,
    12.565322622483496,
    -69.99111515227301
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2682381431",
      "line": "De Palm Island Ferry Teminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2682540965",
      "line": "La Trattoria El Faro Blanco, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/369027333",
      "line": "Xavier University School of Medicine, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/382344981",
      "line": "IMSAN Dr. Rudy Engelbrecht Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/43109643",
      "line": "Ayo Rock Formation, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/4073810",
      "line": "Palm Beach Plaza Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/97566669",
      "line": "Seroe Colorado Community Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/38755794",
      "line": "City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/175180276",
      "line": "Human Resources Aruba, a mapped place for the game."
    },
    {
      "key": "osm-way-491139601",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/491139601",
      "line": "University of Aruba, a mapped place for the game."
    },
    {
      "key": "osm-node-1773562177",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1773562177",
      "line": "Sero Cabai, a mapped place for the game."
    },
    {
      "key": "osm-way-769698096",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/769698096",
      "line": "Fort Zoutman, a mapped place for the game."
    },
    {
      "key": "osm-node-540982491",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/540982491",
      "line": "Guadirikiri Cave, a mapped place for the game."
    },
    {
      "key": "osm-node-540115823",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/540115823",
      "line": "Alto Vista Chapel, a mapped place for the game."
    },
    {
      "key": "osm-node-1770257502",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1770257502",
      "line": "Model Train Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-952400489",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/952400489",
      "line": "Synagogue, a mapped place for the game."
    },
    {
      "key": "osm-node-540217531",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/540217531",
      "line": "Sero Jamanota, a mapped place for the game."
    },
    {
      "key": "osm-node-3753152873",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3753152873",
      "line": "Hoi Sing Bar & Chinese Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-11591843520",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11591843520",
      "line": "Overhanging cliff, a mapped place for the game."
    },
    {
      "key": "osm-way-958543660",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/958543660",
      "line": "Parke Curazon, a mapped place for the game."
    },
    {
      "key": "osm-node-8677634858",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8677634858",
      "line": "Grandiso Sopi Seafood Mix, a mapped place for the game."
    },
    {
      "key": "osm-way-959755657",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/959755657",
      "line": "Green Corridor Linear park, a mapped place for the game."
    },
    {
      "key": "osm-way-190877206",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/190877206",
      "line": "Super Food Plaza, a mapped place for the game."
    },
    {
      "key": "osm-way-371524223",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/371524223",
      "line": "Rococo Plaza, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-4599172447",
      "ref": "node/4599172447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12165943766",
      "ref": "node/12165943766",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12165943767",
      "ref": "node/12165943767",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3814910956",
      "ref": "node/3814910956",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172440",
      "ref": "node/4599172440",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172448",
      "ref": "node/4599172448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172449",
      "ref": "node/4599172449",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172450",
      "ref": "node/4599172450",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172451",
      "ref": "node/4599172451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172452",
      "ref": "node/4599172452",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172453",
      "ref": "node/4599172453",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4599172454",
      "ref": "node/4599172454",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5298483729",
      "ref": "node/5298483729",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5976787344",
      "ref": "node/5976787344",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6486942430",
      "ref": "node/6486942430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6497917813",
      "ref": "node/6497917813",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6497917814",
      "ref": "node/6497917814",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6497917815",
      "ref": "node/6497917815",
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
