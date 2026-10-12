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
  "name": "Beirut",
  "box": [
    33.71503941006602,
    35.261521878683276,
    34.07680118993398,
    35.69533812131673
  ],
  "core": [
    33.85070007751651,
    35.42428953314378,
    33.941140522483494,
    35.53257046685623
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2112088835",
      "line": "Charles Hélou Bus Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1683112947",
      "line": "Attic, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/1257223554",
      "line": "Antonine University Baabda, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/802992023",
      "line": "Hospital Bhannes, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/5037938",
      "line": "Horsh Beirut, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/8279251362",
      "line": "Obied, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/487152382",
      "line": "Maghen Abraham Synagogue, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/7113313",
      "line": "Martyrs Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4757645722",
      "line": "Lebanese Football Association, a mapped place for the game."
    },
    {
      "key": "osm-way-338095207",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/338095207",
      "line": "Notre Dame University-Louaize, a mapped place for the game."
    },
    {
      "key": "osm-node-4406724595",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4406724595",
      "line": "Balcony of Aley, a mapped place for the game."
    },
    {
      "key": "osm-node-13321742673",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13321742673",
      "line": "Site of Tel Al-Zaatar massacre, a mapped place for the game."
    },
    {
      "key": "osm-node-2932843969",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2932843969",
      "line": "Silk Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-743280529",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/743280529",
      "line": "Holy Spirit University of Kaslik, a mapped place for the game."
    },
    {
      "key": "osm-node-4504613689",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4504613689",
      "line": "Lower Grotto, a mapped place for the game."
    },
    {
      "key": "osm-way-994902555",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/994902555",
      "line": "Bellevue Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-way-993570500",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/993570500",
      "line": "Rafic Hariri University Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-261481055",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/261481055",
      "line": "American University of Science and Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-483174171",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/483174171",
      "line": "Cathedral of St Elias and St Gregory the Illuminator, a mapped place for the game."
    },
    {
      "key": "osm-way-479475562",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/479475562",
      "line": "National Evangelical Church of Beirut, a mapped place for the game."
    },
    {
      "key": "osm-node-4589295511",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4589295511",
      "line": "Kabsseh, a mapped place for the game."
    },
    {
      "key": "osm-node-8317853057",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8317853057",
      "line": "la ronda samer, a mapped place for the game."
    },
    {
      "key": "osm-node-6064724358",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/6064724358",
      "line": "Eco 101, a mapped place for the game."
    },
    {
      "key": "osm-node-12928075501",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/12928075501",
      "line": "Bchamoun Garden, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-13321742669",
      "ref": "node/13321742669",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291429004",
      "ref": "node/291429004",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4741559339",
      "ref": "node/4741559339",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4801274807",
      "ref": "node/4801274807",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4807360298",
      "ref": "node/4807360298",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4807433984",
      "ref": "node/4807433984",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7644437933",
      "ref": "node/7644437933",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10584826637",
      "ref": "node/10584826637",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13158648782",
      "ref": "node/13158648782",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2393710317",
      "ref": "node/2393710317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-259206936",
      "ref": "node/259206936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-260193094",
      "ref": "node/260193094",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264331553",
      "ref": "node/264331553",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291393757",
      "ref": "node/291393757",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291396507",
      "ref": "node/291396507",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291397086",
      "ref": "node/291397086",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291405451",
      "ref": "node/291405451",
      "kind": "neighbourhood"
    },
    {
      "id": "district-291406193",
      "ref": "node/291406193",
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
