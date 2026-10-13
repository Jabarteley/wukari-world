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
  "name": "Philipsburg",
  "box": [
    17.844190410066023,
    -63.23743746692212,
    18.205952189933978,
    -62.85917713307788
  ],
  "core": [
    17.979851077516507,
    -63.095553181890594,
    18.070291522483494,
    -63.0010614181094
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/6149141167",
      "line": "Anguilla-St. Maarten Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1497965663",
      "line": "Beau Beau's, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/43230761",
      "line": "University of Sint Maarten, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4990833539",
      "line": "Mental Health Foundation, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1417556523",
      "line": "Lower Prince Roundabout, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/158069802",
      "line": "Puerta Del Sol Plaza, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/365536085",
      "line": "Mary Star of the Sea Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/261373945"
      },
      "ref": "way/261373945",
      "line": "Constitutional Court of Sint Maarten; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/261368964",
      "line": "Immigration and Border Protection Service Office, a mapped place for the game."
    },
    {
      "key": "osm-way-261385206",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/261385206",
      "line": "Caribbean International Academy, a mapped place for the game."
    },
    {
      "key": "osm-node-1927202186",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1927202186",
      "line": "Fort Amsterdam, a mapped place for the game."
    },
    {
      "key": "osm-node-6074914982",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6074914982",
      "line": "Jet Blast Area, a mapped place for the game."
    },
    {
      "key": "osm-way-261373936",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/261373936",
      "line": "Philipsburg Methodist Church, a mapped place for the game."
    },
    {
      "key": "osm-way-261368991",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/261368991",
      "line": "St. Martin of Tours' Church, a mapped place for the game."
    },
    {
      "key": "osm-way-521561458",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/521561458",
      "line": "Caraibisch SoIL Bar & Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-367541884",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/367541884",
      "line": "Beauty Cristal, a mapped place for the game."
    },
    {
      "key": "osm-way-207975556",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/207975556",
      "line": "Blue Mall, a mapped place for the game."
    },
    {
      "key": "osm-relation-10372197",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/10372197",
      "line": "Sint Maarten Medical Center | SMMC, a mapped place for the game."
    },
    {
      "key": "osm-way-522407960",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/522407960",
      "line": "Emilio Wilson Park, a mapped place for the game."
    },
    {
      "key": "osm-way-1417556522",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1417556522",
      "line": "Emmancipation Roundabout, a mapped place for the game."
    },
    {
      "key": "osm-node-12750078802",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12750078802",
      "line": "Billy Bones Boat Exursions, a mapped place for the game."
    },
    {
      "key": "osm-way-368560586",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/368560586",
      "line": "Shop 4 Less, a mapped place for the game."
    },
    {
      "key": "osm-way-1388191554",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1388191554",
      "line": "American University of the Caribbean, a mapped place for the game."
    },
    {
      "key": "osm-way-368524649",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/368524649",
      "line": "Windward Island Emergency Medical Services, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1918631523",
      "ref": "node/1918631523",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701391",
      "ref": "node/5116701391",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701393",
      "ref": "node/5116701393",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701395",
      "ref": "node/5116701395",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701396",
      "ref": "node/5116701396",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701397",
      "ref": "node/5116701397",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701398",
      "ref": "node/5116701398",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701399",
      "ref": "node/5116701399",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701400",
      "ref": "node/5116701400",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701401",
      "ref": "node/5116701401",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701402",
      "ref": "node/5116701402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701404",
      "ref": "node/5116701404",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701408",
      "ref": "node/5116701408",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1918600834",
      "ref": "node/1918600834",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1918631595",
      "ref": "node/1918631595",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1918631607",
      "ref": "node/1918631607",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5081990787",
      "ref": "node/5081990787",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5116701390",
      "ref": "node/5116701390",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2314243",
      "ref": "relation/2314243",
      "kind": "water"
    },
    {
      "id": "water-relation-9204905",
      "ref": "relation/9204905",
      "kind": "water"
    },
    {
      "id": "water-relation-9208151",
      "ref": "relation/9208151",
      "kind": "water"
    }
  ],
  "profile": "microstate",
  "emptySlots": [],
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
