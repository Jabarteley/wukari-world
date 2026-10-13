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
  "name": "Mariehamn",
  "box": [
    60.03007064402641,
    19.79676611367186,
    60.174775355973594,
    20.08575388632814
  ],
  "core": [
    60.05720277751651,
    19.85102584549452,
    60.147643222483495,
    20.03149415450548
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/155087370",
      "line": "Mariehamn Western Harbour, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/111858376",
      "line": "F.P. von KNORRING, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/13688602433",
      "line": "Sjöfartsprogrammen vid Ålands yrkesgymnasium, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/360782167",
      "line": "Åland central hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1494779775",
      "line": "Lilla holmen, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/953317231",
      "line": "Telegrafen, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/261409033",
      "line": "Sankt Olofs kyrka, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/162310909",
      "line": "Mariehamns stadshus; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1557602324",
      "line": "Ålands lagting, a mapped place for the game."
    },
    {
      "key": "osm-node-9299613331",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/9299613331",
      "line": "Alandica Shipping Academy, a mapped place for the game."
    },
    {
      "key": "osm-node-1804271293",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1804271293",
      "line": "Torpviken birdwatching tower, a mapped place for the game."
    },
    {
      "key": "osm-node-5095859130",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5095859130",
      "line": "Önningebymuseet, a mapped place for the game."
    },
    {
      "key": "osm-way-306321868",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/306321868",
      "line": "Kungsö batteri, a mapped place for the game."
    },
    {
      "key": "osm-node-3669569440",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3669569440",
      "line": "Plus Minnessten, a mapped place for the game."
    },
    {
      "key": "osm-way-165234934",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/165234934",
      "line": "S:t Mårtens kyrka, a mapped place for the game."
    },
    {
      "key": "osm-way-494277380",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/494277380",
      "line": "Åland Pingstförsamling, a mapped place for the game."
    },
    {
      "key": "osm-way-493148135",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/493148135",
      "line": "Miramarparken, a mapped place for the game."
    },
    {
      "key": "osm-way-169355118",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/169355118",
      "line": "Sittkoff, a mapped place for the game."
    },
    {
      "key": "osm-way-527070540",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/527070540",
      "line": "Självstyrelseparken, a mapped place for the game."
    },
    {
      "key": "osm-way-173383813",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/173383813",
      "line": "ZEIPELS, a mapped place for the game."
    },
    {
      "key": "osm-node-14073432102",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/14073432102",
      "line": "Taste of Himalaya, a mapped place for the game."
    },
    {
      "key": "osm-way-496249920",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/496249920",
      "line": "Ombudet Spel & Café, a mapped place for the game."
    },
    {
      "key": "osm-way-1173832356",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1173832356",
      "line": "Baltic friidrottsarena, a mapped place for the game."
    },
    {
      "key": "osm-node-1805019649",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/1805019649",
      "line": "Ålands hotell- och restaurangskola, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11536716555",
      "ref": "node/11536716555",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716557",
      "ref": "node/11536716557",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716558",
      "ref": "node/11536716558",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716559",
      "ref": "node/11536716559",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716561",
      "ref": "node/11536716561",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11595843802",
      "ref": "node/11595843802",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11595843803",
      "ref": "node/11595843803",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11595843805",
      "ref": "node/11595843805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11595843806",
      "ref": "node/11595843806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1362588758",
      "ref": "node/1362588758",
      "kind": "neighbourhood"
    },
    {
      "id": "district-413735077",
      "ref": "node/413735077",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5303293740",
      "ref": "node/5303293740",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716554",
      "ref": "node/11536716554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716556",
      "ref": "node/11536716556",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716560",
      "ref": "node/11536716560",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716562",
      "ref": "node/11536716562",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11536716563",
      "ref": "node/11536716563",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11595843801",
      "ref": "node/11595843801",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-60843778",
      "ref": "way/60843778",
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
