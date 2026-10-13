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
  "minWaterKm2": 1,
  "name": "Hargeisa",
  "box": [
    9.380852110066021,
    43.87951173893194,
    9.74261388993398,
    44.24409426106806
  ],
  "core": [
    9.516512777516505,
    44.016248576509,
    9.606953222483495,
    44.107357423490996
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1138799090",
      "line": "Harageisa Bus Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/319413613",
      "line": "Kaah Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/798770515",
      "line": "Gollis University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/791242083",
      "line": "Edna Adan Maternity Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/8930451121",
      "line": "Warshada caanaha, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/359876299",
      "line": "Sariibada MMooge, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/906825193",
      "line": "Masjidka Cali Mataan, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "node/4463222378"
      },
      "ref": "node/4463222378",
      "line": "Somaliland Supreme Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/406928714",
      "line": "DANIDA, a mapped place for the game."
    },
    {
      "key": "osm-way-449354369",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/449354369",
      "line": "University of Hargeisa, a mapped place for the game."
    },
    {
      "key": "osm-way-238835442",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/238835442",
      "line": "Hargeisa Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-10225628867",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10225628867",
      "line": "Hargeisa Memorial, a mapped place for the game."
    },
    {
      "key": "osm-node-1138799338",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1138799338",
      "line": "War Memorial (MIG), a mapped place for the game."
    },
    {
      "key": "osm-node-6554383286",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6554383286",
      "line": "go ants, a mapped place for the game."
    },
    {
      "key": "osm-node-6589200285",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6589200285",
      "line": "tls geele Arab, a mapped place for the game."
    },
    {
      "key": "osm-node-3593965256",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3593965256",
      "line": "Mediterranean Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-365346749",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/365346749",
      "line": "Golis, a mapped place for the game."
    },
    {
      "key": "osm-way-353244599",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/353244599",
      "line": "masaajid, a mapped place for the game."
    },
    {
      "key": "osm-way-1462275345",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1462275345",
      "line": "Naaso Hablood Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-430366600",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/430366600",
      "line": "Hargeisa International Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-7798002349",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7798002349",
      "line": "Gobonimo market, a mapped place for the game."
    },
    {
      "key": "osm-way-1376931546",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1376931546",
      "line": "Hand Memorial ( Taalda Gacanta), a mapped place for the game."
    },
    {
      "key": "osm-way-1544987456",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1544987456",
      "line": "CIIR Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-1315022603",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1315022603",
      "line": "Guri_Samo Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12025633649",
      "ref": "node/12025633649",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12523255111",
      "ref": "node/12523255111",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12523255112",
      "ref": "node/12523255112",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404221634",
      "ref": "node/1404221634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404222266",
      "ref": "node/1404222266",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404223994",
      "ref": "node/1404223994",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404224755",
      "ref": "node/1404224755",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404224992",
      "ref": "node/1404224992",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404225395",
      "ref": "node/1404225395",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404225590",
      "ref": "node/1404225590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404225758",
      "ref": "node/1404225758",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404226713",
      "ref": "node/1404226713",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404228456",
      "ref": "node/1404228456",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404229955",
      "ref": "node/1404229955",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404230139",
      "ref": "node/1404230139",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404230743",
      "ref": "node/1404230743",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404230837",
      "ref": "node/1404230837",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404231128",
      "ref": "node/1404231128",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
