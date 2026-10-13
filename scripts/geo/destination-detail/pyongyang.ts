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
  "name": "Pyongyang",
  "box": [
    38.83877761006602,
    125.52078157518345,
    39.233142044496695,
    125.98446282481656
  ],
  "core": [
    38.974438277516505,
    125.69477359337375,
    39.06487872248349,
    125.81047080662626
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/532205266",
      "line": "Puhŭng, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/725445234",
      "line": "Pyongyang Taedonggang Fish Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/251911140",
      "line": "Kim Jong-il Political-Military University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/788102545",
      "line": "Pyongyang General Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1472420069",
      "line": "Pyongyang Folklore Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1017177927",
      "line": "Cheonnae Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/832150487",
      "line": "Chilgol Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/577053104",
      "line": "Pyongyang City People's Committee; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/964325525",
      "line": "중앙검찰소, a mapped place for the game."
    },
    {
      "key": "osm-way-427620999",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/427620999",
      "line": "Pyongyang University of Science and Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-1112393994",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1112393994",
      "line": "Sosan Football Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-518025824",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/518025824",
      "line": "Ryongsong Residence, a mapped place for the game."
    },
    {
      "key": "osm-way-427808616",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/427808616",
      "line": "Tomb of King Tongmyong, a mapped place for the game."
    },
    {
      "key": "osm-way-403889844",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/403889844",
      "line": "Pyongyang University of Railways, a mapped place for the game."
    },
    {
      "key": "osm-way-1105308903",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1105308903",
      "line": "Pyongyang University of Architecture, a mapped place for the game."
    },
    {
      "key": "osm-way-722791910",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/722791910",
      "line": "Kumsusan Palace of the Sun, a mapped place for the game."
    },
    {
      "key": "osm-way-974980487",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/974980487",
      "line": "Kwangbopsa, a mapped place for the game."
    },
    {
      "key": "osm-way-23697980",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23697980",
      "line": "East Pyongyang Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-184410022",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/184410022",
      "line": "Kim Il-sung Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-42416605",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/42416605",
      "line": "Three Revolution Exhibition, a mapped place for the game."
    },
    {
      "key": "osm-way-879112285",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/879112285",
      "line": "Church of the Life-Giving Trinity, a mapped place for the game."
    },
    {
      "key": "osm-relation-8310581",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "relation/8310581",
      "line": "Cheonseok Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-3090689020",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3090689020",
      "line": "Pyongyang Noodle Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-300349055",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/300349055",
      "line": "Kim Man-yu Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11586913839",
      "ref": "node/11586913839",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11593718161",
      "ref": "node/11593718161",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11593718162",
      "ref": "node/11593718162",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11593944857",
      "ref": "node/11593944857",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11618457224",
      "ref": "node/11618457224",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11620342495",
      "ref": "node/11620342495",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11833898562",
      "ref": "node/11833898562",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11846505587",
      "ref": "node/11846505587",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13333081227",
      "ref": "node/13333081227",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2927431019",
      "ref": "node/2927431019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9032309028",
      "ref": "node/9032309028",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9307925243",
      "ref": "node/9307925243",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9307925244",
      "ref": "node/9307925244",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9307925245",
      "ref": "node/9307925245",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9307925246",
      "ref": "node/9307925246",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9307925247",
      "ref": "node/9307925247",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9307925248",
      "ref": "node/9307925248",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9308319284",
      "ref": "node/9308319284",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2636911",
      "ref": "relation/2636911",
      "kind": "water"
    },
    {
      "id": "water-way-127995452",
      "ref": "way/127995452",
      "kind": "water"
    },
    {
      "id": "water-way-28989101",
      "ref": "way/28989101",
      "kind": "water"
    },
    {
      "id": "water-way-43838121",
      "ref": "way/43838121",
      "kind": "water"
    },
    {
      "id": "water-way-53726480",
      "ref": "way/53726480",
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
