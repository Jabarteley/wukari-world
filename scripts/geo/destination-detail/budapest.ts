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
  "name": "Budapest",
  "box": [
    47.31699801006602,
    18.773394700609295,
    47.678759789933984,
    19.307081899390703
  ],
  "core": [
    47.45265867751651,
    18.97370022306515,
    47.5430991224835,
    19.106776376934846
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/158341222",
      "line": "Érd, autóbusz-állomás, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/276510449",
      "line": "Gerbeaud Confectionary, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/650854022",
      "line": "Vécsey Lakótelepi Könyvtár, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/550331255",
      "line": "Bajcsy-Zsilinszky Kórház és Rendelőintézet, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/2453420",
      "line": "Hősök tere, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/105668758",
      "line": "Campona, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/75922434",
      "line": "Keresztelő Szent János-templom, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/1764049",
      "line": "Városháza; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/3937951",
      "line": "Információs Hivatal, a mapped place for the game."
    },
    {
      "key": "osm-way-1522779060",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1522779060",
      "line": "Budapest University of Economics, Faculty of Finance and Accounting, a mapped place for the game."
    },
    {
      "key": "osm-node-3266194398",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3266194398",
      "line": "Nagy-Kevély, a mapped place for the game."
    },
    {
      "key": "osm-way-106940773",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/106940773",
      "line": "Veresegyház Bear Sanctuary, a mapped place for the game."
    },
    {
      "key": "osm-way-178875079",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/178875079",
      "line": "Barcza-kastély, a mapped place for the game."
    },
    {
      "key": "osm-node-1996688188",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1996688188",
      "line": "Zsíros-hegyi Turistaház romja, a mapped place for the game."
    },
    {
      "key": "osm-way-353853403",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/353853403",
      "line": "Nepomuki Szent János-kápolna, a mapped place for the game."
    },
    {
      "key": "osm-way-115967431",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/115967431",
      "line": "Szeplőtelen Fogantatás kápolna, a mapped place for the game."
    },
    {
      "key": "osm-way-117107475",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/117107475",
      "line": "Szent Imre tér, a mapped place for the game."
    },
    {
      "key": "osm-way-742639578",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/742639578",
      "line": "Mátyás király tér, a mapped place for the game."
    },
    {
      "key": "osm-way-376863655",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/376863655",
      "line": "Guckler Károly-kilátópont, a mapped place for the game."
    },
    {
      "key": "osm-relation-17929549",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/17929549",
      "line": "Szent László Kórház, a mapped place for the game."
    },
    {
      "key": "osm-relation-7883285",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/7883285",
      "line": "Szent János Kórház, a mapped place for the game."
    },
    {
      "key": "osm-way-24254652",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24254652",
      "line": "Flórián Üzletközpont, a mapped place for the game."
    },
    {
      "key": "osm-way-246472477",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/246472477",
      "line": "Magyar Táncművészeti Főiskola, a mapped place for the game."
    },
    {
      "key": "osm-way-26763446",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/26763446",
      "line": "Shopmark, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10694392582",
      "ref": "node/10694392582",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10992619500",
      "ref": "node/10992619500",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1123894827",
      "ref": "node/1123894827",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1249828619",
      "ref": "node/1249828619",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1289807258",
      "ref": "node/1289807258",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1289807259",
      "ref": "node/1289807259",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1289808692",
      "ref": "node/1289808692",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1289880212",
      "ref": "node/1289880212",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1289906047",
      "ref": "node/1289906047",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1289959261",
      "ref": "node/1289959261",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1314930973",
      "ref": "node/1314930973",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1344305936",
      "ref": "node/1344305936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1349175433",
      "ref": "node/1349175433",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1351138638",
      "ref": "node/1351138638",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1351142228",
      "ref": "node/1351142228",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1359328296",
      "ref": "node/1359328296",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1362591774",
      "ref": "node/1362591774",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13831312556",
      "ref": "node/13831312556",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-12252954",
      "ref": "relation/12252954",
      "kind": "water"
    },
    {
      "id": "water-relation-1616327",
      "ref": "relation/1616327",
      "kind": "water"
    },
    {
      "id": "water-relation-30036",
      "ref": "relation/30036",
      "kind": "water"
    },
    {
      "id": "water-relation-417508",
      "ref": "relation/417508",
      "kind": "water"
    },
    {
      "id": "water-way-449069353",
      "ref": "way/449069353",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
