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
  "name": "Bujumbura",
  "box": [
    -3.48,
    29.24,
    -3.28,
    29.48
  ],
  "core": [
    -3.415,
    29.315,
    -3.345,
    29.405
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/1344199948",
      "line": "Bujumbura Bus Station (Siyoni), a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "node/2188525265",
      "line": "Maman Ngabo, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "way/1006372439",
      "line": "Hope Africa University, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "way/122956893",
      "line": "Hopital Militaire De Kamenge, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "way/29863497",
      "line": "Jardin Public, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/325686721",
      "line": "KANYOSHA MARKET, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/92028037",
      "line": "Regina Mundi Cathedral, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "node/1420210976",
      "line": "Palais des Congres de Kigobe; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "node/6862969717",
      "line": "Palais présidentiel Ntare Rushatsi, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-node-3349652326",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/3349652326",
      "line": "Université des Grands Lacs, a mapped place for the game."
    },
    {
      "key": "osm-way-10630191",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/10630191",
      "line": "Stade Intwari, a mapped place for the game."
    },
    {
      "key": "osm-way-425918156",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/425918156",
      "line": "Musée Vivant, a mapped place for the game."
    },
    {
      "key": "osm-way-124316871",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/124316871",
      "line": "Université du Burundi, a mapped place for the game."
    },
    {
      "key": "osm-way-211284748",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/211284748",
      "line": "Lake Tanganyika University, a mapped place for the game."
    },
    {
      "key": "osm-way-784755483",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/784755483",
      "line": "Izere, a mapped place for the game."
    },
    {
      "key": "osm-way-209975003",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/209975003",
      "line": "CDS KOMEZA GUSENGA, a mapped place for the game."
    },
    {
      "key": "osm-node-2174030720",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2174030720",
      "line": "Geny's Beach, a mapped place for the game."
    },
    {
      "key": "osm-node-2135030807",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2135030807",
      "line": "Lumière, a mapped place for the game."
    },
    {
      "key": "osm-way-121963993",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/121963993",
      "line": "STADE OLIMPIQUE, a mapped place for the game."
    },
    {
      "key": "osm-node-5542555221",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5542555221",
      "line": "Pagode Pascasia, a mapped place for the game."
    },
    {
      "key": "osm-node-5648265555",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5648265555",
      "line": "Isoko Gatumba, a mapped place for the game."
    },
    {
      "key": "osm-node-1343582898",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/1343582898",
      "line": "Marché Musaga, a mapped place for the game."
    },
    {
      "key": "osm-node-4169751891",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4169751891",
      "line": "Kwa Johnson Chez Johnson, a mapped place for the game."
    },
    {
      "key": "osm-way-46692291",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/46692291",
      "line": "Place de l'Indépendance, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-589900708",
      "ref": "node/589900708",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12548042515",
      "ref": "node/12548042515",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1343529639",
      "ref": "node/1343529639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1343529641",
      "ref": "node/1343529641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1343657773",
      "ref": "node/1343657773",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347805866",
      "ref": "node/1347805866",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347805867",
      "ref": "node/1347805867",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347805868",
      "ref": "node/1347805868",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347805870",
      "ref": "node/1347805870",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347941598",
      "ref": "node/1347941598",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347941601",
      "ref": "node/1347941601",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1347941629",
      "ref": "node/1347941629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1348273458",
      "ref": "node/1348273458",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1348971473",
      "ref": "node/1348971473",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1348971492",
      "ref": "node/1348971492",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349283321",
      "ref": "node/1349283321",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1354650543",
      "ref": "node/1354650543",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1424105035",
      "ref": "node/1424105035",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
