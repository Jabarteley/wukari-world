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
  "name": "Tel Aviv",
  "box": [
    31.904418810066023,
    34.56933347881145,
    32.26618058993398,
    34.99427932118855
  ],
  "core": [
    32.04007947751651,
    34.728767306892586,
    32.130519922483494,
    34.834845493107416
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/461613375",
      "line": "Kfar Chabad, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/558702490",
      "line": "Mul-Yam, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/77161070",
      "line": "The Open University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/30750762",
      "line": "Rabin Medical Center – Beilinson Campus, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/107456924",
      "line": "Hosmasa \"yad la Haganah\" Musuem, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/84092298",
      "line": "Shuk HaPishpeshim, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/1262192646",
      "line": "Nabi Rubin, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/494477045",
      "line": "Drom HaSharon Regional Council; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/683209656",
      "line": "Bituach Leumi, a mapped place for the game."
    },
    {
      "key": "osm-way-84530824",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/84530824",
      "line": "Beit Berl Academic college, a mapped place for the game."
    },
    {
      "key": "osm-node-4172995826",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4172995826",
      "line": "Tel Hadid, a mapped place for the game."
    },
    {
      "key": "osm-way-932979208",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/932979208",
      "line": "Mazor, a mapped place for the game."
    },
    {
      "key": "osm-relation-13435489",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/13435489",
      "line": "Sidna Ali Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-228281988",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/228281988",
      "line": "בית הכנסת הגדול, a mapped place for the game."
    },
    {
      "key": "osm-node-1443153708",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1443153708",
      "line": "Izbet Sartah, a mapped place for the game."
    },
    {
      "key": "osm-node-8312911961",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/8312911961",
      "line": "Tel Zureikya, a mapped place for the game."
    },
    {
      "key": "osm-way-45556106",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/45556106",
      "line": "HaPark HaLeumi, a mapped place for the game."
    },
    {
      "key": "osm-node-2467107746",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2467107746",
      "line": "Memorial of the 8th Brigade, a mapped place for the game."
    },
    {
      "key": "osm-way-80798213",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/80798213",
      "line": "Haberfeld Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-294635033",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/294635033",
      "line": "Ayalon Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-762309552",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/762309552",
      "line": "Raanana Park, a mapped place for the game."
    },
    {
      "key": "osm-way-284108856",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/284108856",
      "line": "Sarona Market, a mapped place for the game."
    },
    {
      "key": "osm-way-48949522",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/48949522",
      "line": "Yitzhak Shamir Medical Center – Assaf HaRofeh Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-95215506",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/95215506",
      "line": "Seminar HaKibuzzim, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1025002630",
      "ref": "node/1025002630",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10948949440",
      "ref": "node/10948949440",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10948949443",
      "ref": "node/10948949443",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11012660856",
      "ref": "node/11012660856",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11085325236",
      "ref": "node/11085325236",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11091654899",
      "ref": "node/11091654899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11146106800",
      "ref": "node/11146106800",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1116182645",
      "ref": "node/1116182645",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11349957721",
      "ref": "node/11349957721",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11349957725",
      "ref": "node/11349957725",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11351485859",
      "ref": "node/11351485859",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1169841935",
      "ref": "node/1169841935",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1171837023",
      "ref": "node/1171837023",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1171837025",
      "ref": "node/1171837025",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1198725889",
      "ref": "node/1198725889",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1199980410",
      "ref": "node/1199980410",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1696731874",
      "ref": "node/1696731874",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1696791356",
      "ref": "node/1696791356",
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
