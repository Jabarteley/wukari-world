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
  "name": "Lima",
  "box": [
    -12.22686168993398,
    -77.21442335255911,
    -11.865099910066021,
    -76.8467590474409
  ],
  "core": [
    -12.091201022483496,
    -77.07652579868561,
    -12.000760577516505,
    -76.9846566013144
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1278915817",
      "line": "Estación Estadio Nacional, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6228532187",
      "line": "Central, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/126861408",
      "line": "National Technological University of South Lima, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/777346012",
      "line": "Hospital Nacional Daniel Alcides Carrión, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/320407571",
      "line": "Capilla Santa Rosa, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/285826118",
      "line": "Real Plaza Pro, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1315440869",
      "line": "Islamic Association of Peru, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/271265001",
      "line": "Municipalidad de San Juan de Miraflores; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1239679416",
      "line": "Instituto Geofísico del Perú, a mapped place for the game."
    },
    {
      "key": "osm-relation-12280616",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/12280616",
      "line": "National University of Engineering, a mapped place for the game."
    },
    {
      "key": "osm-way-375577634",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/375577634",
      "line": "Estadio Municipal de la Molina, a mapped place for the game."
    },
    {
      "key": "osm-node-1728415463",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1728415463",
      "line": "Cajamarquilla, a mapped place for the game."
    },
    {
      "key": "osm-node-10294326057",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10294326057",
      "line": "Huaca Templo Con Con, a mapped place for the game."
    },
    {
      "key": "osm-way-808110260",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/808110260",
      "line": "San Juan Bautista Penitentiary Center, a mapped place for the game."
    },
    {
      "key": "osm-way-401854468",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/401854468",
      "line": "Centro Comercial Caminos del Inca, a mapped place for the game."
    },
    {
      "key": "osm-way-437330220",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/437330220",
      "line": "Universidad San Juan Bautista, a mapped place for the game."
    },
    {
      "key": "osm-relation-6252388",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/6252388",
      "line": "Ciudad Universitaria de la Universidad Nacional Mayor de San Marcos, a mapped place for the game."
    },
    {
      "key": "osm-way-436738985",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/436738985",
      "line": "Iglesia Evangelica Coreana, a mapped place for the game."
    },
    {
      "key": "osm-way-401294974",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/401294974",
      "line": "Estadio Atlético de la Villa Deportiva Nacional, a mapped place for the game."
    },
    {
      "key": "osm-way-68674787",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/68674787",
      "line": "Royal Plaza, a mapped place for the game."
    },
    {
      "key": "osm-node-1459528357",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1459528357",
      "line": "Santo Cristo, a mapped place for the game."
    },
    {
      "key": "osm-way-76554673",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/76554673",
      "line": "Plaza Ramón Castilla, a mapped place for the game."
    },
    {
      "key": "osm-way-379394923",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/379394923",
      "line": "Estadio Municipal de Chorrillos, a mapped place for the game."
    },
    {
      "key": "osm-way-76738820",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/76738820",
      "line": "Love Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-4060539019",
      "ref": "node/4060539019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4401379664",
      "ref": "node/4401379664",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4469024717",
      "ref": "node/4469024717",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9733645639",
      "ref": "node/9733645639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10061658215",
      "ref": "node/10061658215",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10061658216",
      "ref": "node/10061658216",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10061681817",
      "ref": "node/10061681817",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10061681818",
      "ref": "node/10061681818",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10061681819",
      "ref": "node/10061681819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263025",
      "ref": "node/10067263025",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263026",
      "ref": "node/10067263026",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263027",
      "ref": "node/10067263027",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263028",
      "ref": "node/10067263028",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263029",
      "ref": "node/10067263029",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263030",
      "ref": "node/10067263030",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263031",
      "ref": "node/10067263031",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263032",
      "ref": "node/10067263032",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10067263033",
      "ref": "node/10067263033",
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
