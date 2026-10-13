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
  "name": "Tbilisi",
  "box": [
    41.51257821006602,
    44.560166009960646,
    41.87433998993398,
    45.04273299003935
  ],
  "core": [
    41.648238877516505,
    44.741256220393886,
    41.73867932248349,
    44.86164277960611
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/288584312",
      "line": "300 Aragveli, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4032003789",
      "line": "Kiwi, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/161757318",
      "line": "Free and Agricultural Universities of Georgia, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/479934981",
      "line": "Jo Ann University Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/14141290",
      "line": "Tbilisi Open Air Museum of Ethnography, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/242179594",
      "line": "Merani Shopping Gallery, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/401580108",
      "line": "Rustavi Sioni, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1167702410",
      "line": "Zurab Zhvania Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/19575502",
      "line": "Georgian Intelligence Service, a mapped place for the game."
    },
    {
      "key": "osm-relation-18294000",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/18294000",
      "line": "Sokhumi State University, a mapped place for the game."
    },
    {
      "key": "osm-way-194271283",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/194271283",
      "line": "Shevardeni Stadium, a mapped place for the game."
    },
    {
      "key": "osm-relation-17883776",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/17883776",
      "line": "Monastery of Shiomghvime, a mapped place for the game."
    },
    {
      "key": "osm-way-1321501893",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1321501893",
      "line": "Betania Monastery of the Nativity of the Mother of God, a mapped place for the game."
    },
    {
      "key": "osm-way-551386185",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/551386185",
      "line": "Man and Sun, a mapped place for the game."
    },
    {
      "key": "osm-way-1136546674",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1136546674",
      "line": "Church of Saint Barbare, a mapped place for the game."
    },
    {
      "key": "osm-way-1429264291",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1429264291",
      "line": "Saint Marine Church, a mapped place for the game."
    },
    {
      "key": "osm-relation-3941505",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/3941505",
      "line": "Poladi Stadium, a mapped place for the game."
    },
    {
      "key": "osm-relation-16507696",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/16507696",
      "line": "Georgian Technical University, a mapped place for the game."
    },
    {
      "key": "osm-relation-16510616",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/16510616",
      "line": "Ivane Javakhishvili Tbilisi State University, a mapped place for the game."
    },
    {
      "key": "osm-relation-17823425",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/17823425",
      "line": "Dinamo Arena named after Boris Paichadze, a mapped place for the game."
    },
    {
      "key": "osm-relation-13443464",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/13443464",
      "line": "Mtatsminda Park, a mapped place for the game."
    },
    {
      "key": "osm-way-104122415",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/104122415",
      "line": "Tbilisi Zoo, a mapped place for the game."
    },
    {
      "key": "osm-way-38326853",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/38326853",
      "line": "Chachava Clinic, a mapped place for the game."
    },
    {
      "key": "osm-way-1079090317",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1079090317",
      "line": "National Center for Tuberculosis and Lung Disease, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11373213795",
      "ref": "node/11373213795",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213796",
      "ref": "node/11373213796",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213797",
      "ref": "node/11373213797",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213798",
      "ref": "node/11373213798",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213799",
      "ref": "node/11373213799",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213800",
      "ref": "node/11373213800",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213801",
      "ref": "node/11373213801",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11373213802",
      "ref": "node/11373213802",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11374252686",
      "ref": "node/11374252686",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12308291371",
      "ref": "node/12308291371",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12456397322",
      "ref": "node/12456397322",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12456415253",
      "ref": "node/12456415253",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12456415258",
      "ref": "node/12456415258",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1308477954",
      "ref": "node/1308477954",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14118362247",
      "ref": "node/14118362247",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1651260327",
      "ref": "node/1651260327",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1664610675",
      "ref": "node/1664610675",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1761375393",
      "ref": "node/1761375393",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-19423317",
      "ref": "relation/19423317",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
