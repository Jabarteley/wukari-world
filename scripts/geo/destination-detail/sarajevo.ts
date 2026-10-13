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
  "name": "Sarajevo",
  "box": [
    43.67619041006602,
    18.16269488288968,
    44.03795218993398,
    18.662534517110316
  ],
  "core": [
    43.81185107751651,
    18.350277293507478,
    43.902291522483495,
    18.47495210649252
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/942406094",
      "line": "Sarajevo, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/191388836",
      "line": "Inat kuća, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/793104957",
      "line": "International University in Sarajevo, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/375862791",
      "line": "Klinički centar Univerziteta u Sarajevu, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/10933440915",
      "line": "Bike Park Evolution, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7909276377",
      "line": "ARIA, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/778627920",
      "line": "Crkva Svetog Pantelejmona, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/44788668",
      "line": "Municipality of Novi Grad Sarajevo; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/183545337",
      "line": "Administrativni centar grada Istočno Sarajevo, a mapped place for the game."
    },
    {
      "key": "osm-node-6368640905",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6368640905",
      "line": "Muzička akademija Sarajevo, a mapped place for the game."
    },
    {
      "key": "osm-way-140482805",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/140482805",
      "line": "Grbavica Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-181388997",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/181388997",
      "line": "Visoki, a mapped place for the game."
    },
    {
      "key": "osm-way-224740343",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/224740343",
      "line": "Cekovića kuća, a mapped place for the game."
    },
    {
      "key": "osm-way-588118276",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/588118276",
      "line": "Dubrovnik Castle, a mapped place for the game."
    },
    {
      "key": "osm-way-28784587",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28784587",
      "line": "Vrelo Bosne, a mapped place for the game."
    },
    {
      "key": "osm-way-777985963",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/777985963",
      "line": "Crkva Svetog sveštenomučenika Petra Dabrobosanskog, a mapped place for the game."
    },
    {
      "key": "osm-way-23697320",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/23697320",
      "line": "Vraca Memorial Park, a mapped place for the game."
    },
    {
      "key": "osm-way-118942247",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/118942247",
      "line": "Église Saint-Joseph, a mapped place for the game."
    },
    {
      "key": "osm-way-23480568",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23480568",
      "line": "Olimpijski stadion Koševo – Asim Ferhatović-Hase, a mapped place for the game."
    },
    {
      "key": "osm-way-840206905",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/840206905",
      "line": "Univerzitet u Istočnom Sarajevu, a mapped place for the game."
    },
    {
      "key": "osm-way-27298226",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/27298226",
      "line": "City Stadium SRC Slavija, a mapped place for the game."
    },
    {
      "key": "osm-way-622818140",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/622818140",
      "line": "University of Sarajevo Campus, a mapped place for the game."
    },
    {
      "key": "osm-relation-8425673",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/8425673",
      "line": "Morića Han, a mapped place for the game."
    },
    {
      "key": "osm-way-188836329",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/188836329",
      "line": "Gazi Husrev Bey's Bezistan, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11915843174",
      "ref": "node/11915843174",
      "kind": "neighbourhood"
    },
    {
      "id": "district-137481496",
      "ref": "node/137481496",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2021500087",
      "ref": "node/2021500087",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2026434322",
      "ref": "node/2026434322",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2043629667",
      "ref": "node/2043629667",
      "kind": "neighbourhood"
    },
    {
      "id": "district-252912975",
      "ref": "node/252912975",
      "kind": "neighbourhood"
    },
    {
      "id": "district-257414882",
      "ref": "node/257414882",
      "kind": "neighbourhood"
    },
    {
      "id": "district-258981362",
      "ref": "node/258981362",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2919386409",
      "ref": "node/2919386409",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3995932657",
      "ref": "node/3995932657",
      "kind": "neighbourhood"
    },
    {
      "id": "district-471183876",
      "ref": "node/471183876",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5205109668",
      "ref": "node/5205109668",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5205110200",
      "ref": "node/5205110200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-614490471",
      "ref": "node/614490471",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7682628239",
      "ref": "node/7682628239",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7682628244",
      "ref": "node/7682628244",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7682628388",
      "ref": "node/7682628388",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7682628389",
      "ref": "node/7682628389",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
