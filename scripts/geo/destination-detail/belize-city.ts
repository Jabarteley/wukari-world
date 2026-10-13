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
  "name": "Belize City",
  "box": [
    17.319395910066024,
    -88.38744371588106,
    17.68115768993398,
    -88.01030368411892
  ],
  "core": [
    17.45505657751651,
    -88.2459807805808,
    17.545497022483495,
    -88.15176661941919
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/9817874415",
      "line": "Belize City => Corozal Town, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2580450445",
      "line": "ABC Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/963695037",
      "line": "Central America Health Sciences University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/295699807",
      "line": "Karl Heusner Memorial Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/376110638",
      "line": "Buttonwood Bay Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3789147573",
      "line": "Craft Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/130793100",
      "line": "St. John's Anglican Cathedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/295592929",
      "line": "Belize City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4732408021",
      "line": "National Meteorological Service of Belize, a mapped place for the game."
    },
    {
      "key": "osm-way-295702030",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/295702030",
      "line": "University of Belize (Education Campus), a mapped place for the game."
    },
    {
      "key": "osm-way-1015283263",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1015283263",
      "line": "Albert Hoy Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-7047979386",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7047979386",
      "line": "Tomb of Baron Bliss, a mapped place for the game."
    },
    {
      "key": "osm-way-259180757",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/259180757",
      "line": "Holy Redeemer Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-375289101",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/375289101",
      "line": "St. Martin de Porres Catholic Church, a mapped place for the game."
    },
    {
      "key": "osm-way-259179297",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/259179297",
      "line": "Museum of Belize, a mapped place for the game."
    },
    {
      "key": "osm-node-12596381963",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12596381963",
      "line": "Di Plaze, a mapped place for the game."
    },
    {
      "key": "osm-relation-8504547",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/8504547",
      "line": "Kukumba Beach, a mapped place for the game."
    },
    {
      "key": "osm-way-376017484",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/376017484",
      "line": "Manatee Lookout Restaurant & Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-113653382",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/113653382",
      "line": "Digi Park, a mapped place for the game."
    },
    {
      "key": "osm-way-375230999",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/375230999",
      "line": "Wilton Park, a mapped place for the game."
    },
    {
      "key": "osm-way-961547974",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/961547974",
      "line": "Belize Medical Associates, a mapped place for the game."
    },
    {
      "key": "osm-way-1119389631",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1119389631",
      "line": "Belize Healthcare Partners Limited, a mapped place for the game."
    },
    {
      "key": "osm-way-961896200",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/961896200",
      "line": "Central America Health Sciences Belize Medical College, a mapped place for the game."
    },
    {
      "key": "osm-way-295702032",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/295702032",
      "line": "University of the West Indies, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10220703952",
      "ref": "node/10220703952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10238033981",
      "ref": "node/10238033981",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10245473932",
      "ref": "node/10245473932",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10245473940",
      "ref": "node/10245473940",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10763043634",
      "ref": "node/10763043634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10763043635",
      "ref": "node/10763043635",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10763043641",
      "ref": "node/10763043641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10763043642",
      "ref": "node/10763043642",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10764441206",
      "ref": "node/10764441206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10764451527",
      "ref": "node/10764451527",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10764451528",
      "ref": "node/10764451528",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10764765375",
      "ref": "node/10764765375",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10764765376",
      "ref": "node/10764765376",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10764765383",
      "ref": "node/10764765383",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10848020303",
      "ref": "node/10848020303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3795091441",
      "ref": "node/3795091441",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4542355535",
      "ref": "node/4542355535",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5792922954",
      "ref": "node/5792922954",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15074308",
      "ref": "relation/15074308",
      "kind": "water"
    },
    {
      "id": "water-relation-62834",
      "ref": "relation/62834",
      "kind": "water"
    },
    {
      "id": "water-relation-7366435",
      "ref": "relation/7366435",
      "kind": "water"
    },
    {
      "id": "water-way-29372831",
      "ref": "way/29372831",
      "kind": "water"
    },
    {
      "id": "water-way-30754144",
      "ref": "way/30754144",
      "kind": "water"
    },
    {
      "id": "water-way-747956367",
      "ref": "way/747956367",
      "kind": "water"
    },
    {
      "id": "water-way-747965459",
      "ref": "way/747965459",
      "kind": "water"
    },
    {
      "id": "water-way-747965461",
      "ref": "way/747965461",
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
