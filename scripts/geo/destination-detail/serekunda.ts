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
  "name": "Serrekunda",
  "box": [
    13.257881110066021,
    -16.85966745004166,
    13.61964288993398,
    -16.489946549958344
  ],
  "core": [
    13.393541777516505,
    -16.72099574479911,
    13.483982222483496,
    -16.62861825520089
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1170998865",
      "line": "Garage Brufut, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/619473209",
      "line": "Tao, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/255713471",
      "line": "Bibliothèque nationale de Gambie, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/249740590",
      "line": "Edward Francis Small Teaching Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/113756823",
      "line": "Methodist Mission, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/255666858",
      "line": "Marché Albert, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/370185031",
      "line": "Pipeline Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/255612628",
      "line": "Banjul City Council; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/378674902",
      "line": "Assemblée nationale de Gambie, a mapped place for the game."
    },
    {
      "key": "osm-way-374017688",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/374017688",
      "line": "American International University, a mapped place for the game."
    },
    {
      "key": "osm-way-816348601",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/816348601",
      "line": "Independence Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-110043106",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/110043106",
      "line": "Abuko Nature Reserve, a mapped place for the game."
    },
    {
      "key": "osm-way-263258266",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/263258266",
      "line": "Fort Bullen, a mapped place for the game."
    },
    {
      "key": "osm-way-166695422",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/166695422",
      "line": "Bijilo Forest Park, a mapped place for the game."
    },
    {
      "key": "osm-way-249687879",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/249687879",
      "line": "Serrekunda West, a mapped place for the game."
    },
    {
      "key": "osm-way-370186566",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/370186566",
      "line": "MRC Unit The Gambia at LSHTM, a mapped place for the game."
    },
    {
      "key": "osm-way-255647292",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/255647292",
      "line": "King George V Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-255649417",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/255649417",
      "line": "Cathedral of Our Lady of the Assumption, a mapped place for the game."
    },
    {
      "key": "osm-way-255647179",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/255647179",
      "line": "Église Sainte-Marie, a mapped place for the game."
    },
    {
      "key": "osm-node-6300945109",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6300945109",
      "line": "Campbeach Bar & Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-12025767906",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/12025767906",
      "line": "Youna Clinic, a mapped place for the game."
    },
    {
      "key": "osm-node-9080250964",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9080250964",
      "line": "Fabulous Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-9158275429",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/9158275429",
      "line": "Mama Mini Market, a mapped place for the game."
    },
    {
      "key": "osm-way-255895814",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/255895814",
      "line": "International Trypanotolerance Centre (ITC), a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-366355939",
      "ref": "node/366355939",
      "kind": "neighbourhood"
    },
    {
      "id": "district-366356380",
      "ref": "node/366356380",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3737379911",
      "ref": "node/3737379911",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3741444448",
      "ref": "node/3741444448",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3741447977",
      "ref": "node/3741447977",
      "kind": "neighbourhood"
    },
    {
      "id": "district-494766563",
      "ref": "node/494766563",
      "kind": "neighbourhood"
    },
    {
      "id": "district-495130151",
      "ref": "node/495130151",
      "kind": "neighbourhood"
    },
    {
      "id": "district-495131581",
      "ref": "node/495131581",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196430998",
      "ref": "node/13196430998",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196430999",
      "ref": "node/13196430999",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196431000",
      "ref": "node/13196431000",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196438301",
      "ref": "node/13196438301",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196438302",
      "ref": "node/13196438302",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196438303",
      "ref": "node/13196438303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13196438304",
      "ref": "node/13196438304",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13240470069",
      "ref": "node/13240470069",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13563897824",
      "ref": "node/13563897824",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13711315891",
      "ref": "node/13711315891",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3679751",
      "ref": "relation/3679751",
      "kind": "water"
    },
    {
      "id": "water-relation-5402175",
      "ref": "relation/5402175",
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
