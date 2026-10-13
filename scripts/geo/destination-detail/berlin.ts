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
  "name": "Berlin",
  "box": [
    52.33650761006602,
    13.098664644603774,
    52.698269389933984,
    13.691597155396225
  ],
  "core": [
    52.47216827751651,
    13.321243761850258,
    52.562608722483496,
    13.469018038149741
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/21302157",
      "line": "Tiergarten, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1332424262",
      "line": "Café Sibylle, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/257708789",
      "line": "Hauptbibliothek Spandau, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/158262343",
      "line": "Unfallkrankenhaus Berlin, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/255109",
      "line": "Freizeitpark Lübars, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/20666721",
      "line": "Tempelhofer Hafen, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/24032288",
      "line": "Friedenskirche, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/564222901",
      "line": "Mexikoplatz; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/5856222352",
      "line": "Amt für Statistik Berlin-Brandenburg, a mapped place for the game."
    },
    {
      "key": "osm-way-291483445",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/291483445",
      "line": "Hochschule des Bundes für öffentliche Verwaltung/Akademie Auswärtiger Dienst, a mapped place for the game."
    },
    {
      "key": "osm-way-20593936",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/20593936",
      "line": "Mommsenstadion, a mapped place for the game."
    },
    {
      "key": "osm-node-279997440",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/279997440",
      "line": "Sowjetisches Ehrenmal, a mapped place for the game."
    },
    {
      "key": "osm-node-505058576",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/505058576",
      "line": "Kriegerdenkmal Viktoria (1890), a mapped place for the game."
    },
    {
      "key": "osm-node-1078680550",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1078680550",
      "line": "Battle of Großbeeren, a mapped place for the game."
    },
    {
      "key": "osm-way-26669855",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/26669855",
      "line": "Kirche Schönwalde-Dorf, a mapped place for the game."
    },
    {
      "key": "osm-way-46830254",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/46830254",
      "line": "Karmelitenkloster St. Teresia, a mapped place for the game."
    },
    {
      "key": "osm-way-26775078",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/26775078",
      "line": "Gemeinschaftskrankenhaus Havelhöhe, a mapped place for the game."
    },
    {
      "key": "osm-way-1442933370",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1442933370",
      "line": "Volkspark Lichtenrade, a mapped place for the game."
    },
    {
      "key": "osm-way-50239695",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/50239695",
      "line": "Zamenhofpark, a mapped place for the game."
    },
    {
      "key": "osm-node-1901759789",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1901759789",
      "line": "Fliegeberg, a mapped place for the game."
    },
    {
      "key": "osm-way-20980117",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/20980117",
      "line": "Gesundbrunnen-Center, a mapped place for the game."
    },
    {
      "key": "osm-way-24950668",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/24950668",
      "line": "Evangelisches Waldkrankenhaus Spandau, a mapped place for the game."
    },
    {
      "key": "osm-way-28505596",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/28505596",
      "line": "Forum Steglitz, a mapped place for the game."
    },
    {
      "key": "osm-way-277991410",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/277991410",
      "line": "Müggelturm, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10753377757",
      "ref": "node/10753377757",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10783728185",
      "ref": "node/10783728185",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11033146684",
      "ref": "node/11033146684",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11139437503",
      "ref": "node/11139437503",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11271428129",
      "ref": "node/11271428129",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12064869617",
      "ref": "node/12064869617",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12066355907",
      "ref": "node/12066355907",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12076941363",
      "ref": "node/12076941363",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12090104294",
      "ref": "node/12090104294",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12095712104",
      "ref": "node/12095712104",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12095976198",
      "ref": "node/12095976198",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12535154660",
      "ref": "node/12535154660",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12833712668",
      "ref": "node/12833712668",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12833819148",
      "ref": "node/12833819148",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12833942147",
      "ref": "node/12833942147",
      "kind": "neighbourhood"
    },
    {
      "id": "district-129648004",
      "ref": "node/129648004",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13051135004",
      "ref": "node/13051135004",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13051135006",
      "ref": "node/13051135006",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-163016",
      "ref": "relation/163016",
      "kind": "water"
    },
    {
      "id": "water-relation-173239",
      "ref": "relation/173239",
      "kind": "water"
    },
    {
      "id": "water-relation-334978",
      "ref": "relation/334978",
      "kind": "water"
    },
    {
      "id": "water-relation-4026",
      "ref": "relation/4026",
      "kind": "water"
    },
    {
      "id": "water-relation-451908",
      "ref": "relation/451908",
      "kind": "water"
    },
    {
      "id": "water-relation-4578498",
      "ref": "relation/4578498",
      "kind": "water"
    },
    {
      "id": "water-relation-5399",
      "ref": "relation/5399",
      "kind": "water"
    },
    {
      "id": "water-relation-5414",
      "ref": "relation/5414",
      "kind": "water"
    },
    {
      "id": "water-relation-5415",
      "ref": "relation/5415",
      "kind": "water"
    },
    {
      "id": "water-way-158521683",
      "ref": "way/158521683",
      "kind": "water"
    },
    {
      "id": "water-way-23066744",
      "ref": "way/23066744",
      "kind": "water"
    },
    {
      "id": "water-way-24211239",
      "ref": "way/24211239",
      "kind": "water"
    },
    {
      "id": "water-way-25881427",
      "ref": "way/25881427",
      "kind": "water"
    },
    {
      "id": "water-way-277545599",
      "ref": "way/277545599",
      "kind": "water"
    },
    {
      "id": "water-way-38437317",
      "ref": "way/38437317",
      "kind": "water"
    },
    {
      "id": "water-way-4436463",
      "ref": "way/4436463",
      "kind": "water"
    },
    {
      "id": "water-way-5202396",
      "ref": "way/5202396",
      "kind": "water"
    },
    {
      "id": "water-way-5202401",
      "ref": "way/5202401",
      "kind": "water"
    },
    {
      "id": "water-way-71375387",
      "ref": "way/71375387",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
