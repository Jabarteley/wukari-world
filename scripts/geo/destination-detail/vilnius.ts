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
  "name": "Vilnius",
  "box": [
    54.50616491006602,
    24.970706513008302,
    54.86792668993398,
    25.595115686991697
  ],
  "core": [
    54.64182557751651,
    25.205121491296982,
    54.73226602248349,
    25.360700708703018
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/31451531",
      "line": "Lentvaris, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/31453209",
      "line": "Neringa Restoranas, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/66631698",
      "line": "Vilniaus technologijų, verslo ir žemės ūkio mokykla, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/25892959",
      "line": "Respublikinė Vilniaus psichiatrijos ligoninė, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/396356286",
      "line": "Žalgiris 600, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/9054286",
      "line": "Gariūnai Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/85627567",
      "line": "Sudervės Švč. Trejybės bažnyčia, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1485530707",
      "line": "Tibeto skveras; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/281802201",
      "line": "Vilniaus miškų urėdija, a mapped place for the game."
    },
    {
      "key": "osm-node-267533451",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/267533451",
      "line": "Vilniaus Gedimino technikos universiteto Elektronikos fakultetas, a mapped place for the game."
    },
    {
      "key": "osm-node-1758423764",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1758423764",
      "line": "Papiškių piliakalnis, a mapped place for the game."
    },
    {
      "key": "osm-node-1764384946",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1764384946",
      "line": "Mažosios Riešės piliakalnis, a mapped place for the game."
    },
    {
      "key": "osm-node-2788684638",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2788684638",
      "line": "Liubavas Manor, a mapped place for the game."
    },
    {
      "key": "osm-node-2964272255",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2964272255",
      "line": "Mūrininkų piliakalnis, a mapped place for the game."
    },
    {
      "key": "osm-way-275916982",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/275916982",
      "line": "Parudaminio Kristaus Atsimainymo bažnyčia, a mapped place for the game."
    },
    {
      "key": "osm-way-93867305",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/93867305",
      "line": "Rykantų Švč. Trejybės bažnyčia, a mapped place for the game."
    },
    {
      "key": "osm-node-4515277514",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4515277514",
      "line": "TV Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-877412367",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/877412367",
      "line": "Vilniaus universiteto Matematikos ir informatikos fakultetas, a mapped place for the game."
    },
    {
      "key": "osm-relation-8140496",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/8140496",
      "line": "Vilniaus miesto klinikinė ligoninė, a mapped place for the game."
    },
    {
      "key": "osm-node-738082549",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/738082549",
      "line": "Pūčkorių atodanga, a mapped place for the game."
    },
    {
      "key": "osm-way-581534617",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/581534617",
      "line": "Panerių skulptūrų parkas, a mapped place for the game."
    },
    {
      "key": "osm-relation-3662657",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/3662657",
      "line": "Vingis Park, a mapped place for the game."
    },
    {
      "key": "osm-way-38883021",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/38883021",
      "line": "Vilniaus dizaino kolegija, a mapped place for the game."
    },
    {
      "key": "osm-way-630196432",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/630196432",
      "line": "Republican Vilnius University Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-103182646",
      "ref": "node/103182646",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1118713936",
      "ref": "node/1118713936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11599029627",
      "ref": "node/11599029627",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11828226518",
      "ref": "node/11828226518",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11828226520",
      "ref": "node/11828226520",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11831480430",
      "ref": "node/11831480430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11882118196",
      "ref": "node/11882118196",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11891919433",
      "ref": "node/11891919433",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11891963716",
      "ref": "node/11891963716",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11892300206",
      "ref": "node/11892300206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12008087507",
      "ref": "node/12008087507",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12008087512",
      "ref": "node/12008087512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12008087515",
      "ref": "node/12008087515",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12008087523",
      "ref": "node/12008087523",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12008087524",
      "ref": "node/12008087524",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12008087530",
      "ref": "node/12008087530",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12048099418",
      "ref": "node/12048099418",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12048099420",
      "ref": "node/12048099420",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1174604",
      "ref": "relation/1174604",
      "kind": "water"
    },
    {
      "id": "water-relation-1706854",
      "ref": "relation/1706854",
      "kind": "water"
    },
    {
      "id": "water-relation-2181751",
      "ref": "relation/2181751",
      "kind": "water"
    },
    {
      "id": "water-relation-2885277",
      "ref": "relation/2885277",
      "kind": "water"
    },
    {
      "id": "water-relation-2893485",
      "ref": "relation/2893485",
      "kind": "water"
    },
    {
      "id": "water-relation-3065359",
      "ref": "relation/3065359",
      "kind": "water"
    },
    {
      "id": "water-relation-3251121",
      "ref": "relation/3251121",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
