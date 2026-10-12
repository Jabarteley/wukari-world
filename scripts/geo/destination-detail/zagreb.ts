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
  "name": "Zagreb",
  "box": [
    45.63221581006602,
    15.718673701335272,
    45.99397758993398,
    16.235885298664726
  ],
  "core": [
    45.76787647751651,
    15.91278596470878,
    45.858316922483496,
    16.04177303529122
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5627130421",
      "line": "Zagreb Zapadni kolodvor, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2164248255",
      "line": "Noel, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/320797178",
      "line": "Kineziološki fakultet, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/77485340",
      "line": "University Psychiatric Hospital Vrapče, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/940677492",
      "line": "Novi dvori, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/29281136",
      "line": "King Cross Jankomir, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/13304771994",
      "line": "kapela svete Terezije od Djeteta Isusa u Trnju, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/584600486",
      "line": "Općina Stubičke Toplice; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/609611254",
      "line": "Općina Kraljevec na Sutli, a mapped place for the game."
    },
    {
      "key": "osm-way-880362547",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/880362547",
      "line": "Faculty of Economics and Business, a mapped place for the game."
    },
    {
      "key": "osm-way-30014192",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/30014192",
      "line": "Gradski stadion Velika Gorica, a mapped place for the game."
    },
    {
      "key": "osm-way-713274174",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/713274174",
      "line": "kapelica Uzvišenja Svetog Križa, a mapped place for the game."
    },
    {
      "key": "osm-way-676820357",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/676820357",
      "line": "crkva Presvetog Trojstva, a mapped place for the game."
    },
    {
      "key": "osm-way-761095793",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/761095793",
      "line": "kapela svetog Roka, a mapped place for the game."
    },
    {
      "key": "osm-relation-2086542",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/2086542",
      "line": "Dvorac Lukavec, a mapped place for the game."
    },
    {
      "key": "osm-way-151506756",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/151506756",
      "line": "Dvorac Brezovica, a mapped place for the game."
    },
    {
      "key": "osm-way-296100147",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/296100147",
      "line": "Stadion Lučko, a mapped place for the game."
    },
    {
      "key": "osm-way-261119216",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/261119216",
      "line": "Stjepan Spajić, a mapped place for the game."
    },
    {
      "key": "osm-way-78326996",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/78326996",
      "line": "Klinička bolnica Dubrava, a mapped place for the game."
    },
    {
      "key": "osm-way-29023160",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/29023160",
      "line": "Bundek, a mapped place for the game."
    },
    {
      "key": "osm-relation-2680527",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/2680527",
      "line": "Fakultet strojarstva i brodogradnje, a mapped place for the game."
    },
    {
      "key": "osm-way-350664499",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/350664499",
      "line": "Zdravstveno veleučilište, a mapped place for the game."
    },
    {
      "key": "osm-way-589021801",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/589021801",
      "line": "Klinička bolnica Merkur, a mapped place for the game."
    },
    {
      "key": "osm-way-875744638",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/875744638",
      "line": "Park mladenaca, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10697393738",
      "ref": "node/10697393738",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10748575128",
      "ref": "node/10748575128",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1080819670",
      "ref": "node/1080819670",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1140968048",
      "ref": "node/1140968048",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11573508350",
      "ref": "node/11573508350",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1172743626",
      "ref": "node/1172743626",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11752038933",
      "ref": "node/11752038933",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11963333307",
      "ref": "node/11963333307",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11963333313",
      "ref": "node/11963333313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1210454048",
      "ref": "node/1210454048",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13529158596",
      "ref": "node/13529158596",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13653089925",
      "ref": "node/13653089925",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1444670879",
      "ref": "node/1444670879",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1736742332",
      "ref": "node/1736742332",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1736742921",
      "ref": "node/1736742921",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1736744285",
      "ref": "node/1736744285",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1736747710",
      "ref": "node/1736747710",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1740008163",
      "ref": "node/1740008163",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2149852",
      "ref": "relation/2149852",
      "kind": "water"
    },
    {
      "id": "water-relation-4030497",
      "ref": "relation/4030497",
      "kind": "water"
    },
    {
      "id": "water-way-28977408",
      "ref": "way/28977408",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
