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
  "name": "Basseterre",
  "box": [
    17.115211010066023,
    -62.91065823289697,
    17.476972789933978,
    -62.53394376710303
  ],
  "core": [
    17.250871677516507,
    -62.76935536136846,
    17.341312122483494,
    -62.67524663863154
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2888852904",
      "line": "Seabridge, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3842977495",
      "line": "Ballahoo Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/396994425",
      "line": "Windsor University School of Medicine, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/398068042",
      "line": "The Pogson Medical Centre, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/24800627",
      "line": "Independence Square, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5413227192",
      "line": "Grace Green Produce, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/400006986",
      "line": "St. Theresa Roman Catholic Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/670954622",
      "line": "Bakers Corner; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/398547811",
      "line": "Government House, a mapped place for the game."
    },
    {
      "key": "osm-way-398772697",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/398772697",
      "line": "Medical University of the Americas, a mapped place for the game."
    },
    {
      "key": "osm-way-576357921",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/576357921",
      "line": "Warner Park Cricket Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-60261200",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/60261200",
      "line": "Brimstone Hill Fortress National Park, a mapped place for the game."
    },
    {
      "key": "osm-way-60260592",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/60260592",
      "line": "Fort Charles, a mapped place for the game."
    },
    {
      "key": "osm-way-398248819",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/398248819",
      "line": "National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-397170032",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/397170032",
      "line": "Ross University School of Veterinary Medicine, a mapped place for the game."
    },
    {
      "key": "osm-way-397170029",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/397170029",
      "line": "University of Medicine and Health Sciences, a mapped place for the game."
    },
    {
      "key": "osm-way-399489244",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/399489244",
      "line": "Gingerland Methodist Church, a mapped place for the game."
    },
    {
      "key": "osm-node-11112555606",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11112555606",
      "line": "Arthur's, a mapped place for the game."
    },
    {
      "key": "osm-way-298302151",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/298302151",
      "line": "Carambola, a mapped place for the game."
    },
    {
      "key": "osm-way-682274447",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/682274447",
      "line": "St. James Drag Raceway, a mapped place for the game."
    },
    {
      "key": "osm-node-3448719953",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3448719953",
      "line": "Black Rocks, a mapped place for the game."
    },
    {
      "key": "osm-node-6288064624",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/6288064624",
      "line": "Shopping Plaza, a mapped place for the game."
    },
    {
      "key": "osm-way-545067913",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/545067913",
      "line": "National Heroes Park, a mapped place for the game."
    },
    {
      "key": "osm-way-397539300",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/397539300",
      "line": "St. Kitts Eco-Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-7853254603",
      "ref": "node/7853254603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602127193",
      "ref": "node/10602127193",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602127194",
      "ref": "node/10602127194",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602127195",
      "ref": "node/10602127195",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968527",
      "ref": "node/10602968527",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968529",
      "ref": "node/10602968529",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968530",
      "ref": "node/10602968530",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968531",
      "ref": "node/10602968531",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968533",
      "ref": "node/10602968533",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968534",
      "ref": "node/10602968534",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968535",
      "ref": "node/10602968535",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968536",
      "ref": "node/10602968536",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968537",
      "ref": "node/10602968537",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968538",
      "ref": "node/10602968538",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968539",
      "ref": "node/10602968539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968540",
      "ref": "node/10602968540",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968541",
      "ref": "node/10602968541",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10602968542",
      "ref": "node/10602968542",
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
