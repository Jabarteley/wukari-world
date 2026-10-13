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
  "name": "Vaduz",
  "box": [
    46.95840531006602,
    9.257768935005949,
    47.32016708993398,
    9.787823464994052
  ],
  "core": [
    47.09406597751651,
    9.45670889021349,
    47.184506422483494,
    9.58888350978651
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1353606655",
      "line": "Nendeln, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/326059436",
      "line": "Restaurant Torkel, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/280027827",
      "line": "Private Universität im Fürstentum Liechtenstein (UFL), a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/486420157",
      "line": "Liechtensteinisches Landesspital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/480023561",
      "line": "Wasserpark Walserbünt, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1058105046",
      "line": "Mühleholzmarkt, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/165294627",
      "line": "Jubiläumskirche, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/28712183",
      "line": "Rathaus Vaduz; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/935278222",
      "line": "Landtag of the Principality of Liechtenstein, a mapped place for the game."
    },
    {
      "key": "osm-way-484271148",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/484271148",
      "line": "Universität Liechtenstein, a mapped place for the game."
    },
    {
      "key": "osm-node-300209696",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/300209696",
      "line": "Mattlerjoch, a mapped place for the game."
    },
    {
      "key": "osm-node-5752404321",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5752404321",
      "line": "Russian Monument, a mapped place for the game."
    },
    {
      "key": "osm-way-977381553",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/977381553",
      "line": "St. Fridolin, a mapped place for the game."
    },
    {
      "key": "osm-way-330503932",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/330503932",
      "line": "Pfarrkirche Sankt Josef, a mapped place for the game."
    },
    {
      "key": "osm-node-354435079",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/354435079",
      "line": "Vogelparadies Birka, a mapped place for the game."
    },
    {
      "key": "osm-way-979391092",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/979391092",
      "line": "Biedermannhaus, a mapped place for the game."
    },
    {
      "key": "osm-way-491625232",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/491625232",
      "line": "Freizeitpark Blumenau, a mapped place for the game."
    },
    {
      "key": "osm-node-498566336",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/498566336",
      "line": "Wildschloss, a mapped place for the game."
    },
    {
      "key": "osm-way-298855541",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/298855541",
      "line": "Alp Valüna-Säss, a mapped place for the game."
    },
    {
      "key": "osm-node-11381640081",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11381640081",
      "line": "Rhistaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-1324954458",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1324954458",
      "line": "Kräutergarten, a mapped place for the game."
    },
    {
      "key": "osm-way-485353483",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/485353483",
      "line": "Universität Liechtenstein - Wachterhaus, a mapped place for the game."
    },
    {
      "key": "osm-way-243055673",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/243055673",
      "line": "Familienpark Äule, a mapped place for the game."
    },
    {
      "key": "osm-way-47003798",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/47003798",
      "line": "Aussenstelle der Universität Liechtenstein - Wachterhaus, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-4523868554",
      "ref": "node/4523868554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4831360283",
      "ref": "node/4831360283",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6397222990",
      "ref": "node/6397222990",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3577169505",
      "ref": "node/3577169505",
      "kind": "neighbourhood"
    },
    {
      "id": "district-935278226",
      "ref": "node/935278226",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4740289308",
      "ref": "node/4740289308",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4458494629",
      "ref": "node/4458494629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240106262",
      "ref": "node/240106262",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240092661",
      "ref": "node/240092661",
      "kind": "neighbourhood"
    },
    {
      "id": "district-32011242",
      "ref": "node/32011242",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1796218506",
      "ref": "node/1796218506",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240046176",
      "ref": "node/240046176",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240100249",
      "ref": "node/240100249",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3022807519",
      "ref": "node/3022807519",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240070712",
      "ref": "node/240070712",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240080206",
      "ref": "node/240080206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6388202794",
      "ref": "node/6388202794",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3022807520",
      "ref": "node/3022807520",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
