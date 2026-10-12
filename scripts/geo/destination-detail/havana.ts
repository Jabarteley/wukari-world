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
  "name": "Havana",
  "box": [
    22.95442411006602,
    -82.5546022865957,
    23.316185889933976,
    -82.1633239134043
  ],
  "core": [
    23.090084777516505,
    -82.40782317211331,
    23.180525222483492,
    -82.31010302788668
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/23872644",
      "line": "Havana, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5029240527",
      "line": "El Cuarto de Tula, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/367375102",
      "line": "Academia de las FAR General Máximo Gómez, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/38804278",
      "line": "Hospital Militar Dr. Carlos J. Finlay, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/231769366",
      "line": "Havana Zoological Garden, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3903174200",
      "line": "Mercado Agropecuario, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/38575195",
      "line": "Basilica Menor de San Francisco de Asís, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/319925515",
      "line": "Revolution Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/12639209",
      "line": "National Capitol, a mapped place for the game."
    },
    {
      "key": "osm-way-331472906",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/331472906",
      "line": "Instituto Superior de Arte (ISA), a mapped place for the game."
    },
    {
      "key": "osm-way-1490900566",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1490900566",
      "line": "Pan American Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-2199414676",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2199414676",
      "line": "Hemingway House Havana, a mapped place for the game."
    },
    {
      "key": "osm-way-1419495076",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1419495076",
      "line": "Leonor Pérez, a mapped place for the game."
    },
    {
      "key": "osm-way-257926030",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/257926030",
      "line": "National Aquarium, a mapped place for the game."
    },
    {
      "key": "osm-way-1170872914",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1170872914",
      "line": "Estadio Pedro Marrero, a mapped place for the game."
    },
    {
      "key": "osm-way-23919819",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/23919819",
      "line": "John Lennon Park, a mapped place for the game."
    },
    {
      "key": "osm-way-665673095",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665673095",
      "line": "Latin American Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-245349429",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/245349429",
      "line": "Fraternity park, a mapped place for the game."
    },
    {
      "key": "osm-relation-17595359",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/17595359",
      "line": "Universidad Tecnológica de la Habana \"José Antonio Echeverría\" (CUJAE), a mapped place for the game."
    },
    {
      "key": "osm-way-379448607",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/379448607",
      "line": "Parroquia de San Juan Bosco, a mapped place for the game."
    },
    {
      "key": "osm-way-312320219",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/312320219",
      "line": "Templo Beth Shalom, a mapped place for the game."
    },
    {
      "key": "osm-node-993692568",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/993692568",
      "line": "Paladar La Guarida, a mapped place for the game."
    },
    {
      "key": "osm-way-385503017",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/385503017",
      "line": "Instituto Superior de Ciencias y Tecnologías Aplicadas, a mapped place for the game."
    },
    {
      "key": "osm-node-4157873423",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4157873423",
      "line": "Instituto Neurología y Neurocirugía, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1900806967",
      "ref": "node/1900806967",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2300143493",
      "ref": "node/2300143493",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2300280577",
      "ref": "node/2300280577",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2549774993",
      "ref": "node/2549774993",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2608979221",
      "ref": "node/2608979221",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3027733547",
      "ref": "node/3027733547",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3365351366",
      "ref": "node/3365351366",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3708781117",
      "ref": "node/3708781117",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4812617120",
      "ref": "node/4812617120",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10288554549",
      "ref": "node/10288554549",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10298357149",
      "ref": "node/10298357149",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10744514695",
      "ref": "node/10744514695",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11558761504",
      "ref": "node/11558761504",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12570996374",
      "ref": "node/12570996374",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13004282708",
      "ref": "node/13004282708",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13391839797",
      "ref": "node/13391839797",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13633903142",
      "ref": "node/13633903142",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13952812875",
      "ref": "node/13952812875",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-15590913",
      "ref": "relation/15590913",
      "kind": "water"
    },
    {
      "id": "water-relation-7433837",
      "ref": "relation/7433837",
      "kind": "water"
    },
    {
      "id": "water-way-38491033",
      "ref": "way/38491033",
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
