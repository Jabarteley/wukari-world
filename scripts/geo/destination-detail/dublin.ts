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
  "name": "Dublin",
  "box": [
    53.16849861006602,
    -6.562818373934496,
    53.53026038993398,
    -5.958300226065504
  ],
  "core": [
    53.304159277516504,
    -6.335882992901229,
    53.39459972248349,
    -6.185235607098771
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "train",
      "ref": "node/252821911",
      "line": "Adamstown, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1752476235",
      "line": "Bon Appétit, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "school",
      "ref": "node/651804747",
      "line": "Dublin Business School, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/12219521",
      "line": "Connolly Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/7222370",
      "line": "Tymon Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/28008541",
      "line": "Donaghmede Shopping Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/73561110",
      "line": "Kill o' the Grange, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/12359723",
      "line": "Mayor Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/26636056",
      "line": "The Presidential Residence, a mapped place for the game."
    },
    {
      "key": "osm-way-228188022",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/228188022",
      "line": "RCSI Reservoir House, a mapped place for the game."
    },
    {
      "key": "osm-way-26778663",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/26778663",
      "line": "Morton Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-541772649",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/541772649",
      "line": "Seefin Cairn, a mapped place for the game."
    },
    {
      "key": "osm-way-769452904",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/769452904",
      "line": "Raheen-a-Cluig, a mapped place for the game."
    },
    {
      "key": "osm-way-1136285120",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1136285120",
      "line": "St. Seachnall's Church, a mapped place for the game."
    },
    {
      "key": "osm-way-325933039",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/325933039",
      "line": "Corkagh Park, a mapped place for the game."
    },
    {
      "key": "osm-way-23565036",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/23565036",
      "line": "St Enda's Park, a mapped place for the game."
    },
    {
      "key": "osm-way-312566450",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/312566450",
      "line": "St David's Church, a mapped place for the game."
    },
    {
      "key": "osm-way-227972923",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/227972923",
      "line": "Church of the Assumption, a mapped place for the game."
    },
    {
      "key": "osm-way-29504327",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/29504327",
      "line": "Cherry Orchard Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-51680291",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/51680291",
      "line": "St. Columcille's Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-40585926",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/40585926",
      "line": "UCD Bowl, a mapped place for the game."
    },
    {
      "key": "osm-way-562581062",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/562581062",
      "line": "Parnell Park, a mapped place for the game."
    },
    {
      "key": "osm-relation-14714515",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/14714515",
      "line": "The Square Towncentre, a mapped place for the game."
    },
    {
      "key": "osm-way-255385171",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/255385171",
      "line": "Kylemore College, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-13058163287",
      "ref": "node/13058163287",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13465020232",
      "ref": "node/13465020232",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1408686056",
      "ref": "node/1408686056",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1411182102",
      "ref": "node/1411182102",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1414490165",
      "ref": "node/1414490165",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1419136873",
      "ref": "node/1419136873",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1419161775",
      "ref": "node/1419161775",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1426100401",
      "ref": "node/1426100401",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1458157709",
      "ref": "node/1458157709",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1679488277",
      "ref": "node/1679488277",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1707005947",
      "ref": "node/1707005947",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1707049696",
      "ref": "node/1707049696",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1983495228",
      "ref": "node/1983495228",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2498370557",
      "ref": "node/2498370557",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2508110805",
      "ref": "node/2508110805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2986012929",
      "ref": "node/2986012929",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3623892590",
      "ref": "node/3623892590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-385885516",
      "ref": "node/385885516",
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
