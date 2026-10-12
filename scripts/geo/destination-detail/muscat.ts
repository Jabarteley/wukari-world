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
  "name": "Muscat",
  "box": [
    23.431481910066022,
    58.27546429885594,
    23.793243689933977,
    58.790164014151664
  ],
  "core": [
    23.567142577516506,
    58.544776801101335,
    23.657583022483493,
    58.64284999889867
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4269798290",
      "line": "desert king llc, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/462253537",
      "line": "Meknas, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/550202124",
      "line": "Oman Convention and Exhibition Center, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/231701392",
      "line": "Royal Hospital Oman, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/257266841",
      "line": "Al Qurm Natural Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/354859522",
      "line": "Oman Avenues Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4394766924",
      "line": "Temple de Shiva, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/244925887",
      "line": "Al Amerat Muncipality; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/7949837286",
      "line": "Consultative Council of Oman, a mapped place for the game."
    },
    {
      "key": "osm-way-243025679",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/243025679",
      "line": "Oman Medical College, a mapped place for the game."
    },
    {
      "key": "osm-way-286215978",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/286215978",
      "line": "Royal Oman Police Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-273893092",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/273893092",
      "line": "Bait Al Baranda Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-339873291",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/339873291",
      "line": "Museum of Omani Heritage, a mapped place for the game."
    },
    {
      "key": "osm-node-571119169",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/571119169",
      "line": "Oil and Gas Exhibition Center مكتب نفط عمان, a mapped place for the game."
    },
    {
      "key": "osm-way-993559976",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/993559976",
      "line": "Majan university, a mapped place for the game."
    },
    {
      "key": "osm-way-20147882",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/20147882",
      "line": "Sultan Qaboos Sports Complex, a mapped place for the game."
    },
    {
      "key": "osm-node-1721989476",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1721989476",
      "line": "Sultan Qaboos Grand Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-224449131",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/224449131",
      "line": "Al Zawawi Mosque, a mapped place for the game."
    },
    {
      "key": "osm-node-1719812351",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/1719812351",
      "line": "Muntaza.h Qantab, a mapped place for the game."
    },
    {
      "key": "osm-way-287310284",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/287310284",
      "line": "Al Amerat Public Park, a mapped place for the game."
    },
    {
      "key": "osm-node-10252459505",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10252459505",
      "line": "Caribou Coffee, a mapped place for the game."
    },
    {
      "key": "osm-node-6258430359",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6258430359",
      "line": "Juice shop, a mapped place for the game."
    },
    {
      "key": "osm-node-2559425023",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/2559425023",
      "line": "Al-Ansab, a mapped place for the game."
    },
    {
      "key": "osm-node-3703217884",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3703217884",
      "line": "مركز الريم الطبي, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1719812294",
      "ref": "node/1719812294",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719812399",
      "ref": "node/1719812399",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719823642",
      "ref": "node/1719823642",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719823652",
      "ref": "node/1719823652",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719828732",
      "ref": "node/1719828732",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719829191",
      "ref": "node/1719829191",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719830427",
      "ref": "node/1719830427",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719830913",
      "ref": "node/1719830913",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719830920",
      "ref": "node/1719830920",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719831040",
      "ref": "node/1719831040",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1719837206",
      "ref": "node/1719837206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1721968649",
      "ref": "node/1721968649",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1721968652",
      "ref": "node/1721968652",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1721989398",
      "ref": "node/1721989398",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1721989411",
      "ref": "node/1721989411",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1721989478",
      "ref": "node/1721989478",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11698024764",
      "ref": "node/11698024764",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12854554285",
      "ref": "node/12854554285",
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
