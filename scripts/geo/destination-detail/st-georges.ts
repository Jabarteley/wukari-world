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
  "name": "St. George's",
  "box": [
    11.87265221006602,
    -61.93564240520758,
    12.234413989933978,
    -61.567967594792414
  ],
  "core": [
    12.008312877516504,
    -61.79774089617561,
    12.098753322483494,
    -61.705869103824384
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/617899602",
      "line": "St George's Bus Terminus, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5148288522",
      "line": "By the Sea, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/383802717",
      "line": "St George's University Grand Anse Campus, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/487428150",
      "line": "New Hampshire Medical Centre, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/383803426",
      "line": "Camerhogne Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2440883294",
      "line": "Gouyave Fish Friday, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/383927620",
      "line": "Cathedrale of the Immaculate Conception, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/385939410"
      },
      "ref": "way/385939410",
      "line": "Grenville Magistrates Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/877684637",
      "line": "Parliament of Grenada, a mapped place for the game."
    },
    {
      "key": "osm-way-435187821",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/435187821",
      "line": "McDonald College, a mapped place for the game."
    },
    {
      "key": "osm-node-278214972",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/278214972",
      "line": "Point of Fort Jeudy, a mapped place for the game."
    },
    {
      "key": "osm-node-640501899",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/640501899",
      "line": "Concord Waterfalls, a mapped place for the game."
    },
    {
      "key": "osm-node-11159744805",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11159744805",
      "line": "Mt. Rich Petroglyphs, a mapped place for the game."
    },
    {
      "key": "osm-way-25532699",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/25532699",
      "line": "Grand Etang Lake, a mapped place for the game."
    },
    {
      "key": "osm-node-9858873098",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9858873098",
      "line": "Kirani James Athletic Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-5976587886",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5976587886",
      "line": "Explorer, a mapped place for the game."
    },
    {
      "key": "osm-node-11183191376",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11183191376",
      "line": "The Gazo, a mapped place for the game."
    },
    {
      "key": "osm-way-435911842",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/435911842",
      "line": "Aggie's Restaurant and Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-439102912",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/439102912",
      "line": "Princess Alice Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-154050153",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/154050153",
      "line": "WINDREF Research Institute, a mapped place for the game."
    },
    {
      "key": "osm-node-3752214509",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/3752214509",
      "line": "Mt. Hartman National Park and Dove Sanctuary, a mapped place for the game."
    },
    {
      "key": "osm-way-456252083",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/456252083",
      "line": "LaBorie Medical Station, a mapped place for the game."
    },
    {
      "key": "osm-way-451481996",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/451481996",
      "line": "Public access to L'Anse Aux Epines Beach, a mapped place for the game."
    },
    {
      "key": "osm-way-383799104",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/383799104",
      "line": "Excel Plaza, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-279035347",
      "ref": "node/279035347",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3115710584",
      "ref": "node/3115710584",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3115710587",
      "ref": "node/3115710587",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4580107319",
      "ref": "node/4580107319",
      "kind": "neighbourhood"
    },
    {
      "id": "district-705927850",
      "ref": "node/705927850",
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
