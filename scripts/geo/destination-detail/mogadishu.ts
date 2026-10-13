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
  "name": "Mogadishu",
  "box": [
    1.8540503100660215,
    45.162121628217974,
    2.2158120899339786,
    45.52171497178203
  ],
  "core": [
    1.9897109775165054,
    45.29697312363944,
    2.0801514224834947,
    45.38686347636057
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/313404166",
      "line": "Isgoyska Xoosh, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11235334239",
      "line": "Tufaax Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/395085700",
      "line": "Somali National University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1371916683",
      "line": "Martino Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1558283056",
      "line": "Xarunta Dalxiiska ee Degmada Dayniile, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1011677469",
      "line": "Fish Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/34006525",
      "line": "Masjidka isbahaysiga جامع التضامن الإسلامي, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/835495512",
      "line": "Degmada Deyniile; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1373530319",
      "line": "Ministry of Defence of Somalia, a mapped place for the game."
    },
    {
      "key": "osm-way-713009128",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/713009128",
      "line": "Zamzam University, a mapped place for the game."
    },
    {
      "key": "osm-way-609620228",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/609620228",
      "line": "Mogadishu Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-9208024997",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9208024997",
      "line": "Ahmed Gurey Monument, a mapped place for the game."
    },
    {
      "key": "osm-node-9201097499",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9201097499",
      "line": "Battle of Mogadishu 1993 - first Black Hawk down (Wolcott), a mapped place for the game."
    },
    {
      "key": "osm-way-126234890",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/126234890",
      "line": "Mogadishu Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-9201097500",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/9201097500",
      "line": "Battle of Mogadishu 1993 - second Black Hawk down (Durant), a mapped place for the game."
    },
    {
      "key": "osm-way-5057908",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/5057908",
      "line": "Eng. Yariisow Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1362840018",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1362840018",
      "line": "DKM Boba & Waffles, a mapped place for the game."
    },
    {
      "key": "osm-way-1024928619",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1024928619",
      "line": "Masjidka Afarta Minaaradood, a mapped place for the game."
    },
    {
      "key": "osm-way-1373864082",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1373864082",
      "line": "Keysane Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-1373683895",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1373683895",
      "line": "SOS Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-308595147",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/308595147",
      "line": "Suuqa Wayn, a mapped place for the game."
    },
    {
      "key": "osm-way-1371916687",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1371916687",
      "line": "Somali Marino Coast and Navy Guard, a mapped place for the game."
    },
    {
      "key": "osm-way-1373751544",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1373751544",
      "line": "Somali Aviation Academy, a mapped place for the game."
    },
    {
      "key": "osm-node-4243421295",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4243421295",
      "line": "afrikan village residence, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12716664907",
      "ref": "node/12716664907",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1401884988",
      "ref": "node/1401884988",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404227217",
      "ref": "node/1404227217",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1404230404",
      "ref": "node/1404230404",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1680817477",
      "ref": "node/1680817477",
      "kind": "neighbourhood"
    },
    {
      "id": "district-315098533",
      "ref": "node/315098533",
      "kind": "neighbourhood"
    },
    {
      "id": "district-315100496",
      "ref": "node/315100496",
      "kind": "neighbourhood"
    },
    {
      "id": "district-315100657",
      "ref": "node/315100657",
      "kind": "neighbourhood"
    },
    {
      "id": "district-319263779",
      "ref": "node/319263779",
      "kind": "neighbourhood"
    },
    {
      "id": "district-319266401",
      "ref": "node/319266401",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36422040",
      "ref": "node/36422040",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36426437",
      "ref": "node/36426437",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36841731",
      "ref": "node/36841731",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36841732",
      "ref": "node/36841732",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36847698",
      "ref": "node/36847698",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36847699",
      "ref": "node/36847699",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36848806",
      "ref": "node/36848806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-36848807",
      "ref": "node/36848807",
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
