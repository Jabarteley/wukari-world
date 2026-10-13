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
  "name": "Macau",
  "box": [
    22.009063910066022,
    113.34376133670828,
    22.370825689933977,
    113.73232946329172
  ],
  "core": [
    22.144724577516506,
    113.48952153442147,
    22.235165022483493,
    113.58656926557853
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2561573392",
      "line": "凱泉灣總站 Riviera Macau / Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4325083289",
      "line": "Clube militar, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/7545205378",
      "line": "Seac Pai Van Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/428421340",
      "line": "The Islands Healthcare Complex — Macao Medical Center of Peking Union Medical College Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/405826614",
      "line": "氹仔海濱休憩區 Zona de Lazer da Marginal da Taipa, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/334453286",
      "line": "台山街市市政綜合大樓 Complexo Municipal do Mercado de Tamagnini Barbosa, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/229290411",
      "line": "Church of Our Lady of Sorrows, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/307049831",
      "line": "Cultural Centre Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/347053217",
      "line": "Monetary Authority of Macao, a mapped place for the game."
    },
    {
      "key": "osm-relation-20002113",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/20002113",
      "line": "University of Macau, a mapped place for the game."
    },
    {
      "key": "osm-way-244820723",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/244820723",
      "line": "MUST Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-346331627",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/346331627",
      "line": "Broadway Macau, a mapped place for the game."
    },
    {
      "key": "osm-way-580160817",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/580160817",
      "line": "City University of Macau, a mapped place for the game."
    },
    {
      "key": "osm-way-244930722",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/244930722",
      "line": "Ramalho Eanes Garden, a mapped place for the game."
    },
    {
      "key": "osm-way-322642517",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/322642517",
      "line": "Hac Sa Park, a mapped place for the game."
    },
    {
      "key": "osm-way-206823798",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/206823798",
      "line": "沙梨頭街市 Mercado Municipal do Patane, a mapped place for the game."
    },
    {
      "key": "osm-relation-21176879",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/21176879",
      "line": "Macau Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-330083075",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/330083075",
      "line": "Communications Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-295506987",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/295506987",
      "line": "Grand Lisboa Palace Macau, a mapped place for the game."
    },
    {
      "key": "osm-way-163732917",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/163732917",
      "line": "Macau Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-330769741",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/330769741",
      "line": "中葡職業技術學校 Escola Luso-Chinesa Técnico-Profissional, a mapped place for the game."
    },
    {
      "key": "osm-way-172301929",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/172301929",
      "line": "Kiang Wu Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-389129453",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/389129453",
      "line": "St. Augustine's Church, a mapped place for the game."
    },
    {
      "key": "osm-way-306158878",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/306158878",
      "line": "Red Market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2510173605",
      "ref": "node/2510173605",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2805421749",
      "ref": "node/2805421749",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2805421755",
      "ref": "node/2805421755",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304201",
      "ref": "node/2808304201",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304202",
      "ref": "node/2808304202",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304204",
      "ref": "node/2808304204",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304205",
      "ref": "node/2808304205",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304207",
      "ref": "node/2808304207",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304209",
      "ref": "node/2808304209",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2808304210",
      "ref": "node/2808304210",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3109976745",
      "ref": "node/3109976745",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3109976747",
      "ref": "node/3109976747",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3109980967",
      "ref": "node/3109980967",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3109980968",
      "ref": "node/3109980968",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3109980969",
      "ref": "node/3109980969",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3283789702",
      "ref": "node/3283789702",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6056414986",
      "ref": "node/6056414986",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6056415064",
      "ref": "node/6056415064",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-12510522",
      "ref": "relation/12510522",
      "kind": "water"
    },
    {
      "id": "water-relation-20042660",
      "ref": "relation/20042660",
      "kind": "water"
    },
    {
      "id": "water-relation-2069734",
      "ref": "relation/2069734",
      "kind": "water"
    },
    {
      "id": "water-relation-7588101",
      "ref": "relation/7588101",
      "kind": "water"
    },
    {
      "id": "water-way-156861138",
      "ref": "way/156861138",
      "kind": "water"
    }
  ],
  "profile": "microstate",
  "emptySlots": [],
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
