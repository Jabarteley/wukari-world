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
  "name": "City of San Marino",
  "box": [
    43.75551871006602,
    12.196443999539392,
    44.11728048993398,
    12.696954200460608
  ],
  "core": [
    43.89117937751651,
    12.38427845949435,
    43.981619822483495,
    12.50911974050565
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4167919194",
      "line": "San Marino - Rimini, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4594496993",
      "line": "Amici, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/7190476762",
      "line": "Università della Repubblica di San Marino, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/86953828",
      "line": "Ospedale di Stato - Istituto per la Sicurezza Sociale, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/770370670",
      "line": "Parco delle Fontane Azzurre, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/32476610",
      "line": "Azzurro, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/59305134",
      "line": "Basilica di San Marino, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/59305139",
      "line": "Palazzo Pubblico; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/2094173919",
      "line": "Casa del Castello di Domagnano, a mapped place for the game."
    },
    {
      "key": "osm-node-11495475848",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/11495475848",
      "line": "Dipartimento Scienze Umane, a mapped place for the game."
    },
    {
      "key": "osm-way-364803296",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/364803296",
      "line": "Stadio di Baseball di Serravalle, a mapped place for the game."
    },
    {
      "key": "osm-way-59329675",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/59329675",
      "line": "Torre del Montale, a mapped place for the game."
    },
    {
      "key": "osm-way-228380042",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/228380042",
      "line": "Stadio Serravalle B, a mapped place for the game."
    },
    {
      "key": "osm-way-59965584",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/59965584",
      "line": "San Marino Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-59305144",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/59305144",
      "line": "Guaita Castle, a mapped place for the game."
    },
    {
      "key": "osm-way-59329686",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/59329686",
      "line": "De La Fratta Castle, a mapped place for the game."
    },
    {
      "key": "osm-node-7194430374",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7194430374",
      "line": "Sanmarino Shinto Shrine, a mapped place for the game."
    },
    {
      "key": "osm-way-59316453",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/59316453",
      "line": "Santuario della Beata Vergine della Consolazione, a mapped place for the game."
    },
    {
      "key": "osm-node-12903309263",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12903309263",
      "line": "Street Bar, a mapped place for the game."
    },
    {
      "key": "osm-node-10718518174",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10718518174",
      "line": "Ci vediamo da Mario, a mapped place for the game."
    },
    {
      "key": "osm-way-614075300",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/614075300",
      "line": "Parco Montelupo, a mapped place for the game."
    },
    {
      "key": "osm-way-770859631",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/770859631",
      "line": "Parco Marino Nicolini 1° Maestro, a mapped place for the game."
    },
    {
      "key": "osm-way-32476612",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/32476612",
      "line": "Centro Atlante, a mapped place for the game."
    },
    {
      "key": "osm-node-5840181047",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5840181047",
      "line": "Università degli studi, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1011585002",
      "ref": "node/1011585002",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2937180259",
      "ref": "node/2937180259",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280982186",
      "ref": "node/280982186",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1257055653",
      "ref": "node/1257055653",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280981926",
      "ref": "node/280981926",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280982562",
      "ref": "node/280982562",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280982054",
      "ref": "node/280982054",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280982509",
      "ref": "node/280982509",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3698407349",
      "ref": "node/3698407349",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280981402",
      "ref": "node/280981402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-280981529",
      "ref": "node/280981529",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291464593",
      "ref": "node/291464593",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291464596",
      "ref": "node/291464596",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7129095427",
      "ref": "node/7129095427",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3688465696",
      "ref": "node/3688465696",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7129095426",
      "ref": "node/7129095426",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7129145345",
      "ref": "node/7129145345",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6555340693",
      "ref": "node/6555340693",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-27237090",
      "ref": "way/27237090",
      "kind": "water"
    },
    {
      "id": "water-way-27471794",
      "ref": "way/27471794",
      "kind": "water"
    },
    {
      "id": "water-way-27473088",
      "ref": "way/27473088",
      "kind": "water"
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
