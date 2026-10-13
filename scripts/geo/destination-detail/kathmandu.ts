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
  "name": "Kathmandu",
  "box": [
    27.527436110066024,
    85.11731026752476,
    27.88919788993398,
    85.52385313247525
  ],
  "core": [
    27.663096777516508,
    85.26982729860245,
    27.753537222483494,
    85.37133610139756
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/268310351",
      "line": "Pasang Lhamu Ticket Counter - Trishuli, Dhunche, Syabrubeshi, Chilime, Timure, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/564125542",
      "line": "Dakshinkali Resort, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/10971613623",
      "line": "Khwopa Engineering College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/10953876",
      "line": "Civil Service Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28523872",
      "line": "Ratna Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/9702970921",
      "line": "Matatirtha Mall & Mart, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/186264410",
      "line": "Changu Narayan Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1192827651",
      "line": "Bhaktapur Durbar Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/2441253902",
      "line": "Department of Health Services, a mapped place for the game."
    },
    {
      "key": "osm-way-231049690",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/231049690",
      "line": "NMC white hostel, a mapped place for the game."
    },
    {
      "key": "osm-node-4213646591",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4213646591",
      "line": "Surya Chaur, a mapped place for the game."
    },
    {
      "key": "osm-node-10034234966",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10034234966",
      "line": "Tusha Hiti, a mapped place for the game."
    },
    {
      "key": "osm-node-3079586714",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3079586714",
      "line": "Thapagaun, a mapped place for the game."
    },
    {
      "key": "osm-way-120106732",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/120106732",
      "line": "Maitighar Mandala, a mapped place for the game."
    },
    {
      "key": "osm-way-183558418",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/183558418",
      "line": "Kasthamandap, a mapped place for the game."
    },
    {
      "key": "osm-way-193705373",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/193705373",
      "line": "शहीदगेट, a mapped place for the game."
    },
    {
      "key": "osm-node-11300416091",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11300416091",
      "line": "Dasharath Rangasala, a mapped place for the game."
    },
    {
      "key": "osm-relation-21498033",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/21498033",
      "line": "Basantapur Durbar Square, a mapped place for the game."
    },
    {
      "key": "osm-node-2055477614",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2055477614",
      "line": "Kantipur Engineering College, a mapped place for the game."
    },
    {
      "key": "osm-way-221217814",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/221217814",
      "line": "Kathmandu Medical College, a mapped place for the game."
    },
    {
      "key": "osm-way-85650618",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/85650618",
      "line": "Garden of Dreams, a mapped place for the game."
    },
    {
      "key": "osm-way-16232252",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/16232252",
      "line": "Dashrath Rangasala Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-1417852753",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1417852753",
      "line": "Red Cross, a mapped place for the game."
    },
    {
      "key": "osm-node-4413371489",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4413371489",
      "line": "Shyam Staff Hotel, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1145267936",
      "ref": "node/1145267936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13277054059",
      "ref": "node/13277054059",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1341029550",
      "ref": "node/1341029550",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349697740",
      "ref": "node/1349697740",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1382903024",
      "ref": "node/1382903024",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1383284251",
      "ref": "node/1383284251",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1523679015",
      "ref": "node/1523679015",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1772109891",
      "ref": "node/1772109891",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1772109895",
      "ref": "node/1772109895",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2004031729",
      "ref": "node/2004031729",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2054615266",
      "ref": "node/2054615266",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2069377368",
      "ref": "node/2069377368",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2083743578",
      "ref": "node/2083743578",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2148707721",
      "ref": "node/2148707721",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2148707722",
      "ref": "node/2148707722",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2148707723",
      "ref": "node/2148707723",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2206264553",
      "ref": "node/2206264553",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2207719953",
      "ref": "node/2207719953",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-4030020",
      "ref": "relation/4030020",
      "kind": "water"
    },
    {
      "id": "water-way-184392556",
      "ref": "way/184392556",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
