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
  "name": "Sana'a",
  "box": [
    15.172976010066021,
    44.01940962662008,
    15.53473778993398,
    44.392358573379916
  ],
  "core": [
    15.308636677516505,
    44.15929601412881,
    15.399077122483495,
    44.252472185871184
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4298023081",
      "line": "Bab Alyemen Bus Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13469712992",
      "line": "مطاعم وبروست ليالي العرب, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1089200534",
      "line": "Lebanese International University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/87318804",
      "line": "Al Sabeen Maternal Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/809877716",
      "line": "منتزه, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1029288503",
      "line": "سوق همدان, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/554691321",
      "line": "Al-Saleh Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/60750456",
      "line": "passport; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/1222640373",
      "line": "San`a' Net Control Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-1089201817",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1089201817",
      "line": "Sanaa University, a mapped place for the game."
    },
    {
      "key": "osm-node-4190366692",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4190366692",
      "line": "لؤلؤة, a mapped place for the game."
    },
    {
      "key": "osm-way-1530760059",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1530760059",
      "line": "Dar al Hajar, a mapped place for the game."
    },
    {
      "key": "osm-way-827493201",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/827493201",
      "line": "Queen Arwa University, a mapped place for the game."
    },
    {
      "key": "osm-node-4858907323",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4858907323",
      "line": "جامعة العلوم الحديثة, a mapped place for the game."
    },
    {
      "key": "osm-node-4510701911",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4510701911",
      "line": "Yemen Military Museum, a mapped place for the game."
    },
    {
      "key": "osm-node-4298021192",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4298021192",
      "line": "Masjid Al Ansaar, a mapped place for the game."
    },
    {
      "key": "osm-way-120230549",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/120230549",
      "line": "Al Thawra Revolution Hospital, a mapped place for the game."
    },
    {
      "key": "osm-relation-908271",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/908271",
      "line": "Old Great Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-11554098569",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11554098569",
      "line": "مزارع شايف عنان, a mapped place for the game."
    },
    {
      "key": "osm-node-13932020101",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13932020101",
      "line": "بسطه أحمد خادم, a mapped place for the game."
    },
    {
      "key": "osm-node-8583463118",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/8583463118",
      "line": "Dam, a mapped place for the game."
    },
    {
      "key": "osm-node-13952707101",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/13952707101",
      "line": "سوق البدروم, a mapped place for the game."
    },
    {
      "key": "osm-way-1089171473",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1089171473",
      "line": "كفتيريا الؤلؤة, a mapped place for the game."
    },
    {
      "key": "osm-node-13384264101",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/13384264101",
      "line": "سوق القات, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1222627611",
      "ref": "node/1222627611",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1222641854",
      "ref": "node/1222641854",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1222646712",
      "ref": "node/1222646712",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1226371256",
      "ref": "node/1226371256",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1226371299",
      "ref": "node/1226371299",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11962871869",
      "ref": "node/11962871869",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1222644490",
      "ref": "node/1222644490",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1222651480",
      "ref": "node/1222651480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1222651548",
      "ref": "node/1222651548",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13469713196",
      "ref": "node/13469713196",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4326075200",
      "ref": "node/4326075200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4394996894",
      "ref": "node/4394996894",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5499307323",
      "ref": "node/5499307323",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5696776386",
      "ref": "node/5696776386",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5714910639",
      "ref": "node/5714910639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5805306455",
      "ref": "node/5805306455",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5805325353",
      "ref": "node/5805325353",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5954569278",
      "ref": "node/5954569278",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
