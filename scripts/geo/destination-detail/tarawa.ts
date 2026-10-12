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
  "name": "South Tarawa",
  "box": [
    1.1681969100660217,
    172.858924892749,
    1.5299586899339785,
    173.218377507251
  ],
  "core": [
    1.3038575775165056,
    172.99372233854598,
    1.3942980224834947,
    173.08358006145403
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1051474544",
      "line": "Ferry to North Tarawa, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2395665986",
      "line": "Swampy's, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/2399104525",
      "line": "Kiribati Technical Institute, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/498370391",
      "line": "Tungaru Central Hospital - Female Ward, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/12062291831",
      "line": "Amusement Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/335676916",
      "line": "Betio Super Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/90810971",
      "line": "Sacred Heart Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/291432462",
      "line": "Tenimanraoi Maneaba; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/541856638",
      "line": "House of Assembly, a mapped place for the game."
    },
    {
      "key": "osm-way-231551186",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/231551186",
      "line": "EBS Dormitory, a mapped place for the game."
    },
    {
      "key": "osm-way-223373092",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/223373092",
      "line": "Bariki National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-497807556",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/497807556",
      "line": "Kiribati National Museum and Cultural Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-472259897",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/472259897",
      "line": "Bouta Lodge Bar, a mapped place for the game."
    },
    {
      "key": "osm-node-4884735821",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4884735821",
      "line": "Eita, a mapped place for the game."
    },
    {
      "key": "osm-node-2398053764",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2398053764",
      "line": "Titarbakti Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-5850089487",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5850089487",
      "line": "Bill house, a mapped place for the game."
    },
    {
      "key": "osm-way-496795760",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/496795760",
      "line": "Marine Training Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-791807366",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/791807366",
      "line": "USP Kiribati Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-223383917",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/223383917",
      "line": "Tungaru Central Hospital (Hospital, Dentist, Ministry of Health), a mapped place for the game."
    },
    {
      "key": "osm-way-851490550",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/851490550",
      "line": "Tobwaan te Tongo Park, a mapped place for the game."
    },
    {
      "key": "osm-node-12062288381",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/12062288381",
      "line": "TTRP, a mapped place for the game."
    },
    {
      "key": "osm-node-5850089485",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5850089485",
      "line": "Main port, a mapped place for the game."
    },
    {
      "key": "osm-node-5504031221",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5504031221",
      "line": "Domestic Ferry Pier, a mapped place for the game."
    },
    {
      "key": "osm-way-1065417644",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1065417644",
      "line": "Betio Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-8509193516",
      "ref": "node/8509193516",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2375865683",
      "ref": "node/2375865683",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908959",
      "ref": "node/2396908959",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908955",
      "ref": "node/2396908955",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908973",
      "ref": "node/2396908973",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2375865688",
      "ref": "node/2375865688",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908976",
      "ref": "node/2396908976",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908962",
      "ref": "node/2396908962",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2375865687",
      "ref": "node/2375865687",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908954",
      "ref": "node/2396908954",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8093485190",
      "ref": "node/8093485190",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908968",
      "ref": "node/2396908968",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908971",
      "ref": "node/2396908971",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2397131487",
      "ref": "node/2397131487",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908961",
      "ref": "node/2396908961",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7323460766",
      "ref": "node/7323460766",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908975",
      "ref": "node/2396908975",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2396908963",
      "ref": "node/2396908963",
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
