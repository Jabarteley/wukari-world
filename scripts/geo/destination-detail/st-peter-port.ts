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
  "name": "Saint Peter Port",
  "box": [
    49.275933310066016,
    -2.816417658416154,
    49.63769508993398,
    -2.261578141583846
  ],
  "core": [
    49.4115939775165,
    -2.6081603623108482,
    49.50203442248349,
    -2.469835437689152
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/12631433",
      "line": "St Peter Port Harbour, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1313064020",
      "line": "Portelet Kiosk, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/420020692",
      "line": "Priaulx Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/97562929",
      "line": "Princess Elizabeth Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/270116887",
      "line": "Saumarez Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/570299339",
      "line": "Market Square, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/197343099",
      "line": "St Tugual's Chapel, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/525722008",
      "line": "Castel Douzaine Room; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/232235142",
      "line": "Chief Pleas & Seneschal's Court, a mapped place for the game."
    },
    {
      "key": "osm-way-573718984",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/573718984",
      "line": "College of Further Education, a mapped place for the game."
    },
    {
      "key": "osm-way-115109408",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/115109408",
      "line": "Footes Lane Sports Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-522604715",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/522604715",
      "line": "Bréhon Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-440654796",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/440654796",
      "line": "Le Trépied Dolmen, a mapped place for the game."
    },
    {
      "key": "osm-node-277523228",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/277523228",
      "line": "Doyle monument, a mapped place for the game."
    },
    {
      "key": "osm-way-243103087",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/243103087",
      "line": "St Philippe, Torteval, a mapped place for the game."
    },
    {
      "key": "osm-way-913686540",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/913686540",
      "line": "Notre Dame du Rosaire, a mapped place for the game."
    },
    {
      "key": "osm-way-80438718",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/80438718",
      "line": "Delancey Park, a mapped place for the game."
    },
    {
      "key": "osm-way-552204319",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/552204319",
      "line": "Cambridge Park, a mapped place for the game."
    },
    {
      "key": "osm-node-1552743655",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1552743655",
      "line": "Le Gouffre Cafe & Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-2512811018",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2512811018",
      "line": "Rousse Kiosk, a mapped place for the game."
    },
    {
      "key": "osm-node-6669704986",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6669704986",
      "line": "Viewing Gallery, a mapped place for the game."
    },
    {
      "key": "osm-node-6699211785",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/6699211785",
      "line": "Moulin Huet bay through the trees, Pierre-Auguste Renoir 1883, a mapped place for the game."
    },
    {
      "key": "osm-node-6504570133",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/6504570133",
      "line": "Renal Unit, a mapped place for the game."
    },
    {
      "key": "osm-node-13544152092",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/13544152092",
      "line": "Emergency Department, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-8366933049",
      "ref": "node/8366933049",
      "kind": "neighbourhood"
    },
    {
      "id": "district-27748769",
      "ref": "node/27748769",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750403",
      "ref": "node/8445750403",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750404",
      "ref": "node/8445750404",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12625687689",
      "ref": "node/12625687689",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750402",
      "ref": "node/8445750402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750405",
      "ref": "node/8445750405",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750406",
      "ref": "node/8445750406",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750412",
      "ref": "node/8445750412",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750411",
      "ref": "node/8445750411",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750407",
      "ref": "node/8445750407",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750408",
      "ref": "node/8445750408",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750409",
      "ref": "node/8445750409",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072668053",
      "ref": "node/2072668053",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445750410",
      "ref": "node/8445750410",
      "kind": "neighbourhood"
    },
    {
      "id": "district-115655304",
      "ref": "node/115655304",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2630584156",
      "ref": "node/2630584156",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2630584158",
      "ref": "node/2630584158",
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
