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
  "name": "Wellington",
  "box": [
    -41.46967618993398,
    174.53743998323975,
    -41.107914410066016,
    175.01698281676025
  ],
  "core": [
    -41.33401552248349,
    174.71739355006903,
    -41.2435750775165,
    174.83702924993096
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1566551335",
      "line": "Crofton Downs, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2189566949",
      "line": "Logan Brown, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/18880232",
      "line": "Royal New Zealand Police College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/203229384",
      "line": "Hutt Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/26585828",
      "line": "Oku Street Reserve, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1137992012",
      "line": "Queensgate Shopping Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/326476205",
      "line": "St Matthias Anglican Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/190555301",
      "line": "Wellington Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/13348428",
      "line": "Ngā Taonga Sound & Vision, a mapped place for the game."
    },
    {
      "key": "osm-node-5417751534",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5417751534",
      "line": "Otago School of Medicine, a mapped place for the game."
    },
    {
      "key": "osm-way-1021590430",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1021590430",
      "line": "Hnry Stadium / Wellington Regional Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-1907945529",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1907945529",
      "line": "Old Pencarrow Lighthouse, a mapped place for the game."
    },
    {
      "key": "osm-way-709886856",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/709886856",
      "line": "Silver Stream Railway Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-895400049",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/895400049",
      "line": "Fort Ballance, a mapped place for the game."
    },
    {
      "key": "osm-way-220331294",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/220331294",
      "line": "Seton Nossiter Park, a mapped place for the game."
    },
    {
      "key": "osm-way-395210275",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/395210275",
      "line": "Williams Park, a mapped place for the game."
    },
    {
      "key": "osm-way-288996918",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/288996918",
      "line": "Basin Reserve, a mapped place for the game."
    },
    {
      "key": "osm-way-256656474",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/256656474",
      "line": "Saint Mary of the Angels, a mapped place for the game."
    },
    {
      "key": "osm-way-844548436",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/844548436",
      "line": "Holy Trinity Anglican Church, a mapped place for the game."
    },
    {
      "key": "osm-way-18043662",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/18043662",
      "line": "The Open Polytechnic of New Zealand, a mapped place for the game."
    },
    {
      "key": "osm-way-222118929",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/222118929",
      "line": "Wakefield Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-221801422",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/221801422",
      "line": "Southern Cross Wellington Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-762386613",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/762386613",
      "line": "Victoria University Coastal Ecology Laboratory, a mapped place for the game."
    },
    {
      "key": "osm-way-260864068",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/260864068",
      "line": "James Smith Corner, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10218781962",
      "ref": "node/10218781962",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10222345252",
      "ref": "node/10222345252",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10314005860",
      "ref": "node/10314005860",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10314005861",
      "ref": "node/10314005861",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10314005862",
      "ref": "node/10314005862",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10314005863",
      "ref": "node/10314005863",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1564199851",
      "ref": "node/1564199851",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1584219756",
      "ref": "node/1584219756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1629096567",
      "ref": "node/1629096567",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1632356480",
      "ref": "node/1632356480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1632356483",
      "ref": "node/1632356483",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1632356499",
      "ref": "node/1632356499",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1632356503",
      "ref": "node/1632356503",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1632356507",
      "ref": "node/1632356507",
      "kind": "neighbourhood"
    },
    {
      "id": "district-172212419",
      "ref": "node/172212419",
      "kind": "neighbourhood"
    },
    {
      "id": "district-178206097",
      "ref": "node/178206097",
      "kind": "neighbourhood"
    },
    {
      "id": "district-178321547",
      "ref": "node/178321547",
      "kind": "neighbourhood"
    },
    {
      "id": "district-184073847",
      "ref": "node/184073847",
      "kind": "neighbourhood"
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
