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
  "name": "Suva",
  "box": [
    -18.322469289933977,
    178.25290905716855,
    -17.960707510066023,
    178.63142334283145
  ],
  "core": [
    -18.186808622483493,
    178.394888850984,
    -18.096368177516506,
    178.48944354901602
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/1526025926",
      "line": "Narain Jetty, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "node/4646246778",
      "line": "Garib Store, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "way/1303203230",
      "line": "Montfort Boys Town Fiji, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "node/2784602059",
      "line": "Makoi Health Center, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "way/23706912",
      "line": "Thurston Gardens, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/730227260",
      "line": "Hexagon, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/656339144",
      "line": "Naililili Cathedral, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "node/9523922651",
      "line": "ACS Hall; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "node/4960702121",
      "line": "Bau District School, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-way-226445953",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/226445953",
      "line": "AOG Secondary School, a mapped place for the game."
    },
    {
      "key": "osm-way-666132415",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/666132415",
      "line": "ANZ National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1309951782",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1309951782",
      "line": "Fiji Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-24281973",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/24281973",
      "line": "Ratu Cakobau Park, a mapped place for the game."
    },
    {
      "key": "osm-way-23708350",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23708350",
      "line": "Vodafone Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-1015760632",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1015760632",
      "line": "Wainibokasi Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-931639205",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/931639205",
      "line": "Mokani Health Center, a mapped place for the game."
    },
    {
      "key": "osm-node-895373703",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/895373703",
      "line": "Novotel Lami Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-1067790146",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1067790146",
      "line": "Batiwinai, a mapped place for the game."
    },
    {
      "key": "osm-node-4500791362",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/4500791362",
      "line": "Biukota, a mapped place for the game."
    },
    {
      "key": "osm-way-724184460",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/724184460",
      "line": "CJS Supermarket Nakasi, a mapped place for the game."
    },
    {
      "key": "osm-node-4461947007",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4461947007",
      "line": "School of Applied Sciences FNU, a mapped place for the game."
    },
    {
      "key": "osm-way-506437485",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/506437485",
      "line": "Seventh Day Adventist College, a mapped place for the game."
    },
    {
      "key": "osm-node-4551574653",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4551574653",
      "line": "Natural Pools and Waterfalls, a mapped place for the game."
    },
    {
      "key": "osm-way-292559681",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/292559681",
      "line": "Old Raiwaqa Market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2115182178",
      "ref": "node/2115182178",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2115183754",
      "ref": "node/2115183754",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2115184956",
      "ref": "node/2115184956",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264803151",
      "ref": "node/264803151",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264825358",
      "ref": "node/264825358",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264825430",
      "ref": "node/264825430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264827032",
      "ref": "node/264827032",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264827291",
      "ref": "node/264827291",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264827391",
      "ref": "node/264827391",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264827466",
      "ref": "node/264827466",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264827596",
      "ref": "node/264827596",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264827652",
      "ref": "node/264827652",
      "kind": "neighbourhood"
    },
    {
      "id": "district-265684303",
      "ref": "node/265684303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-265684542",
      "ref": "node/265684542",
      "kind": "neighbourhood"
    },
    {
      "id": "district-265684644",
      "ref": "node/265684644",
      "kind": "neighbourhood"
    },
    {
      "id": "district-265684769",
      "ref": "node/265684769",
      "kind": "neighbourhood"
    },
    {
      "id": "district-265685645",
      "ref": "node/265685645",
      "kind": "neighbourhood"
    },
    {
      "id": "district-265685646",
      "ref": "node/265685646",
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
