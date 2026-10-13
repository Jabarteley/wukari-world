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
  "name": "Port of Spain",
  "box": [
    10.47638691006602,
    -61.70094250528619,
    10.838148689933979,
    -61.32842880207231
  ],
  "core": [
    10.612047577516504,
    -61.5637280087236,
    10.702488022483495,
    -61.47230659127639
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1327402735",
      "line": "San Juan Bus Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1525792589",
      "line": "Starbucks, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/6943346288",
      "line": "Alma Jordan Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/131559736",
      "line": "Port of Spain General Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/96579810",
      "line": "Queen's Park Savannah, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/165665763",
      "line": "Center City Shopping Complex, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/1049048345",
      "line": "Mount Saint Benedict, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/1269970359",
      "line": "Ministry of Works and Transport, Maintenance Division, District of Caroni; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/138155533",
      "line": "The Red House, a mapped place for the game."
    },
    {
      "key": "osm-way-100822158",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/100822158",
      "line": "Fatima College, a mapped place for the game."
    },
    {
      "key": "osm-relation-11925862",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/11925862",
      "line": "Queen's Park Oval, a mapped place for the game."
    },
    {
      "key": "osm-way-117872639",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/117872639",
      "line": "Archbishop's House, a mapped place for the game."
    },
    {
      "key": "osm-node-1049039374",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1049039374",
      "line": "Saint Joseph Roman Catholic Church, a mapped place for the game."
    },
    {
      "key": "osm-node-2366018981",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/2366018981",
      "line": "Hugh Wooding Law School, a mapped place for the game."
    },
    {
      "key": "osm-way-100764338",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/100764338",
      "line": "Hasely Crawford Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-389725165",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/389725165",
      "line": "St. Mary's College, a mapped place for the game."
    },
    {
      "key": "osm-way-388729737",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/388729737",
      "line": "National Museum & Art Gallery, a mapped place for the game."
    },
    {
      "key": "osm-way-117671749",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/117671749",
      "line": "Queen's Royal College, a mapped place for the game."
    },
    {
      "key": "osm-way-100866002",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/100866002",
      "line": "Memorial Park, a mapped place for the game."
    },
    {
      "key": "osm-way-100764513",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/100764513",
      "line": "Nelson Mandela Park, a mapped place for the game."
    },
    {
      "key": "osm-way-386980356",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/386980356",
      "line": "Holy Name, a mapped place for the game."
    },
    {
      "key": "osm-node-1530642487",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1530642487",
      "line": "Lookout, a mapped place for the game."
    },
    {
      "key": "osm-node-4254280290",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4254280290",
      "line": "Chinese restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-1058026060",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1058026060",
      "line": "Patches, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1098464273",
      "ref": "node/1098464273",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1098464280",
      "ref": "node/1098464280",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1098464284",
      "ref": "node/1098464284",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1098464288",
      "ref": "node/1098464288",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1100545025",
      "ref": "node/1100545025",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1310681641",
      "ref": "node/1310681641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1824462528",
      "ref": "node/1824462528",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1824583736",
      "ref": "node/1824583736",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1824583737",
      "ref": "node/1824583737",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1824583738",
      "ref": "node/1824583738",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1830552565",
      "ref": "node/1830552565",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1888753892",
      "ref": "node/1888753892",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1888753899",
      "ref": "node/1888753899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1908503049",
      "ref": "node/1908503049",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1919830445",
      "ref": "node/1919830445",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2269868167",
      "ref": "node/2269868167",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2374468210",
      "ref": "node/2374468210",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2374468211",
      "ref": "node/2374468211",
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
