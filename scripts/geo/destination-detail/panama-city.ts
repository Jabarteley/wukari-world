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
  "name": "Panama City",
  "box": [
    8.79056841006602,
    -79.71615922013568,
    9.152330189933979,
    -79.35220117986431
  ],
  "core": [
    8.926229077516505,
    -79.57965773437142,
    9.016669522483495,
    -79.48870266562857
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5208805275",
      "line": "5 de Mayo, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12954711904",
      "line": "Café Lavanda, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/387400207",
      "line": "Florida State University Panamá, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1290651149",
      "line": "Hospital Nacional, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/22946547",
      "line": "Summit Municipal Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/273732972",
      "line": "Albrook Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/379779318",
      "line": "Templo de la Ciudad de Panamá, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/301268537",
      "line": "Palacio Municipal; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/605386929",
      "line": "Asamblea Nacional de Panamá, a mapped place for the game."
    },
    {
      "key": "osm-way-1053821129",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1053821129",
      "line": "Instituto Tecnico Superior Especializado, a mapped place for the game."
    },
    {
      "key": "osm-way-180003519",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/180003519",
      "line": "Estadio Olímpico Rommel Fernández Gutiérrez, a mapped place for the game."
    },
    {
      "key": "osm-node-2845942117",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2845942117",
      "line": "Pedro Miguel Locks, a mapped place for the game."
    },
    {
      "key": "osm-way-570814678",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/570814678",
      "line": "Universidad Tecnológica de Panamá, a mapped place for the game."
    },
    {
      "key": "osm-way-74450873",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/74450873",
      "line": "Biomuseo, a mapped place for the game."
    },
    {
      "key": "osm-way-387387459",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/387387459",
      "line": "King's College, a mapped place for the game."
    },
    {
      "key": "osm-node-6460155335",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6460155335",
      "line": "Monumento Goethals, a mapped place for the game."
    },
    {
      "key": "osm-way-146820184",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/146820184",
      "line": "Hospital Punta Pacífica, a mapped place for the game."
    },
    {
      "key": "osm-way-550798044",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/550798044",
      "line": "Estadio Juan D. Arosemena, a mapped place for the game."
    },
    {
      "key": "osm-way-179079739",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/179079739",
      "line": "Iglesia de Santa Ana, a mapped place for the game."
    },
    {
      "key": "osm-way-140348509",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/140348509",
      "line": "Basílica Metropolitana Santa María la Antigua, a mapped place for the game."
    },
    {
      "key": "osm-way-697812340",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/697812340",
      "line": "Museo Afroantillano, a mapped place for the game."
    },
    {
      "key": "osm-relation-11719090",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/11719090",
      "line": "Metropolitan Natural Park, a mapped place for the game."
    },
    {
      "key": "osm-way-383814377",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/383814377",
      "line": "Complejo Hospitalario Dr. Arnulfo Arias Madrid, a mapped place for the game."
    },
    {
      "key": "osm-node-3882111329",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3882111329",
      "line": "Pio Pio, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2188992272",
      "ref": "node/2188992272",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2606132097",
      "ref": "node/2606132097",
      "kind": "neighbourhood"
    },
    {
      "id": "district-635484936",
      "ref": "node/635484936",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7785704043",
      "ref": "node/7785704043",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11103010373",
      "ref": "node/11103010373",
      "kind": "neighbourhood"
    },
    {
      "id": "district-113116536",
      "ref": "node/113116536",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11882917185",
      "ref": "node/11882917185",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11910952645",
      "ref": "node/11910952645",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11940540767",
      "ref": "node/11940540767",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11945285512",
      "ref": "node/11945285512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12140547194",
      "ref": "node/12140547194",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12209335913",
      "ref": "node/12209335913",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12211068585",
      "ref": "node/12211068585",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12212618730",
      "ref": "node/12212618730",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12539906569",
      "ref": "node/12539906569",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12542124121",
      "ref": "node/12542124121",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12585285427",
      "ref": "node/12585285427",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13117101810",
      "ref": "node/13117101810",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2314152",
      "ref": "relation/2314152",
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
