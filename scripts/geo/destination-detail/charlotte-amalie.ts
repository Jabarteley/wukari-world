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
  "name": "Charlotte Amalie",
  "box": [
    18.160576610066023,
    -65.12299447684404,
    18.522338389933978,
    -64.74404012315597
  ],
  "core": [
    18.296237277516507,
    -64.98084918060233,
    18.386677722483494,
    -64.88618541939768
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1218392568",
      "line": "Frenchman’s Cove, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1000296069",
      "line": "Waterfront Bistro, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/367449794",
      "line": "Enid M Baa Library and Archives, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/584496926",
      "line": "Roy Lester Schneider Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/38485624",
      "line": "FDR Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/522515683",
      "line": "Bordeaux Farmers' Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/215454486",
      "line": "Saint Thomas Synagogue, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/378331488",
      "line": "Market Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/323829748",
      "line": "Government House, a mapped place for the game."
    },
    {
      "key": "osm-way-917673033",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/917673033",
      "line": "University of the Virgin Islands Saint Thomas Campus, a mapped place for the game."
    },
    {
      "key": "osm-node-9451357027",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9451357027",
      "line": "Trunk Bay Outlook, a mapped place for the game."
    },
    {
      "key": "osm-relation-14560476",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/14560476",
      "line": "Fort Christian, a mapped place for the game."
    },
    {
      "key": "osm-way-469663512",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/469663512",
      "line": "Coral World Ocean Park, a mapped place for the game."
    },
    {
      "key": "osm-node-356559567",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/356559567",
      "line": "Hassel Island Historic District, a mapped place for the game."
    },
    {
      "key": "osm-node-356559609",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/356559609",
      "line": "Saint Annes Chapel, a mapped place for the game."
    },
    {
      "key": "osm-way-522510228",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/522510228",
      "line": "Saints Peter and Paul Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-356559520",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/356559520",
      "line": "Antonio Jarvis Square, a mapped place for the game."
    },
    {
      "key": "osm-way-38311399",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/38311399",
      "line": "Emancipation Gardens Park, a mapped place for the game."
    },
    {
      "key": "osm-node-6003432587",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6003432587",
      "line": "Sunset Grille, a mapped place for the game."
    },
    {
      "key": "osm-node-13381802291",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13381802291",
      "line": "Waterfront Restaurant at Lovango Resort, a mapped place for the game."
    },
    {
      "key": "osm-way-38351557",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/38351557",
      "line": "Four Winds Plaza, a mapped place for the game."
    },
    {
      "key": "osm-node-9453513417",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9453513417",
      "line": "St Thomas Airport Outlook, a mapped place for the game."
    },
    {
      "key": "osm-node-452044421",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/452044421",
      "line": "Crown Bay Center, a mapped place for the game."
    },
    {
      "key": "osm-way-1155633919",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1155633919",
      "line": "Bluewater Bible College & Institute, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-14097401546",
      "ref": "node/14097401546",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401565",
      "ref": "node/14097401565",
      "kind": "neighbourhood"
    },
    {
      "id": "district-356559547",
      "ref": "node/356559547",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255148",
      "ref": "node/9864255148",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255149",
      "ref": "node/9864255149",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255150",
      "ref": "node/9864255150",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255152",
      "ref": "node/9864255152",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255154",
      "ref": "node/9864255154",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255162",
      "ref": "node/9864255162",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255163",
      "ref": "node/9864255163",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401525",
      "ref": "node/14097401525",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401559",
      "ref": "node/14097401559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401560",
      "ref": "node/14097401560",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401561",
      "ref": "node/14097401561",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401562",
      "ref": "node/14097401562",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14097401564",
      "ref": "node/14097401564",
      "kind": "neighbourhood"
    },
    {
      "id": "district-356559536",
      "ref": "node/356559536",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9864255151",
      "ref": "node/9864255151",
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
