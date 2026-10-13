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
  "name": "Port Moresby",
  "box": [
    -9.655210989933979,
    146.97770666032244,
    -9.29344921006602,
    147.3421941396776
  ],
  "core": [
    -9.519550322483495,
    147.1144076828301,
    -9.429109877516504,
    147.20549311716994
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5125689323",
      "line": "Boroko, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13684912394",
      "line": "Brews & Berries Café, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/25396668",
      "line": "University of Papua New Guinea, Waigani Campus, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/793402380",
      "line": "Laloki Psychiatric Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/301418557",
      "line": "Koiri Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1493413574",
      "line": "JF Betlenut Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/895502854",
      "line": "St. Mary’s Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/942762390",
      "line": "Port Moresby City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/12825984935",
      "line": "PNG National Weather Services, a mapped place for the game."
    },
    {
      "key": "osm-way-1475514064",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1475514064",
      "line": "Metago Bible College, a mapped place for the game."
    },
    {
      "key": "osm-way-525253713",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/525253713",
      "line": "Sir John Guise Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-6038606685",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6038606685",
      "line": "Canoe coffee, a mapped place for the game."
    },
    {
      "key": "osm-way-25178323",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/25178323",
      "line": "Sir Hubert Murray Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-615731680",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/615731680",
      "line": "Santos National Football Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1493439301",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1493439301",
      "line": "Water's Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-1495472122",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1495472122",
      "line": "Eliseo Makana Plaza, a mapped place for the game."
    },
    {
      "key": "osm-way-1497930259",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1497930259",
      "line": "Bunka Café, a mapped place for the game."
    },
    {
      "key": "osm-way-1481698449",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1481698449",
      "line": "Porebada Health Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-1497997106",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1497997106",
      "line": "Vabukori Women's Market, a mapped place for the game."
    },
    {
      "key": "osm-way-25178550",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/25178550",
      "line": "Port Moresby Technical College, a mapped place for the game."
    },
    {
      "key": "osm-way-1495585405",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1495585405",
      "line": "Bomana Police College, a mapped place for the game."
    },
    {
      "key": "osm-way-25601717",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/25601717",
      "line": "Gerehu Sports Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-25598649",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/25598649",
      "line": "PNG National Museum and Art Gallery, a mapped place for the game."
    },
    {
      "key": "osm-way-1445648071",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1445648071",
      "line": "Unagi Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-274489595",
      "ref": "node/274489595",
      "kind": "neighbourhood"
    },
    {
      "id": "district-274494871",
      "ref": "node/274494871",
      "kind": "neighbourhood"
    },
    {
      "id": "district-274531559",
      "ref": "node/274531559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-277281469",
      "ref": "node/277281469",
      "kind": "neighbourhood"
    },
    {
      "id": "district-277281829",
      "ref": "node/277281829",
      "kind": "neighbourhood"
    },
    {
      "id": "district-277411896",
      "ref": "node/277411896",
      "kind": "neighbourhood"
    },
    {
      "id": "district-277419180",
      "ref": "node/277419180",
      "kind": "neighbourhood"
    },
    {
      "id": "district-277424574",
      "ref": "node/277424574",
      "kind": "neighbourhood"
    },
    {
      "id": "district-277424596",
      "ref": "node/277424596",
      "kind": "neighbourhood"
    },
    {
      "id": "district-279029593",
      "ref": "node/279029593",
      "kind": "neighbourhood"
    },
    {
      "id": "district-279063570",
      "ref": "node/279063570",
      "kind": "neighbourhood"
    },
    {
      "id": "district-279063583",
      "ref": "node/279063583",
      "kind": "neighbourhood"
    },
    {
      "id": "district-279066809",
      "ref": "node/279066809",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11358488165",
      "ref": "node/11358488165",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11358488166",
      "ref": "node/11358488166",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11358488167",
      "ref": "node/11358488167",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11358488168",
      "ref": "node/11358488168",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11358488269",
      "ref": "node/11358488269",
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
