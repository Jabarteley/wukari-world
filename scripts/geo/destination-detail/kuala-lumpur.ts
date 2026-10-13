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
  "name": "Kuala Lumpur",
  "box": [
    2.736535955503301,
    101.51427052810885,
    3.3325772899339787,
    101.87420367189114
  ],
  "core": [
    3.1064761775165053,
    101.6492515332168,
    3.196916622483495,
    101.73922266678319
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/243306384",
      "line": "Kepong Sentral, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5359377048",
      "line": "Starbucks, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/9704946",
      "line": "Islamic Science University of Malaysia, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/149160360",
      "line": "Hospital Canselor Tuanku Muhriz UKM, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/17633468",
      "line": "National Zoo, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/787651639",
      "line": "IOI City Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/313044458",
      "line": "Masjid As-Saadah, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/133751216",
      "line": "Sepang Municipal Council; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/229254507",
      "line": "Malaysian Houses of Parliament, a mapped place for the game."
    },
    {
      "key": "osm-way-342904301",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/342904301",
      "line": "MARA-Japan Industrial Institute, a mapped place for the game."
    },
    {
      "key": "osm-way-24691651",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/24691651",
      "line": "Bukit Jalil National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1207976408",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1207976408",
      "line": "Orang Asli Museum, Gombak, a mapped place for the game."
    },
    {
      "key": "osm-node-2935650691",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2935650691",
      "line": "Masjid Asy - Syabab, a mapped place for the game."
    },
    {
      "key": "osm-way-404265345",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/404265345",
      "line": "Kolej MARA Banting, a mapped place for the game."
    },
    {
      "key": "osm-way-823365646",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/823365646",
      "line": "HELP University Subang Bestari Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-200560100",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/200560100",
      "line": "Masjid Al-Munawwarah, a mapped place for the game."
    },
    {
      "key": "osm-node-11049175263",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11049175263",
      "line": "Tombstone of Teoh Beng Hock, a mapped place for the game."
    },
    {
      "key": "osm-way-1033470607",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1033470607",
      "line": "Mitsui Outlet Park KLIA Sepang, a mapped place for the game."
    },
    {
      "key": "osm-relation-11365206",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/11365206",
      "line": "1 Utama Shopping Centre, a mapped place for the game."
    },
    {
      "key": "osm-relation-17060995",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/17060995",
      "line": "Hospital Assunta, a mapped place for the game."
    },
    {
      "key": "osm-way-925097361",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/925097361",
      "line": "Stadium Majlis Perbandaran Selayang, a mapped place for the game."
    },
    {
      "key": "osm-way-914977615",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/914977615",
      "line": "Gleneagles Kuala Lumpur, a mapped place for the game."
    },
    {
      "key": "osm-node-8379958565",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8379958565",
      "line": "Istana Bukit Kayangan, a mapped place for the game."
    },
    {
      "key": "osm-way-487114579",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/487114579",
      "line": "Titiwangsa Lake Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11391896670",
      "ref": "node/11391896670",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11452032664",
      "ref": "node/11452032664",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11577918341",
      "ref": "node/11577918341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11727992267",
      "ref": "node/11727992267",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11931079172",
      "ref": "node/11931079172",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12911875969",
      "ref": "node/12911875969",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12945411000",
      "ref": "node/12945411000",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12945458601",
      "ref": "node/12945458601",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12946456691",
      "ref": "node/12946456691",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12997638848",
      "ref": "node/12997638848",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12999632982",
      "ref": "node/12999632982",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1352125909",
      "ref": "node/1352125909",
      "kind": "neighbourhood"
    },
    {
      "id": "district-140023561",
      "ref": "node/140023561",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14209253237",
      "ref": "node/14209253237",
      "kind": "neighbourhood"
    },
    {
      "id": "district-142337825",
      "ref": "node/142337825",
      "kind": "neighbourhood"
    },
    {
      "id": "district-144159724",
      "ref": "node/144159724",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1489439959",
      "ref": "node/1489439959",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1490405904",
      "ref": "node/1490405904",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-12480556",
      "ref": "relation/12480556",
      "kind": "water"
    },
    {
      "id": "water-relation-1675083",
      "ref": "relation/1675083",
      "kind": "water"
    },
    {
      "id": "water-relation-7383307",
      "ref": "relation/7383307",
      "kind": "water"
    },
    {
      "id": "water-relation-8181948",
      "ref": "relation/8181948",
      "kind": "water"
    },
    {
      "id": "water-way-23101572",
      "ref": "way/23101572",
      "kind": "water"
    },
    {
      "id": "water-way-23647659",
      "ref": "way/23647659",
      "kind": "water"
    },
    {
      "id": "water-way-372608950",
      "ref": "way/372608950",
      "kind": "water"
    },
    {
      "id": "water-way-492404914",
      "ref": "way/492404914",
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
