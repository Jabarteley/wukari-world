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
  "name": "Bangkok",
  "box": [
    13.57161291006602,
    100.30840009468739,
    13.933374689933979,
    100.75624778595025
  ],
  "core": [
    13.707273577516505,
    100.44725873712021,
    13.797714022483495,
    100.53975906287978
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/249644272",
      "line": "Sala Ya, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/358876587",
      "line": "Sirocco, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/2840322",
      "line": "Dhurakij Pundit University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3040931236",
      "line": "Nakornthon Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/33042465",
      "line": "Suan Luang Rama IX, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/359413315",
      "line": "Central Westgate, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/1669113342",
      "line": "Wat Khae, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1319861844",
      "line": "ศาลาว่าการกรุงเทพมหานคร 2; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/200187184",
      "line": "The Thai Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-1543169884",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1543169884",
      "line": "National Institute of Development Administration, a mapped place for the game."
    },
    {
      "key": "osm-node-2962259464",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2962259464",
      "line": "Lumpinee Boxing Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-706259602",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/706259602",
      "line": "Safari World, a mapped place for the game."
    },
    {
      "key": "osm-node-1669417525",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1669417525",
      "line": "Wat Rat Burana, a mapped place for the game."
    },
    {
      "key": "osm-way-378636213",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/378636213",
      "line": "Wat Nong Khaem, a mapped place for the game."
    },
    {
      "key": "osm-node-6169672727",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6169672727",
      "line": "MK Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-1641043367",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1641043367",
      "line": "Bang Nam Pheung Floating Market, a mapped place for the game."
    },
    {
      "key": "osm-way-420312611",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/420312611",
      "line": "King Mongkut's University of Technology, Thonburi, a mapped place for the game."
    },
    {
      "key": "osm-way-177938414",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/177938414",
      "line": "Siam University, a mapped place for the game."
    },
    {
      "key": "osm-relation-20313115",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/20313115",
      "line": "Thawiwanarom Park, a mapped place for the game."
    },
    {
      "key": "osm-node-1645930798",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/1645930798",
      "line": "Panyananthaphikkhu Chonprathan Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-way-1464119566",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1464119566",
      "line": "Royal Thai Air Force Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-203011799",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/203011799",
      "line": "Suan Luang Rama VIII Park, a mapped place for the game."
    },
    {
      "key": "osm-way-341749639",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/341749639",
      "line": "Nopparat Rajathanee Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-175314200",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/175314200",
      "line": "Thunder Dome, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1278005273",
      "ref": "node/1278005273",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13333919433",
      "ref": "node/13333919433",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13902096359",
      "ref": "node/13902096359",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13902112142",
      "ref": "node/13902112142",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14091752928",
      "ref": "node/14091752928",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1524353680",
      "ref": "node/1524353680",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1992315716",
      "ref": "node/1992315716",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2203906793",
      "ref": "node/2203906793",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2203947173",
      "ref": "node/2203947173",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566430",
      "ref": "node/2313566430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566433",
      "ref": "node/2313566433",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566436",
      "ref": "node/2313566436",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566439",
      "ref": "node/2313566439",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566443",
      "ref": "node/2313566443",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566445",
      "ref": "node/2313566445",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566446",
      "ref": "node/2313566446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566447",
      "ref": "node/2313566447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2313566448",
      "ref": "node/2313566448",
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
