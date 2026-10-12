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
  "name": "Asmara",
  "box": [
    15.158085810066021,
    38.746215290574156,
    15.51984758993398,
    39.11913730942584
  ],
  "core": [
    15.293746477516505,
    38.88609154705522,
    15.384186922483496,
    38.97926105294477
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1092407340",
      "line": "Asmara, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5152477752",
      "line": "Wide Hiyab Snack Bar, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/529703008",
      "line": "Eritrea Institute of Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/319528084",
      "line": "St Mary's Psychiatric Hospital Sembel, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/6261029019",
      "line": "ኮመሰራታ ሓማሴን, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/278140690",
      "line": "Medeber Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/120666025",
      "line": "Kidane Meheret Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/120789690",
      "line": "Asmara Muncipality; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/278141933",
      "line": "Ministry of Education, a mapped place for the game."
    },
    {
      "key": "osm-way-145347060",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/145347060",
      "line": "University of Asmara, a mapped place for the game."
    },
    {
      "key": "osm-way-355197149",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/355197149",
      "line": "Cicero Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-457538564",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/457538564",
      "line": "Dem Sebai, a mapped place for the game."
    },
    {
      "key": "osm-way-278139357",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/278139357",
      "line": "Fiat Tagliero, a mapped place for the game."
    },
    {
      "key": "osm-way-278139845",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/278139845",
      "line": "Nation Museum of Eritrea, a mapped place for the game."
    },
    {
      "key": "osm-way-93787841",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/93787841",
      "line": "Saint Joseph's Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-6360893186",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6360893186",
      "line": "Restaurant with view over 2 valleys, a mapped place for the game."
    },
    {
      "key": "osm-way-120789231",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/120789231",
      "line": "St Mariam, a mapped place for the game."
    },
    {
      "key": "osm-node-1834089661",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1834089661",
      "line": "Bar Durfo, a mapped place for the game."
    },
    {
      "key": "osm-way-783951928",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/783951928",
      "line": "Godaif Community Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-790417508",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/790417508",
      "line": "Halibet Referral Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-714628474",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/714628474",
      "line": "Teachers' Institute, a mapped place for the game."
    },
    {
      "key": "osm-node-7075366286",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/7075366286",
      "line": "Stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-120789247",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/120789247",
      "line": "Covered Market for fruits, a mapped place for the game."
    },
    {
      "key": "osm-way-120789704",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/120789704",
      "line": "Covered Market - fruits, vegetables, bags, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3632097426",
      "ref": "node/3632097426",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5145239564",
      "ref": "node/5145239564",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4956626606",
      "ref": "node/4956626606",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12239252315",
      "ref": "node/12239252315",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5165095321",
      "ref": "node/5165095321",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5145262748",
      "ref": "node/5145262748",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2828476594",
      "ref": "node/2828476594",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5145262749",
      "ref": "node/5145262749",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6104661634",
      "ref": "node/6104661634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6006018563",
      "ref": "node/6006018563",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6104661633",
      "ref": "node/6104661633",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6006018564",
      "ref": "node/6006018564",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6200080377",
      "ref": "node/6200080377",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10824284994",
      "ref": "node/10824284994",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7235351525",
      "ref": "node/7235351525",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6200080375",
      "ref": "node/6200080375",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11716120766",
      "ref": "node/11716120766",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1668972022",
      "ref": "node/1668972022",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-59059",
      "ref": "relation/59059",
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
