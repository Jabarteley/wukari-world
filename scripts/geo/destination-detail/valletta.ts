import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, coastWaterQuery } from './queries.ts'

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
  "name": "Valletta",
  "box": [
    35.71811701006602,
    14.291360579078136,
    36.07987878993398,
    14.735960820921866
  ],
  "core": [
    35.853777677516504,
    14.458181232984794,
    35.94421812248349,
    14.569140167015208
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/9091705487",
      "line": "Valletta Cruise Port, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2320552957",
      "line": "Point de Vue, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/169100030",
      "line": "University of Malta, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/15801317",
      "line": "Mount Carmel Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/277496981",
      "line": "Sant' Antnin Family Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/21102330",
      "line": "Bay Street Shopping Complex, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/136199373",
      "line": "Chapel of Our Lady's Return from Egypt, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/55064405",
      "line": "Royal Opera House; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/245713083",
      "line": "European Union Agency for Asylum, a mapped place for the game."
    },
    {
      "key": "osm-way-329689901",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/329689901",
      "line": "American University of Malta, a mapped place for the game."
    },
    {
      "key": "osm-way-26441204",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/26441204",
      "line": "il-Grawnd taċ-Ċentinarju, a mapped place for the game."
    },
    {
      "key": "osm-way-171895544",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/171895544",
      "line": "Torri tal-Wardija, a mapped place for the game."
    },
    {
      "key": "osm-way-138969519",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/138969519",
      "line": "Manikata Church, a mapped place for the game."
    },
    {
      "key": "osm-node-1742953661",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1742953661",
      "line": "Malta Classic Car Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-46780543",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/46780543",
      "line": "Fort Bengħisa, a mapped place for the game."
    },
    {
      "key": "osm-way-33556227",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/33556227",
      "line": "Saint Mary Magdalene Chapel, a mapped place for the game."
    },
    {
      "key": "osm-way-33426681",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/33426681",
      "line": "Saint James Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-92244977",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/92244977",
      "line": "Victor Tedesco Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-224009613",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/224009613",
      "line": "Balluta Buildings, a mapped place for the game."
    },
    {
      "key": "osm-way-27462446",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/27462446",
      "line": "Lower Barracca Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-60088300",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/60088300",
      "line": "Tony Bezzina Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-24063943",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/24063943",
      "line": "Mater Dei Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-243915139",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/243915139",
      "line": "Hastings Garden, a mapped place for the game."
    },
    {
      "key": "osm-relation-14484752",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "relation/14484752",
      "line": "Saint Gabriel Band Club, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-263889918",
      "ref": "node/263889918",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11105772059",
      "ref": "node/11105772059",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11105772060",
      "ref": "node/11105772060",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11105772061",
      "ref": "node/11105772061",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11105772062",
      "ref": "node/11105772062",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582634819",
      "ref": "node/12582634819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582643372",
      "ref": "node/12582643372",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582874221",
      "ref": "node/12582874221",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582894449",
      "ref": "node/12582894449",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582914758",
      "ref": "node/12582914758",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582922401",
      "ref": "node/12582922401",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107145",
      "ref": "node/12883107145",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107146",
      "ref": "node/12883107146",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107175",
      "ref": "node/12883107175",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107176",
      "ref": "node/12883107176",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107177",
      "ref": "node/12883107177",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107178",
      "ref": "node/12883107178",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12883107180",
      "ref": "node/12883107180",
      "kind": "neighbourhood"
    }
  ],
  "wideWater": true,
  "sea": {
    "kind": "coast",
    "bandMetres": 40000
  }
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: coastWaterQuery,
} satisfies DetailConfig
