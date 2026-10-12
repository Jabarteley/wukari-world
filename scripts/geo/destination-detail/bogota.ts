import type { DetailConfig } from './config.ts'
import { placesQuery, extrasQuery, landuseQuery, roadsQuery, inlandWaterQuery } from './queries.ts'

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
  "name": "Bogota",
  "box": [
    4.4725008100660215,
    -74.26393673956612,
    4.834262589933978,
    -73.90332946043388
  ],
  "core": [
    4.608161477516505,
    -74.12870011158378,
    4.698601922483494,
    -74.03856608841622
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/12750496827",
      "line": "Estación Intermedia Bicentenario, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "way/409391089",
      "line": "Cafeteria La Central, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "node/13076585113",
      "line": "UDR UNAD Soacha, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "node/322779022",
      "line": "Clínica Nuestra Señora del Rosario, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "way/28299384",
      "line": "Humedal Santa María Del Lago, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/28551320",
      "line": "Centro Comercial Santafé, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/1224832137",
      "line": "Misión Carismática Internacional sede Mosquera, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "way/322751201",
      "line": "Plaza de Soacha; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "relation/18995838",
      "line": "Fiscalía Montevideo, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-way-675058435",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/675058435",
      "line": "Centro Industrial y de Desarrollo Empresarial, a mapped place for the game."
    },
    {
      "key": "osm-way-24410567",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/24410567",
      "line": "Estadio Alfonso López Pumarejo de la Ciudad Universitaria, a mapped place for the game."
    },
    {
      "key": "osm-way-663327841",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/663327841",
      "line": "Museo del Chicó, a mapped place for the game."
    },
    {
      "key": "osm-way-1377259992",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1377259992",
      "line": "Parque Metropolitano El Tunal, a mapped place for the game."
    },
    {
      "key": "osm-way-398077902",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/398077902",
      "line": "Universidad Externado de Colombia sede El Alcázar, a mapped place for the game."
    },
    {
      "key": "osm-node-1194775794",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1194775794",
      "line": "Monumento Ángeles Agustinianos, a mapped place for the game."
    },
    {
      "key": "osm-way-177256716",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/177256716",
      "line": "Iglesia Santiago Apóstol, a mapped place for the game."
    },
    {
      "key": "osm-way-26930352",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/26930352",
      "line": "Mundo Aventura, a mapped place for the game."
    },
    {
      "key": "osm-way-24152211",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/24152211",
      "line": "Parque Estadio Olaya Herrera, a mapped place for the game."
    },
    {
      "key": "osm-way-86369735",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/86369735",
      "line": "Centro de Tecnologías para la Construcción y la Madera (SENA), a mapped place for the game."
    },
    {
      "key": "osm-way-1008418546",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1008418546",
      "line": "Estadio Compensar, a mapped place for the game."
    },
    {
      "key": "osm-way-99625014",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/99625014",
      "line": "Basílica del Señor de Monserrate, a mapped place for the game."
    },
    {
      "key": "osm-relation-19135828",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/19135828",
      "line": "Centro Comercial Portal 80, a mapped place for the game."
    },
    {
      "key": "osm-way-24421901",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24421901",
      "line": "Mallplaza NQS, a mapped place for the game."
    },
    {
      "key": "osm-relation-19012716",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/19012716",
      "line": "Plaza de Toros La Santamaría, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1233840844",
      "ref": "node/1233840844",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12777042962",
      "ref": "node/12777042962",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12784309054",
      "ref": "node/12784309054",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12784330407",
      "ref": "node/12784330407",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12784330409",
      "ref": "node/12784330409",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12791980794",
      "ref": "node/12791980794",
      "kind": "neighbourhood"
    },
    {
      "id": "district-317888937",
      "ref": "node/317888937",
      "kind": "neighbourhood"
    },
    {
      "id": "district-319429377",
      "ref": "node/319429377",
      "kind": "neighbourhood"
    },
    {
      "id": "district-321587616",
      "ref": "node/321587616",
      "kind": "neighbourhood"
    },
    {
      "id": "district-323321599",
      "ref": "node/323321599",
      "kind": "neighbourhood"
    },
    {
      "id": "district-332700209",
      "ref": "node/332700209",
      "kind": "neighbourhood"
    },
    {
      "id": "district-343652355",
      "ref": "node/343652355",
      "kind": "neighbourhood"
    },
    {
      "id": "district-345250896",
      "ref": "node/345250896",
      "kind": "neighbourhood"
    },
    {
      "id": "district-349930372",
      "ref": "node/349930372",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3884149371",
      "ref": "node/3884149371",
      "kind": "neighbourhood"
    },
    {
      "id": "district-493077112",
      "ref": "node/493077112",
      "kind": "neighbourhood"
    },
    {
      "id": "district-521387026",
      "ref": "node/521387026",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5290647656",
      "ref": "node/5290647656",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-4000410",
      "ref": "relation/4000410",
      "kind": "water"
    },
    {
      "id": "water-relation-8417686",
      "ref": "relation/8417686",
      "kind": "water"
    },
    {
      "id": "water-way-29421723",
      "ref": "way/29421723",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
