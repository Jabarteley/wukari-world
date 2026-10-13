import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, inlandWaterQuery } from './queries.ts'

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
  "name": "Vienna",
  "box": [
    48.02747281006602,
    16.10195572445075,
    48.389234589933984,
    16.643052675549253
  ],
  "core": [
    48.16313347751651,
    16.305046721633115,
    48.2535739224835,
    16.43996167836689
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/8091317",
      "line": "Wien Ottakring, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/27556083",
      "line": "Anningerhaus, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/33319",
      "line": "Vienna University of Technology, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/261921616",
      "line": "Clinic Floridsdorf, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/38756181",
      "line": "Bill-Grah-Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/23087421",
      "line": "SCS Hauptgebäude, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/326086904",
      "line": "Waldandacht, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/1862583508",
      "line": "Gemeindeamt Ebergassing; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/5280053579",
      "line": "Landesgericht Korneuburg, a mapped place for the game."
    },
    {
      "key": "osm-way-1052649543",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1052649543",
      "line": "Pädagogische Hochschule Wien, a mapped place for the game."
    },
    {
      "key": "osm-way-179647766",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/179647766",
      "line": "Tempelbergwarte, a mapped place for the game."
    },
    {
      "key": "osm-node-2169420120",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2169420120",
      "line": "Lourdesgrotte, a mapped place for the game."
    },
    {
      "key": "osm-node-7734394361",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7734394361",
      "line": "Pestkreuz, a mapped place for the game."
    },
    {
      "key": "osm-way-32594130",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/32594130",
      "line": "Schloss Wolkersdorf, a mapped place for the game."
    },
    {
      "key": "osm-way-691761715",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/691761715",
      "line": "Hl. Anna, a mapped place for the game."
    },
    {
      "key": "osm-way-299960913",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/299960913",
      "line": "Pfarrkirche hl. Thomas, a mapped place for the game."
    },
    {
      "key": "osm-way-173239405",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/173239405",
      "line": "Schubertpark Maurer, a mapped place for the game."
    },
    {
      "key": "osm-way-26586105",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/26586105",
      "line": "Stefaniewarte, a mapped place for the game."
    },
    {
      "key": "osm-way-1077764991",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1077764991",
      "line": "Wettsteinpark, a mapped place for the game."
    },
    {
      "key": "osm-relation-3015485",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/3015485",
      "line": "Allianz Stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-10677471",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/10677471",
      "line": "Höhere technische Bundeslehr- und Versuchsanstalt Mödling, a mapped place for the game."
    },
    {
      "key": "osm-way-1013775833",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1013775833",
      "line": "Luftburg Kolarik, a mapped place for the game."
    },
    {
      "key": "osm-node-3762548985",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/3762548985",
      "line": "Vienna Conservatory, a mapped place for the game."
    },
    {
      "key": "osm-way-122867605",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/122867605",
      "line": "Großgrünmarkt, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11813458460",
      "ref": "node/11813458460",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1275277437",
      "ref": "node/1275277437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12929403479",
      "ref": "node/12929403479",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1348822872",
      "ref": "node/1348822872",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1348822873",
      "ref": "node/1348822873",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205918",
      "ref": "node/1349205918",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205929",
      "ref": "node/1349205929",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205939",
      "ref": "node/1349205939",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205952",
      "ref": "node/1349205952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205956",
      "ref": "node/1349205956",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205964",
      "ref": "node/1349205964",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205990",
      "ref": "node/1349205990",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205991",
      "ref": "node/1349205991",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205993",
      "ref": "node/1349205993",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205995",
      "ref": "node/1349205995",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205996",
      "ref": "node/1349205996",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205998",
      "ref": "node/1349205998",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349205999",
      "ref": "node/1349205999",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-18444",
      "ref": "relation/18444",
      "kind": "water"
    },
    {
      "id": "water-relation-32484",
      "ref": "relation/32484",
      "kind": "water"
    },
    {
      "id": "water-relation-65901",
      "ref": "relation/65901",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
