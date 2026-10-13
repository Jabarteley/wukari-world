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
  "name": "Freetown",
  "box": [
    8.29812311006602,
    -13.44968408564828,
    8.659884889933979,
    -13.08621591435172
  ],
  "core": [
    8.433783777516505,
    -13.313367270517157,
    8.524224222483495,
    -13.222532729482845
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/369184018",
      "line": "Hoverport, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/379484158",
      "line": "Francos, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/6367305043",
      "line": "Sierra Leone Library Board, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/248303133",
      "line": "Mahera Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/10867320667",
      "line": "Don Bosco Center, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/314305661",
      "line": "Ogoo Farm Marketplace, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/177521574",
      "line": "St. George's Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/13854935371",
      "line": "Old Airport Junction; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/5458759126",
      "line": "Parliament of Sierra leone, a mapped place for the game."
    },
    {
      "key": "osm-way-797018443",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/797018443",
      "line": "Medicine University, a mapped place for the game."
    },
    {
      "key": "osm-way-28429017",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/28429017",
      "line": "Siaka Stevens Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-307686732",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/307686732",
      "line": "National Railway Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-3563419694",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3563419694",
      "line": "National Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-3563419693",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3563419693",
      "line": "The Cotton Tree, a mapped place for the game."
    },
    {
      "key": "osm-way-177518789",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/177518789",
      "line": "Sacred Heart Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-177518788",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/177518788",
      "line": "St. John's Maroon Church, a mapped place for the game."
    },
    {
      "key": "osm-way-1428236844",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1428236844",
      "line": "Rokupa Government Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-11556711498",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11556711498",
      "line": "LŎR, a mapped place for the game."
    },
    {
      "key": "osm-node-13134140271",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/13134140271",
      "line": "FCC Hospital under consurction, a mapped place for the game."
    },
    {
      "key": "osm-node-11174916109",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/11174916109",
      "line": "Marie Enterprise, a mapped place for the game."
    },
    {
      "key": "osm-node-6019513088",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6019513088",
      "line": "Cockle point, a mapped place for the game."
    },
    {
      "key": "osm-way-308486010",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/308486010",
      "line": "MMCET College, a mapped place for the game."
    },
    {
      "key": "osm-way-328985318",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/328985318",
      "line": "German Technical Academy, a mapped place for the game."
    },
    {
      "key": "osm-node-3715252412",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3715252412",
      "line": "Freetown Mall, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-370327499",
      "ref": "node/370327499",
      "kind": "neighbourhood"
    },
    {
      "id": "district-370495828",
      "ref": "node/370495828",
      "kind": "neighbourhood"
    },
    {
      "id": "district-370495917",
      "ref": "node/370495917",
      "kind": "neighbourhood"
    },
    {
      "id": "district-370496125",
      "ref": "node/370496125",
      "kind": "neighbourhood"
    },
    {
      "id": "district-370794239",
      "ref": "node/370794239",
      "kind": "neighbourhood"
    },
    {
      "id": "district-372618813",
      "ref": "node/372618813",
      "kind": "neighbourhood"
    },
    {
      "id": "district-391448586",
      "ref": "node/391448586",
      "kind": "neighbourhood"
    },
    {
      "id": "district-423761590",
      "ref": "node/423761590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752602965",
      "ref": "node/12752602965",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752602966",
      "ref": "node/12752602966",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752614831",
      "ref": "node/12752614831",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752614898",
      "ref": "node/12752614898",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752655255",
      "ref": "node/12752655255",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752655256",
      "ref": "node/12752655256",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752655257",
      "ref": "node/12752655257",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752655282",
      "ref": "node/12752655282",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752655283",
      "ref": "node/12752655283",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12752687231",
      "ref": "node/12752687231",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-38802217",
      "ref": "way/38802217",
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
