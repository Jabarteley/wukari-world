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
  "maxRoads": 600,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "New York",
  "box": [
    40.53184721006602,
    -74.24368676689816,
    40.89360898993398,
    -73.76747717952446
  ],
  "core": [
    40.667507877516506,
    -74.06531166911171,
    40.75794832248349,
    -73.94671873088828
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/42736282",
      "line": "183rd Street, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/931799204",
      "line": "John's of Bleecker Street, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/13104702",
      "line": "Rutgers Biomedical and Health Sciences, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/219041270",
      "line": "NYC Health + Hospitals: South Brooklyn Health, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/357640969",
      "line": "Proctor-Hopson Circle, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/907577618",
      "line": "American Dream, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/357617868",
      "line": "Temple of Israel, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/241853809",
      "line": "Staten Island Borough Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/9291191735",
      "line": "Brooklyn Community Board 9, a mapped place for the game."
    },
    {
      "key": "osm-way-419060582",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/419060582",
      "line": "Kean University - Main Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-604023701",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/604023701",
      "line": "Citi Field, a mapped place for the game."
    },
    {
      "key": "osm-way-246242284",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/246242284",
      "line": "Voorlezer's House, a mapped place for the game."
    },
    {
      "key": "osm-way-284831877",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/284831877",
      "line": "Grace Episcopal Church, a mapped place for the game."
    },
    {
      "key": "osm-way-1564487878",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1564487878",
      "line": "Reynier Speer House, a mapped place for the game."
    },
    {
      "key": "osm-way-245394269",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/245394269",
      "line": "Holy Name Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-relation-4479990",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/4479990",
      "line": "Spring Creek Park, a mapped place for the game."
    },
    {
      "key": "osm-way-178575123",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/178575123",
      "line": "Riverside Park, a mapped place for the game."
    },
    {
      "key": "osm-relation-9462533",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/9462533",
      "line": "Fort Tilden Historic District, a mapped place for the game."
    },
    {
      "key": "osm-way-1489479553",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1489479553",
      "line": "St. John Lutheran Church, a mapped place for the game."
    },
    {
      "key": "osm-way-167898277",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/167898277",
      "line": "The Mills at Jersey Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-527873169",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/527873169",
      "line": "Calvary Hospital - Bronx Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-250026584",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/250026584",
      "line": "Kings Plaza Shopping Center, a mapped place for the game."
    },
    {
      "key": "osm-node-6018127885",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6018127885",
      "line": "Bamonte's, a mapped place for the game."
    },
    {
      "key": "osm-way-108158013",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/108158013",
      "line": "Rockefeller University, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11956391852",
      "ref": "node/11956391852",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12235944511",
      "ref": "node/12235944511",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12839141477",
      "ref": "node/12839141477",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13075913036",
      "ref": "node/13075913036",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13913426682",
      "ref": "node/13913426682",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14005231896",
      "ref": "node/14005231896",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158797645",
      "ref": "node/158797645",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158798303",
      "ref": "node/158798303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158798651",
      "ref": "node/158798651",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158799290",
      "ref": "node/158799290",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158800211",
      "ref": "node/158800211",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158800226",
      "ref": "node/158800226",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158800655",
      "ref": "node/158800655",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158801311",
      "ref": "node/158801311",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158801321",
      "ref": "node/158801321",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158801775",
      "ref": "node/158801775",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158802019",
      "ref": "node/158802019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-158804278",
      "ref": "node/158804278",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2389563",
      "ref": "relation/2389563",
      "kind": "water"
    },
    {
      "id": "water-relation-2389581",
      "ref": "relation/2389581",
      "kind": "water"
    },
    {
      "id": "water-relation-2389630",
      "ref": "relation/2389630",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
