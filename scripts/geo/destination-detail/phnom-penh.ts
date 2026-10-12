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
  "name": "Phnom Penh",
  "box": [
    11.350942955503301,
    104.73893561599425,
    11.749151889933978,
    105.10594958400574
  ],
  "core": [
    11.523050777516504,
    104.87658830643825,
    11.613491222483495,
    104.96829689356174
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/11519736545",
      "line": "Phnom Penh, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2749419343",
      "line": "ហាងកាហ្វេ, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/44675931",
      "line": "Royal University of Agriculture (RUA), a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/171309629",
      "line": "Khmer-Soviet Friendship Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/5208926669",
      "line": "EM Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/377373520",
      "line": "Sorya Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/1991809911",
      "line": "St. Joseph Catholic Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/916803502",
      "line": "Svay Rolum Commune Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/404360044",
      "line": "Ministry of Water Resource & Meteorology, a mapped place for the game."
    },
    {
      "key": "osm-way-252392612",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/252392612",
      "line": "Royal University of Phnom Penh (RUPP), a mapped place for the game."
    },
    {
      "key": "osm-way-445148651",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/445148651",
      "line": "Olympic Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-594151269",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/594151269",
      "line": "Phnom Penh Safari, a mapped place for the game."
    },
    {
      "key": "osm-way-182972997",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/182972997",
      "line": "Choeung Ek Genocidal Center, a mapped place for the game."
    },
    {
      "key": "osm-way-640462136",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/640462136",
      "line": "Cambodian University for Specialties, a mapped place for the game."
    },
    {
      "key": "osm-way-311065474",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/311065474",
      "line": "Cambodia-Vietnam Friendship Monument, a mapped place for the game."
    },
    {
      "key": "osm-node-4531138920",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4531138920",
      "line": "American University of Phnom Penh, a mapped place for the game."
    },
    {
      "key": "osm-way-165927974",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/165927974",
      "line": "Calmette Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-175005909",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/175005909",
      "line": "Wat Phnom Pagoda, a mapped place for the game."
    },
    {
      "key": "osm-way-171309638",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/171309638",
      "line": "National Pediatric Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-1116381668",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1116381668",
      "line": "Ounalom Pagoda, a mapped place for the game."
    },
    {
      "key": "osm-way-445146746",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/445146746",
      "line": "Old Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-377373297",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/377373297",
      "line": "Central Market, a mapped place for the game."
    },
    {
      "key": "osm-node-5036806682",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5036806682",
      "line": "Sok Leng, a mapped place for the game."
    },
    {
      "key": "osm-node-11648298737",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11648298737",
      "line": "Coffee Plus, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2440086067",
      "ref": "node/2440086067",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1853704127",
      "ref": "node/1853704127",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1998898324",
      "ref": "node/1998898324",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071048221",
      "ref": "node/2071048221",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071052943",
      "ref": "node/2071052943",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071053477",
      "ref": "node/2071053477",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071063194",
      "ref": "node/2071063194",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072431654",
      "ref": "node/2072431654",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072434439",
      "ref": "node/2072434439",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072437060",
      "ref": "node/2072437060",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072440128",
      "ref": "node/2072440128",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072440132",
      "ref": "node/2072440132",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072443140",
      "ref": "node/2072443140",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2077099427",
      "ref": "node/2077099427",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2077099428",
      "ref": "node/2077099428",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2077099429",
      "ref": "node/2077099429",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2077099430",
      "ref": "node/2077099430",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2077099431",
      "ref": "node/2077099431",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2366022",
      "ref": "relation/2366022",
      "kind": "water"
    },
    {
      "id": "water-relation-253294",
      "ref": "relation/253294",
      "kind": "water"
    },
    {
      "id": "water-relation-6603146",
      "ref": "relation/6603146",
      "kind": "water"
    },
    {
      "id": "water-way-1101341005",
      "ref": "way/1101341005",
      "kind": "water"
    },
    {
      "id": "water-way-167163127",
      "ref": "way/167163127",
      "kind": "water"
    },
    {
      "id": "water-way-168085357",
      "ref": "way/168085357",
      "kind": "water"
    },
    {
      "id": "water-way-483164154",
      "ref": "way/483164154",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
