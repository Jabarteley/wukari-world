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
  "name": "Colombo",
  "box": [
    6.757980510066022,
    79.67314217675448,
    7.189803951265498,
    80.03525882324553
  ],
  "core": [
    6.893641177516506,
    79.8089491751559,
    6.984081622483495,
    79.8994518248441
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5847983789",
      "line": "Maradana Railway Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/913095573",
      "line": "Jade Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/4237557729",
      "line": "Institute of Engineering Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/287215555",
      "line": "North Colombo Teaching Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/594531505",
      "line": "Weras Ganga Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/208814352",
      "line": "Majestic City Shopping Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1105378926",
      "line": "Sumatipāla Nā Himi Hermitage, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/13887429",
      "line": "Town Hall, Colombo; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/330906531",
      "line": "Parliament of Sri Lanka, a mapped place for the game."
    },
    {
      "key": "osm-way-193287676",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/193287676",
      "line": "Buddhist & Pali University of Sri Lanka, a mapped place for the game."
    },
    {
      "key": "osm-way-51208063",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/51208063",
      "line": "P.Saravanamuththu Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-48893708",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48893708",
      "line": "National Zoological Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-235938853",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/235938853",
      "line": "Pearl Residences, a mapped place for the game."
    },
    {
      "key": "osm-way-98391431",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/98391431",
      "line": "St. Sebastian College, a mapped place for the game."
    },
    {
      "key": "osm-way-441724047",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/441724047",
      "line": "President's House, a mapped place for the game."
    },
    {
      "key": "osm-way-102650989",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/102650989",
      "line": "Lanka Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-51193146",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/51193146",
      "line": "Sugathadasa Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-1252487341",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1252487341",
      "line": "St. Matthias Church, a mapped place for the game."
    },
    {
      "key": "osm-way-1023143295",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1023143295",
      "line": "St. Lawrence Church, a mapped place for the game."
    },
    {
      "key": "osm-way-303909847",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/303909847",
      "line": "Independence Memorial Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-27712165",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/27712165",
      "line": "Galle Face Green, a mapped place for the game."
    },
    {
      "key": "osm-way-665919418",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665919418",
      "line": "R. Premadasa International Cricket Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-666495757",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/666495757",
      "line": "Colombo City Center, a mapped place for the game."
    },
    {
      "key": "osm-node-618557052",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/618557052",
      "line": "Western Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-3666779276",
      "ref": "node/3666779276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3666779279",
      "ref": "node/3666779279",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3954317299",
      "ref": "node/3954317299",
      "kind": "neighbourhood"
    },
    {
      "id": "district-618529243",
      "ref": "node/618529243",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1249855863",
      "ref": "node/1249855863",
      "kind": "neighbourhood"
    },
    {
      "id": "district-129616333",
      "ref": "node/129616333",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13411077637",
      "ref": "node/13411077637",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13664687133",
      "ref": "node/13664687133",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13684457335",
      "ref": "node/13684457335",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13684595740",
      "ref": "node/13684595740",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1534160807",
      "ref": "node/1534160807",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1670782558",
      "ref": "node/1670782558",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1814503080",
      "ref": "node/1814503080",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1837184843",
      "ref": "node/1837184843",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1838453747",
      "ref": "node/1838453747",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1839506739",
      "ref": "node/1839506739",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1839510178",
      "ref": "node/1839510178",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1841080725",
      "ref": "node/1841080725",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-10239507",
      "ref": "relation/10239507",
      "kind": "water"
    },
    {
      "id": "water-way-23494553",
      "ref": "way/23494553",
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
