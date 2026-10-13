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
  "name": "London",
  "box": [
    51.326564710066016,
    -0.4743329676367383,
    51.68832648993398,
    0.16204105356569867
  ],
  "core": [
    51.4622253775165,
    -0.20000061593753005,
    51.55266582248349,
    -0.055529984062469964
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/638645",
      "line": "Walton-on-Thames, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/304687805",
      "line": "Ace Cafe, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/245097360",
      "line": "Christ the King Sixth Form College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/10286924",
      "line": "London Clinic, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/4285108",
      "line": "Wimbledon Common, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/11370057",
      "line": "Walthamstow Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/61111910",
      "line": "St. Mary the Virgin, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/332400834",
      "line": "Bexley Civic Offices; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/193799556",
      "line": "The Croydon Law Courts, a mapped place for the game."
    },
    {
      "key": "osm-way-7848020",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/7848020",
      "line": "Richmond-upon-Thames College, a mapped place for the game."
    },
    {
      "key": "osm-way-7989344",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/7989344",
      "line": "Vicarage Road Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-266577545",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/266577545",
      "line": "Polish War Memorial, a mapped place for the game."
    },
    {
      "key": "osm-node-5656298167",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5656298167",
      "line": "Barnet Museum, a mapped place for the game."
    },
    {
      "key": "osm-relation-6617493",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/6617493",
      "line": "Hill Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-18934744",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/18934744",
      "line": "Barking Park, a mapped place for the game."
    },
    {
      "key": "osm-way-24437604",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/24437604",
      "line": "Chase Farm Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-35597911",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/35597911",
      "line": "North East Surrey College of Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-35279471",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/35279471",
      "line": "Edgwarebury Park, a mapped place for the game."
    },
    {
      "key": "osm-way-663055373",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/663055373",
      "line": "Champion Hill, a mapped place for the game."
    },
    {
      "key": "osm-way-707957524",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/707957524",
      "line": "St Nicholas Church, a mapped place for the game."
    },
    {
      "key": "osm-way-81349520",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/81349520",
      "line": "London Islamic Cultural Society, a mapped place for the game."
    },
    {
      "key": "osm-way-24663862",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24663862",
      "line": "St. Anns Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-350349593",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/350349593",
      "line": "Columbia Road Flower Market, a mapped place for the game."
    },
    {
      "key": "osm-way-147775425",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/147775425",
      "line": "London Academy of Music and Dramatic Art, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10281258046",
      "ref": "node/10281258046",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10304527922",
      "ref": "node/10304527922",
      "kind": "neighbourhood"
    },
    {
      "id": "district-105539532",
      "ref": "node/105539532",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10556960853",
      "ref": "node/10556960853",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10573620341",
      "ref": "node/10573620341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10573620342",
      "ref": "node/10573620342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-106227330",
      "ref": "node/106227330",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10661537007",
      "ref": "node/10661537007",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10716358180",
      "ref": "node/10716358180",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10891506763",
      "ref": "node/10891506763",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10915041967",
      "ref": "node/10915041967",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11048780157",
      "ref": "node/11048780157",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1139095970",
      "ref": "node/1139095970",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12140155871",
      "ref": "node/12140155871",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1224753025",
      "ref": "node/1224753025",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1224754174",
      "ref": "node/1224754174",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1224759066",
      "ref": "node/1224759066",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1224759110",
      "ref": "node/1224759110",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-14405524",
      "ref": "relation/14405524",
      "kind": "water"
    },
    {
      "id": "water-way-147189989",
      "ref": "way/147189989",
      "kind": "water"
    },
    {
      "id": "water-way-147637938",
      "ref": "way/147637938",
      "kind": "water"
    },
    {
      "id": "water-way-147638018",
      "ref": "way/147638018",
      "kind": "water"
    },
    {
      "id": "water-way-23129884",
      "ref": "way/23129884",
      "kind": "water"
    },
    {
      "id": "water-way-2954289",
      "ref": "way/2954289",
      "kind": "water"
    },
    {
      "id": "water-way-3296922",
      "ref": "way/3296922",
      "kind": "water"
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
