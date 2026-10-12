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
  "name": "Auckland",
  "box": [
    -37.03297588993398,
    174.5381211639701,
    -36.67121411006602,
    174.9882394360299
  ],
  "core": [
    -36.89731522248349,
    174.70701568792143,
    -36.806874777516505,
    174.81934491207855
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/746319586",
      "line": "Glen Eden, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/24010567",
      "line": "Cornwall Park Bistro, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/51949995",
      "line": "Massey University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/13239497",
      "line": "Middlemore Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/9796353",
      "line": "Stockade Hill, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/21254287",
      "line": "Ormiston Town Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/396119569",
      "line": "Saint Mary's Old Convent Chapel, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/19951542",
      "line": "Freyberg Place; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/9725967957",
      "line": "Inland Revenue North Shore - Takapuna Office (IRD), a mapped place for the game."
    },
    {
      "key": "osm-relation-16177458",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/16177458",
      "line": "Auckland Institute of Studies, a mapped place for the game."
    },
    {
      "key": "osm-way-33871472",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/33871472",
      "line": "Barfoot & Thompson Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-4258039707",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4258039707",
      "line": "HMS Orpheus Graves, a mapped place for the game."
    },
    {
      "key": "osm-way-68312672",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/68312672",
      "line": "Fred Taylor Park, a mapped place for the game."
    },
    {
      "key": "osm-way-97144423",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/97144423",
      "line": "Ōtuataua Stonefields Historic Reserve, a mapped place for the game."
    },
    {
      "key": "osm-way-680869064",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/680869064",
      "line": "Toroa, a mapped place for the game."
    },
    {
      "key": "osm-way-339310375",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/339310375",
      "line": "Nathan Homestead, a mapped place for the game."
    },
    {
      "key": "osm-way-11019403",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/11019403",
      "line": "Glenfield Mall, a mapped place for the game."
    },
    {
      "key": "osm-relation-9089456",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/9089456",
      "line": "Sylvia Park, a mapped place for the game."
    },
    {
      "key": "osm-node-2006136519",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2006136519",
      "line": "Parkinsons Lookout, a mapped place for the game."
    },
    {
      "key": "osm-way-336630313",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/336630313",
      "line": "St Barnabas Anglican Church, a mapped place for the game."
    },
    {
      "key": "osm-way-26155148",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/26155148",
      "line": "Go Media Stadium / Mount Smart Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-930842670",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/930842670",
      "line": "Auckland New Zealand Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-58379525",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/58379525",
      "line": "North Shore Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-32868818",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/32868818",
      "line": "Auckland City Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1007092928",
      "ref": "node/1007092928",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10286572471",
      "ref": "node/10286572471",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10309782440",
      "ref": "node/10309782440",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11225896300",
      "ref": "node/11225896300",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13041860751",
      "ref": "node/13041860751",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1305617739",
      "ref": "node/1305617739",
      "kind": "neighbourhood"
    },
    {
      "id": "district-149656457",
      "ref": "node/149656457",
      "kind": "neighbourhood"
    },
    {
      "id": "district-149660276",
      "ref": "node/149660276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-149667569",
      "ref": "node/149667569",
      "kind": "neighbourhood"
    },
    {
      "id": "district-149668039",
      "ref": "node/149668039",
      "kind": "neighbourhood"
    },
    {
      "id": "district-149668277",
      "ref": "node/149668277",
      "kind": "neighbourhood"
    },
    {
      "id": "district-149672666",
      "ref": "node/149672666",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158370163",
      "ref": "node/158370163",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158814891",
      "ref": "node/158814891",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1602047111",
      "ref": "node/1602047111",
      "kind": "neighbourhood"
    },
    {
      "id": "district-160514252",
      "ref": "node/160514252",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2149639055",
      "ref": "node/2149639055",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2168511066",
      "ref": "node/2168511066",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-14732359",
      "ref": "relation/14732359",
      "kind": "water"
    },
    {
      "id": "water-relation-18477157",
      "ref": "relation/18477157",
      "kind": "water"
    },
    {
      "id": "water-relation-2925575",
      "ref": "relation/2925575",
      "kind": "water"
    },
    {
      "id": "water-way-1219593245",
      "ref": "way/1219593245",
      "kind": "water"
    },
    {
      "id": "water-way-1221215982",
      "ref": "way/1221215982",
      "kind": "water"
    },
    {
      "id": "water-way-27010269",
      "ref": "way/27010269",
      "kind": "water"
    },
    {
      "id": "water-way-4847408",
      "ref": "way/4847408",
      "kind": "water"
    },
    {
      "id": "water-way-615657613",
      "ref": "way/615657613",
      "kind": "water"
    },
    {
      "id": "water-way-757744313",
      "ref": "way/757744313",
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
