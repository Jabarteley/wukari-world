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
  "name": "Prague",
  "box": [
    49.90658451006602,
    14.140176742559426,
    50.26834628993398,
    14.702330257440575
  ],
  "core": [
    50.042245177516506,
    14.351183724278364,
    50.13268562248349,
    14.491323275721637
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/24569684",
      "line": "I. P. Pavlova, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7242001415",
      "line": "Cyberdog, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/1270591804",
      "line": "Infocentrum s knihovnou, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/319062309",
      "line": "Psychiatrická nemocnice Bohnice, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/7735080",
      "line": "Pietní území Lidice, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/250416859",
      "line": "Westfield Černý Most, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "relation/1688416",
      "line": "monastýr sv. Václava a sv. Ludmily, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/432429276",
      "line": "Úřad městské části Praha - Újezd; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/10241648078",
      "line": "Obecní úřad Borek, a mapped place for the game."
    },
    {
      "key": "osm-node-13922405680",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/13922405680",
      "line": "Panevropská univerzita, a mapped place for the game."
    },
    {
      "key": "osm-way-1016659823",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1016659823",
      "line": "rozhledna Hradiště - Závist, a mapped place for the game."
    },
    {
      "key": "osm-node-963907924",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/963907924",
      "line": "zřícenina hrádku Karlík, a mapped place for the game."
    },
    {
      "key": "osm-way-37111399",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/37111399",
      "line": "kostel sv. Jakuba Většího, a mapped place for the game."
    },
    {
      "key": "osm-way-51001576",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/51001576",
      "line": "Zámek Lobkovice, a mapped place for the game."
    },
    {
      "key": "osm-way-258815975",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/258815975",
      "line": "zámek Štiřín, a mapped place for the game."
    },
    {
      "key": "osm-way-139745554",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/139745554",
      "line": "sv. Kliment, a mapped place for the game."
    },
    {
      "key": "osm-node-3481221272",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3481221272",
      "line": "vyhlídka na Housle, a mapped place for the game."
    },
    {
      "key": "osm-way-4019771",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/4019771",
      "line": "Metropole Zličín, a mapped place for the game."
    },
    {
      "key": "osm-way-23093458",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/23093458",
      "line": "IKEM, a mapped place for the game."
    },
    {
      "key": "osm-way-1050400363",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1050400363",
      "line": "OC Spektrum, a mapped place for the game."
    },
    {
      "key": "osm-way-1190106231",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1190106231",
      "line": "Korunka, a mapped place for the game."
    },
    {
      "key": "osm-relation-7096099",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/7096099",
      "line": "park Maxe van der Stoela, a mapped place for the game."
    },
    {
      "key": "osm-way-34963462",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/34963462",
      "line": "Přímské náměstí, a mapped place for the game."
    },
    {
      "key": "osm-way-28310118",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/28310118",
      "line": "Metropolitan University of Prague, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10007090188",
      "ref": "node/10007090188",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10585192123",
      "ref": "node/10585192123",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11970162900",
      "ref": "node/11970162900",
      "kind": "neighbourhood"
    },
    {
      "id": "district-132862237",
      "ref": "node/132862237",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1551164659",
      "ref": "node/1551164659",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1576210182",
      "ref": "node/1576210182",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1600669549",
      "ref": "node/1600669549",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1600879844",
      "ref": "node/1600879844",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1600879848",
      "ref": "node/1600879848",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601195567",
      "ref": "node/1601195567",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601196624",
      "ref": "node/1601196624",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601196634",
      "ref": "node/1601196634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601196656",
      "ref": "node/1601196656",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601837873",
      "ref": "node/1601837873",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601837874",
      "ref": "node/1601837874",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601837884",
      "ref": "node/1601837884",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601837891",
      "ref": "node/1601837891",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1601837899",
      "ref": "node/1601837899",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
