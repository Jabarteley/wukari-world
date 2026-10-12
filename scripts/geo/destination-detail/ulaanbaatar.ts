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
  "name": "Ulaanbaatar",
  "box": [
    47.6378719555033,
    106.64868213295743,
    48.09934848993398,
    107.18672106704257
  ],
  "core": [
    47.873247377516506,
    106.85062355145108,
    47.96368782248349,
    106.98477964854892
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/566997277",
      "line": "Ulan Bator, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/236503062",
      "line": "Castle, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/241407940",
      "line": "Mongolian International University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1021984771",
      "line": "Хавдар судлалын үндэсний төв, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/669481264",
      "line": "Үндэсний Цэцэрлэгт Хүрээлэн ᠦᠨᠳᠦᠰᠦᠨ ᠦ ᠴᠡᠴᠡᠷᠯᠢᠭ᠍ᠲᠤ ᠬᠦᠷᠢᠶᠡᠯᠡᠩ, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/894732836",
      "line": "Хүннү молл, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/894883931",
      "line": "Tolgoit Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/15638347",
      "line": "Sukhbaatar Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/3846205757",
      "line": "Ministry of Health, a mapped place for the game."
    },
    {
      "key": "osm-way-977856902",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/977856902",
      "line": "Mongolian State University of Agriculture, a mapped place for the game."
    },
    {
      "key": "osm-node-2355050258",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2355050258",
      "line": "Tsetsee Gun, a mapped place for the game."
    },
    {
      "key": "osm-way-271049504",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/271049504",
      "line": "Manjusri Monastery, a mapped place for the game."
    },
    {
      "key": "osm-node-2293321279",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2293321279",
      "line": "Natural History Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-9832193961",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9832193961",
      "line": "Caffe Bene, a mapped place for the game."
    },
    {
      "key": "osm-node-1367931400",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1367931400",
      "line": "Holy Trinity Orthodox Church, a mapped place for the game."
    },
    {
      "key": "osm-way-129230039",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/129230039",
      "line": "The Natural History Museum of Mongolia, a mapped place for the game."
    },
    {
      "key": "osm-way-961119183",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/961119183",
      "line": "MFF Football Centre, a mapped place for the game."
    },
    {
      "key": "osm-node-2321962180",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2321962180",
      "line": "Coffee Felows, a mapped place for the game."
    },
    {
      "key": "osm-node-2317267389",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2317267389",
      "line": "Dashchoilin Monastery, a mapped place for the game."
    },
    {
      "key": "osm-relation-21094827",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/21094827",
      "line": "National University of Mongolia, a mapped place for the game."
    },
    {
      "key": "osm-way-108195289",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/108195289",
      "line": "Central Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-3083953775",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/3083953775",
      "line": "Ach Medical University, a mapped place for the game."
    },
    {
      "key": "osm-way-972441327",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/972441327",
      "line": "Intermed hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-1495767145",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1495767145",
      "line": "Ulaanbaatar Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10588508755",
      "ref": "node/10588508755",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11016639699",
      "ref": "node/11016639699",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1268520487",
      "ref": "node/1268520487",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2639497234",
      "ref": "node/2639497234",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2639499830",
      "ref": "node/2639499830",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2639505539",
      "ref": "node/2639505539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2639520470",
      "ref": "node/2639520470",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2639523049",
      "ref": "node/2639523049",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3259526214",
      "ref": "node/3259526214",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4290728384",
      "ref": "node/4290728384",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5289269880",
      "ref": "node/5289269880",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5389517628",
      "ref": "node/5389517628",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5389517629",
      "ref": "node/5389517629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5578052566",
      "ref": "node/5578052566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9157189883",
      "ref": "node/9157189883",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9299775488",
      "ref": "node/9299775488",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9299775489",
      "ref": "node/9299775489",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9299775491",
      "ref": "node/9299775491",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
