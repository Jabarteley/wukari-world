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
  "name": "Garapan",
  "box": [
    15.026204210066021,
    145.53451840606485,
    15.38796598993398,
    145.90720319393515
  ],
  "core": [
    15.161864877516505,
    145.674305408588,
    15.252305322483496,
    145.767416191412
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1306225955",
      "line": "Kinpachi Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/461386554",
      "line": "Northern Marianas College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/252530342",
      "line": "Commonwealth Healthcare Corporation, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/461385907",
      "line": "Saipan Botanical Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/810905538",
      "line": "Public Farmer's Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/12797505559",
      "line": "彩帆八幡神社, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/1306334756",
      "line": "CNMI Legislature; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/637982059",
      "line": "United States District Court for the Northern Mariana Islands, a mapped place for the game."
    },
    {
      "key": "osm-node-1306235400",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1306235400",
      "line": "Bird Island Overlook, a mapped place for the game."
    },
    {
      "key": "osm-way-165351798",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/165351798",
      "line": "North Field, a mapped place for the game."
    },
    {
      "key": "osm-node-2628135393",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2628135393",
      "line": "Suicide Cliff, a mapped place for the game."
    },
    {
      "key": "osm-node-5526308198",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5526308198",
      "line": "Japanese Lighthouse, a mapped place for the game."
    },
    {
      "key": "osm-way-345101524",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/345101524",
      "line": "Our Lady of Mount Carmel Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-358021658",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/358021658",
      "line": "Civic Center Park, a mapped place for the game."
    },
    {
      "key": "osm-way-469267324",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/469267324",
      "line": "Sugar King Park, a mapped place for the game."
    },
    {
      "key": "osm-way-1111959454",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1111959454",
      "line": "Kristo Rai Parish, a mapped place for the game."
    },
    {
      "key": "osm-node-10666101305",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/10666101305",
      "line": "Forbidden Island Lookout, a mapped place for the game."
    },
    {
      "key": "osm-node-2894726822",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2894726822",
      "line": "Overlook Point, a mapped place for the game."
    },
    {
      "key": "osm-way-643265134",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/643265134",
      "line": "Ador Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-1306334759",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1306334759",
      "line": "Coffee Care, a mapped place for the game."
    },
    {
      "key": "osm-node-1306225992",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/1306225992",
      "line": "DFS Galleria, a mapped place for the game."
    },
    {
      "key": "osm-way-257214501",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/257214501",
      "line": "Thursday Night Market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-9812788474",
      "ref": "node/9812788474",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788482",
      "ref": "node/9812788482",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788488",
      "ref": "node/9812788488",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788475",
      "ref": "node/9812788475",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788476",
      "ref": "node/9812788476",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788477",
      "ref": "node/9812788477",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788478",
      "ref": "node/9812788478",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788479",
      "ref": "node/9812788479",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788480",
      "ref": "node/9812788480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788481",
      "ref": "node/9812788481",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788483",
      "ref": "node/9812788483",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788484",
      "ref": "node/9812788484",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788485",
      "ref": "node/9812788485",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788486",
      "ref": "node/9812788486",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788487",
      "ref": "node/9812788487",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788489",
      "ref": "node/9812788489",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788490",
      "ref": "node/9812788490",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9812788493",
      "ref": "node/9812788493",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11369147",
      "ref": "relation/11369147",
      "kind": "water"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
