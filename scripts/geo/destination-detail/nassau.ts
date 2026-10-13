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
  "name": "Nassau",
  "box": [
    24.897345710066023,
    -77.53700009397514,
    25.259107489933978,
    -77.13968750602487
  ],
  "core": [
    25.033006377516507,
    -77.38795259204727,
    25.123446822483494,
    -77.28873500795274
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2080727622",
      "line": "Paradise Island Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4108498823",
      "line": "Compass Point Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/301902604",
      "line": "Nassau Public Library & Museum, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/301893671",
      "line": "Sandilands Rehabilitation Centre (SRC), a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1491651204",
      "line": "Bamboo Town Constituency Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/368833938",
      "line": "Pompey Village, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/444246696",
      "line": "Christ Church Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/234030479",
      "line": "Rawson Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4828931426",
      "line": "Bahamas National Archives, a mapped place for the game."
    },
    {
      "key": "osm-way-80922971",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/80922971",
      "line": "University of The Bahamas (UB), a mapped place for the game."
    },
    {
      "key": "osm-way-301425856",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/301425856",
      "line": "Thomas A. Robinson National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-191808714",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/191808714",
      "line": "Fort Montagu, a mapped place for the game."
    },
    {
      "key": "osm-way-222586240",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/222586240",
      "line": "Albany Golf Course, a mapped place for the game."
    },
    {
      "key": "osm-way-374794285",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/374794285",
      "line": "Queens Staircase, a mapped place for the game."
    },
    {
      "key": "osm-way-408486495",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/408486495",
      "line": "St Andrews Presbyterian Kirk, a mapped place for the game."
    },
    {
      "key": "osm-node-12653954301",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12653954301",
      "line": "Lia Ra'chards Heavenly Cafe, a mapped place for the game."
    },
    {
      "key": "osm-node-14066492002",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/14066492002",
      "line": "Southwest Diner & Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-174579796",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/174579796",
      "line": "Community Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-228455375",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/228455375",
      "line": "Cairo National Park, a mapped place for the game."
    },
    {
      "key": "osm-way-377805365",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/377805365",
      "line": "Bahamas Baptist Community College (BBC), a mapped place for the game."
    },
    {
      "key": "osm-way-692348777",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/692348777",
      "line": "Faith Plaza, a mapped place for the game."
    },
    {
      "key": "osm-way-370134561",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/370134561",
      "line": "New Providence Community Centre, a mapped place for the game."
    },
    {
      "key": "osm-node-5088154289",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5088154289",
      "line": "Continental Foods, a mapped place for the game."
    },
    {
      "key": "osm-node-3796314387",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/3796314387",
      "line": "University of West Indies Open Campus, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-766252018",
      "ref": "node/766252018",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10182092241",
      "ref": "node/10182092241",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10183311783",
      "ref": "node/10183311783",
      "kind": "neighbourhood"
    },
    {
      "id": "district-370281985",
      "ref": "way/370281985",
      "kind": "neighbourhood"
    },
    {
      "id": "district-302696064",
      "ref": "way/302696064",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2314267",
      "ref": "relation/2314267",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
