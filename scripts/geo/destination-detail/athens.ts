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
  "name": "Athens",
  "box": [
    37.79468391006602,
    23.506349478745935,
    38.15644568993398,
    23.96331532125406
  ],
  "core": [
    37.93034457751651,
    23.677817574645474,
    38.020785022483494,
    23.791847225354523
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/250702349",
      "line": "Megaro Mousikis, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2902095151",
      "line": "Varoulko Seaside, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/299059456",
      "line": "Drossinis Museum, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/669746894",
      "line": "Εθνικό Κέντρο Αποκατάστασης, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/89943258",
      "line": "Άλσος Βεΐκου, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/44000881",
      "line": "The Mall Athens, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/208889169",
      "line": "Monastère de Daphni, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/81783120",
      "line": "Πλατεία Μεταξουργείου; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/191315065",
      "line": "Hellenic National Meteorological Service, a mapped place for the game."
    },
    {
      "key": "osm-way-160307906",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/160307906",
      "line": "University of West Attica - Ancient Grove Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-432559442",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/432559442",
      "line": "Αστεροσκοπείο Πεντέλης, a mapped place for the game."
    },
    {
      "key": "osm-node-6506548450",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6506548450",
      "line": "Battle of Salamis Memorial, a mapped place for the game."
    },
    {
      "key": "osm-relation-2022511",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/2022511",
      "line": "Τελεστήριον, a mapped place for the game."
    },
    {
      "key": "osm-way-412135808",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/412135808",
      "line": "Αττικό Ζωολογικό Πάρκο, a mapped place for the game."
    },
    {
      "key": "osm-node-9385908004",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9385908004",
      "line": "Ναός Αγίου Λουκά Λαμπρικών, a mapped place for the game."
    },
    {
      "key": "osm-relation-1626837",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/1626837",
      "line": "Nea Smyrni Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-316732250",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/316732250",
      "line": "Γενικό Νοσοκομείο Νοσημάτων Θώρακος \"Η Σωτηρία\", a mapped place for the game."
    },
    {
      "key": "osm-way-948091319",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/948091319",
      "line": "Peristeri Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-3565807234",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3565807234",
      "line": "Ιερός Ναός Κοιμήσεως Θεοτόκου (16ου-17ου αιώνα), a mapped place for the game."
    },
    {
      "key": "osm-node-1008013053",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1008013053",
      "line": "Δρομοκαΐτειο, a mapped place for the game."
    },
    {
      "key": "osm-relation-3568067",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/3568067",
      "line": "National and Kapodistrian University of Athens, a mapped place for the game."
    },
    {
      "key": "osm-way-319084318",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/319084318",
      "line": "Australian Archaeological Institute at Athens, a mapped place for the game."
    },
    {
      "key": "osm-way-1566325327",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1566325327",
      "line": "Pedion Areos, a mapped place for the game."
    },
    {
      "key": "osm-node-4729929890",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4729929890",
      "line": "City Link, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10099560630",
      "ref": "node/10099560630",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10099560631",
      "ref": "node/10099560631",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11268882575",
      "ref": "node/11268882575",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11802576886",
      "ref": "node/11802576886",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11806027625",
      "ref": "node/11806027625",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1234101968",
      "ref": "node/1234101968",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12769000270",
      "ref": "node/12769000270",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13236518402",
      "ref": "node/13236518402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1857182829",
      "ref": "node/1857182829",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096026721",
      "ref": "node/2096026721",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096054980",
      "ref": "node/2096054980",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096058929",
      "ref": "node/2096058929",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096073378",
      "ref": "node/2096073378",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096077632",
      "ref": "node/2096077632",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096080283",
      "ref": "node/2096080283",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096082898",
      "ref": "node/2096082898",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096148667",
      "ref": "node/2096148667",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2096164822",
      "ref": "node/2096164822",
      "kind": "neighbourhood"
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
