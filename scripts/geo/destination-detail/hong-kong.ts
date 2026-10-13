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
  "maxRoads": 500,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Hong Kong",
  "box": [
    22.10095241006602,
    113.90515127684363,
    22.462714189933976,
    114.35269573837654
  ],
  "core": [
    22.236613077516505,
    114.10972733739798,
    22.327053522483492,
    114.20683886260203
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/245090969",
      "line": "Star Ferry, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7109127701",
      "line": "Cafe 100%, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/2097970871",
      "line": "Ping Shan Tin Shui Wai Public Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/224774042",
      "line": "North Lantau Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/10700987",
      "line": "Ma Wo Road Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/607534710",
      "line": "The LOHAS, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/3624929549",
      "line": "Pak She Tin Hau Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/159044473",
      "line": "Sha Tin Town Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1291689250",
      "line": "Tai Hing Government Offices, a mapped place for the game."
    },
    {
      "key": "osm-way-186138931",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/186138931",
      "line": "Maritime Services Training Institute, a mapped place for the game."
    },
    {
      "key": "osm-way-169542419",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/169542419",
      "line": "Sai Kung Tang Shiu Kin Sports Ground, a mapped place for the game."
    },
    {
      "key": "osm-way-457242085",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/457242085",
      "line": "Hong Kong Correctional Services Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-1511791460",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1511791460",
      "line": "Tin Hau Temple, a mapped place for the game."
    },
    {
      "key": "osm-node-8266367332",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8266367332",
      "line": "Ha Fa Shan, a mapped place for the game."
    },
    {
      "key": "osm-way-322429617",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/322429617",
      "line": "Lung Mo Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-587740480",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/587740480",
      "line": "Astropark, a mapped place for the game."
    },
    {
      "key": "osm-relation-12917211",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/12917211",
      "line": "Ma On Shan Park, a mapped place for the game."
    },
    {
      "key": "osm-way-125447650",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/125447650",
      "line": "Jordan Valley Park, a mapped place for the game."
    },
    {
      "key": "osm-way-445060456",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/445060456",
      "line": "Maclehose Medical Rehabilitation Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-950281943",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/950281943",
      "line": "THE SOUTHSIDE, a mapped place for the game."
    },
    {
      "key": "osm-node-3890530477",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3890530477",
      "line": "Rock Carving on Tung Lung Chau, a mapped place for the game."
    },
    {
      "key": "osm-relation-11953382",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/11953382",
      "line": "Cityplaza, a mapped place for the game."
    },
    {
      "key": "osm-way-158053530",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/158053530",
      "line": "Wo Yi Hop Road Sport Ground, a mapped place for the game."
    },
    {
      "key": "osm-way-205759235",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/205759235",
      "line": "Technological and Higher Education Institute of Hong Kong, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10091316707",
      "ref": "node/10091316707",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10091980024",
      "ref": "node/10091980024",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11379204787",
      "ref": "node/11379204787",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11384843110",
      "ref": "node/11384843110",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11402980092",
      "ref": "node/11402980092",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1295654855",
      "ref": "node/1295654855",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12965899037",
      "ref": "node/12965899037",
      "kind": "neighbourhood"
    },
    {
      "id": "district-148450504",
      "ref": "node/148450504",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1589520038",
      "ref": "node/1589520038",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1680951129",
      "ref": "node/1680951129",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1942630382",
      "ref": "node/1942630382",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2079926101",
      "ref": "node/2079926101",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2088054719",
      "ref": "node/2088054719",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2089477682",
      "ref": "node/2089477682",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2089480454",
      "ref": "node/2089480454",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2364363587",
      "ref": "node/2364363587",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2371064684",
      "ref": "node/2371064684",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2371064686",
      "ref": "node/2371064686",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1295878",
      "ref": "relation/1295878",
      "kind": "water"
    },
    {
      "id": "water-relation-1299568",
      "ref": "relation/1299568",
      "kind": "water"
    },
    {
      "id": "water-relation-14532131",
      "ref": "relation/14532131",
      "kind": "water"
    },
    {
      "id": "water-relation-30978",
      "ref": "relation/30978",
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
