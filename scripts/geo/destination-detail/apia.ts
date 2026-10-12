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
  "name": "Apia",
  "box": [
    -14.015404389933979,
    -172.01724767390576,
    -13.65364261006602,
    -171.57792073229658
  ],
  "core": [
    -13.879743722483495,
    -171.8093619773912,
    -13.789303277516504,
    -171.71682902260878
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "way/142609045",
      "line": "Apia Ferry Terminal, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "way/1388403945",
      "line": "Restaurant and Bar, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "way/139537638",
      "line": "Mulivai Primary School Library and Technology Center, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "way/1386013126",
      "line": "Faleolo District Hospital, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "way/1445626446",
      "line": "Vaitele Park, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/1433132284",
      "line": "Satui Fleamarket, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/190324852",
      "line": "Apia Samoa Temple, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "way/1489966432",
      "line": "Sagaga 3 District Office; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "way/191009596",
      "line": "Fale Fono (Parliament House), a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-node-994447379",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/994447379",
      "line": "Wesley College, a mapped place for the game."
    },
    {
      "key": "osm-node-5586769194",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5586769194",
      "line": "Fuipisia Waterfalls, a mapped place for the game."
    },
    {
      "key": "osm-way-374404905",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/374404905",
      "line": "Robert Louis Stevenson's Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-141190639",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/141190639",
      "line": "Bahá'í House of Worship, a mapped place for the game."
    },
    {
      "key": "osm-node-1550608240",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1550608240",
      "line": "Sopo'aga Waterfalls, a mapped place for the game."
    },
    {
      "key": "osm-node-687792042",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/687792042",
      "line": "Museum of Samoa, a mapped place for the game."
    },
    {
      "key": "osm-way-1446121761",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1446121761",
      "line": "Lefaga District Medical Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-1459400895",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1459400895",
      "line": "Anoamaa District Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-6593037804",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6593037804",
      "line": "Lanoto'o Viewing Platform, a mapped place for the game."
    },
    {
      "key": "osm-node-689554231",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/689554231",
      "line": "Papapapaitai-falls, a mapped place for the game."
    },
    {
      "key": "osm-way-1124777338",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1124777338",
      "line": "Western Samoa Trust Estates Corporation Park, a mapped place for the game."
    },
    {
      "key": "osm-way-1418195769",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1418195769",
      "line": "Farmer Joes Tanumapua, a mapped place for the game."
    },
    {
      "key": "osm-way-1408954851",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1408954851",
      "line": "USP School of Agriculture & Food Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-142503177",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/142503177",
      "line": "SMDA Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-12898274696",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/12898274696",
      "line": "Laumua O Tumua Farmers Market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12462606446",
      "ref": "node/12462606446",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12462606447",
      "ref": "node/12462606447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12462606448",
      "ref": "node/12462606448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12462606449",
      "ref": "node/12462606449",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12462606450",
      "ref": "node/12462606450",
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
