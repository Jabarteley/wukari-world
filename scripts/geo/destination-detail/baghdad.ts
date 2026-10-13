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
  "name": "Baghdad",
  "box": [
    33.12528921006602,
    44.17180167835458,
    33.487050989933984,
    44.60264092164542
  ],
  "core": [
    33.26094987751651,
    44.33345047008011,
    33.351390322483496,
    44.44099212991989
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/82809426",
      "line": "Allawi bus station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/928718264",
      "line": "Shabandar Cafe, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/7958720685",
      "line": "American University of Iraq - Baghdad, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1077574466",
      "line": "مستشفى الحسين العسكري, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/844680048",
      "line": "Baghdad tourism island, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1167428601",
      "line": "Mansour Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4246078297",
      "line": "جامع الكبيسي, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/7894353482",
      "line": "Liberation Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/463067663",
      "line": "Supreme Judicial Council of Iraq, a mapped place for the game."
    },
    {
      "key": "osm-way-85931827",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/85931827",
      "line": "جامعة البكر, a mapped place for the game."
    },
    {
      "key": "osm-relation-20951269",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/20951269",
      "line": "Al-Madina Sports Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-6411927106",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6411927106",
      "line": "Tell Ishchali, a mapped place for the game."
    },
    {
      "key": "osm-way-331568741",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/331568741",
      "line": "Dur-Kurigalzu ziggurat, a mapped place for the game."
    },
    {
      "key": "osm-node-11597386428",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11597386428",
      "line": "Muhammad al-Jawad Shrine, a mapped place for the game."
    },
    {
      "key": "osm-way-82992750",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/82992750",
      "line": "ام الطبول, a mapped place for the game."
    },
    {
      "key": "osm-way-4493601",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/4493601",
      "line": "University of Baghdad, a mapped place for the game."
    },
    {
      "key": "osm-way-1208663973",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1208663973",
      "line": "Abu Hanifah Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-82665090",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/82665090",
      "line": "Ibn Sina Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-83672623",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/83672623",
      "line": "University of Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-82012284",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/82012284",
      "line": "Um Al Khanzeer Island, a mapped place for the game."
    },
    {
      "key": "osm-way-1287507333",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1287507333",
      "line": "مستشفى ابن النفيس لطب وجراحة القلب والصدر والاوعية الدموية, a mapped place for the game."
    },
    {
      "key": "osm-way-832799038",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/832799038",
      "line": "Baghdad Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-83673023",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/83673023",
      "line": "Zawraa Park, a mapped place for the game."
    },
    {
      "key": "osm-way-82643837",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/82643837",
      "line": "Zawra Tower, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11369095013",
      "ref": "node/11369095013",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11371031207",
      "ref": "node/11371031207",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11371031215",
      "ref": "node/11371031215",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11397824028",
      "ref": "node/11397824028",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11465601748",
      "ref": "node/11465601748",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11465763682",
      "ref": "node/11465763682",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11524604143",
      "ref": "node/11524604143",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11524604144",
      "ref": "node/11524604144",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11524635573",
      "ref": "node/11524635573",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11527328498",
      "ref": "node/11527328498",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11527448752",
      "ref": "node/11527448752",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11527448756",
      "ref": "node/11527448756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11527453134",
      "ref": "node/11527453134",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11527453135",
      "ref": "node/11527453135",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11533140804",
      "ref": "node/11533140804",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11555261696",
      "ref": "node/11555261696",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11847653326",
      "ref": "node/11847653326",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12015677360",
      "ref": "node/12015677360",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-12681053",
      "ref": "relation/12681053",
      "kind": "water"
    },
    {
      "id": "water-relation-12682251",
      "ref": "relation/12682251",
      "kind": "water"
    },
    {
      "id": "water-relation-147",
      "ref": "relation/147",
      "kind": "water"
    },
    {
      "id": "water-relation-297",
      "ref": "relation/297",
      "kind": "water"
    },
    {
      "id": "water-relation-2980857",
      "ref": "relation/2980857",
      "kind": "water"
    },
    {
      "id": "water-relation-576440",
      "ref": "relation/576440",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
