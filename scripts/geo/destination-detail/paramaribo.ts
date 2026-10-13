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
  "name": "Paramaribo",
  "box": [
    5.443785955503301,
    -55.35104783597648,
    6.0056436899339785,
    -54.989740364023525
  ],
  "core": [
    5.779542577516506,
    -55.21554641340975,
    5.869983022483495,
    -55.12524178659026
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1660255196",
      "line": "Line 5 bus station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4069840558",
      "line": "Naskip Lelydorp, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/135518480",
      "line": "Anton de Kom University ADEK, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/211387613",
      "line": "Academisch Ziekenhuis Paramaribo, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/155987984",
      "line": "Palmentuin, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/315858388",
      "line": "Maretraite Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/315124289",
      "line": "Arya Dewaker Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/962356518",
      "line": "William Kraanplein; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/135982001",
      "line": "De Nationale Assemblée, a mapped place for the game."
    },
    {
      "key": "osm-way-229384907",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/229384907",
      "line": "CELOS, a mapped place for the game."
    },
    {
      "key": "osm-way-229263516",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/229263516",
      "line": "Clarence Seedorf stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-135643181",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/135643181",
      "line": "Fort Nieuw Amsterdam, a mapped place for the game."
    },
    {
      "key": "osm-way-397593588",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/397593588",
      "line": "Paramaribo Zoo, a mapped place for the game."
    },
    {
      "key": "osm-node-4462598425",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4462598425",
      "line": "Butterfly Plantation, a mapped place for the game."
    },
    {
      "key": "osm-way-156303014",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/156303014",
      "line": "Andre Kamperveen Stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-955279180",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/955279180",
      "line": "Diakonessenhuis, a mapped place for the game."
    },
    {
      "key": "osm-way-718195852",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/718195852",
      "line": "Dr. Ir. F. Essed Stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-968232803",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/968232803",
      "line": "Sint Vincentius Ziekenhuis, a mapped place for the game."
    },
    {
      "key": "osm-way-191965515",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/191965515",
      "line": "Synagoge Neve Shalom, a mapped place for the game."
    },
    {
      "key": "osm-way-191965158",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/191965158",
      "line": "Sint-Petrus-en-Pauluskathedraal, a mapped place for the game."
    },
    {
      "key": "osm-way-155987982",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/155987982",
      "line": "Onafhankelijkheidsplein, a mapped place for the game."
    },
    {
      "key": "osm-way-170813028",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/170813028",
      "line": "Hermitage Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-444063650",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/444063650",
      "line": "Vriendschapspark, a mapped place for the game."
    },
    {
      "key": "osm-way-193176151",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/193176151",
      "line": "Centrale Markt, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2813326389",
      "ref": "node/2813326389",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2813328805",
      "ref": "node/2813328805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2813330401",
      "ref": "node/2813330401",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5878582603",
      "ref": "node/5878582603",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5902213073",
      "ref": "node/5902213073",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5906584965",
      "ref": "node/5906584965",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5948750220",
      "ref": "node/5948750220",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6013293808",
      "ref": "node/6013293808",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6121976468",
      "ref": "node/6121976468",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6122030893",
      "ref": "node/6122030893",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7620455050",
      "ref": "node/7620455050",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8945183443",
      "ref": "node/8945183443",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8945183444",
      "ref": "node/8945183444",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9770445512",
      "ref": "node/9770445512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9770445513",
      "ref": "node/9770445513",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11521318",
      "ref": "relation/11521318",
      "kind": "water"
    },
    {
      "id": "water-relation-2591043",
      "ref": "relation/2591043",
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
