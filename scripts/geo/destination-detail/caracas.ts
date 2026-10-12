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
  "name": "Caracas",
  "box": [
    10.32521251006602,
    -67.09743428529598,
    10.686974289933978,
    -66.73176731470403
  ],
  "core": [
    10.460873177516504,
    -66.96028888465449,
    10.551313622483494,
    -66.86891271534552
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2055473614",
      "line": "La Hoyada, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/7461404220",
      "line": "Burger Shack, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/6176737",
      "line": "Universidad Santa María, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/220598788",
      "line": "Hospital Cardiológico Infantil Latinoamericano, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/6464064",
      "line": "Parque Vinicio Adames, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/19078807",
      "line": "Centro Comercial Parque Cristal, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/712547967",
      "line": "Biserica Ortodoxă Română „Sf. Împ. Constantin și Elena”, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/3913460",
      "line": "Plaza Francia; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/2827512146",
      "line": "Registro Mercantil Tercero Estado Miranda, a mapped place for the game."
    },
    {
      "key": "osm-way-249082946",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/249082946",
      "line": "Universidad Monteávila, a mapped place for the game."
    },
    {
      "key": "osm-way-783746298",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/783746298",
      "line": "Estadio Fórum La Guaira, a mapped place for the game."
    },
    {
      "key": "osm-way-191586173",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/191586173",
      "line": "Museo de Artes Visuales Alejandro Otero, a mapped place for the game."
    },
    {
      "key": "osm-relation-13436467",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/13436467",
      "line": "Hospital Dr. José Gregorio Hernández, a mapped place for the game."
    },
    {
      "key": "osm-way-226086260",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/226086260",
      "line": "Parque Zoológico de Caricuao, a mapped place for the game."
    },
    {
      "key": "osm-way-226265822",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/226265822",
      "line": "Centro Comercial El Valle, a mapped place for the game."
    },
    {
      "key": "osm-way-378723909",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/378723909",
      "line": "Domo José María Vargas, a mapped place for the game."
    },
    {
      "key": "osm-way-216503320",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/216503320",
      "line": "Parque Zoológico El Pinar, a mapped place for the game."
    },
    {
      "key": "osm-way-179958526",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/179958526",
      "line": "Hospital San Juan de Dios, a mapped place for the game."
    },
    {
      "key": "osm-way-240655511",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/240655511",
      "line": "C.C. City Market, a mapped place for the game."
    },
    {
      "key": "osm-way-276063096",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/276063096",
      "line": "Caracas Venezuela Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-306847206",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/306847206",
      "line": "Universidad Nacional Experimental Marítima del Caribe, a mapped place for the game."
    },
    {
      "key": "osm-way-217701255",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/217701255",
      "line": "Plaza Italia, a mapped place for the game."
    },
    {
      "key": "osm-relation-13281096",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/13281096",
      "line": "Universidad Simón Bolívar, a mapped place for the game."
    },
    {
      "key": "osm-relation-13278974",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/13278974",
      "line": "Los Caobos Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2260710287",
      "ref": "node/2260710287",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3704630626",
      "ref": "node/3704630626",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3704630630",
      "ref": "node/3704630630",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5418817821",
      "ref": "node/5418817821",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5709890656",
      "ref": "node/5709890656",
      "kind": "neighbourhood"
    },
    {
      "id": "district-601214777",
      "ref": "node/601214777",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7213200890",
      "ref": "node/7213200890",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7644707523",
      "ref": "node/7644707523",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7924962614",
      "ref": "node/7924962614",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8459622871",
      "ref": "node/8459622871",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8952237267",
      "ref": "node/8952237267",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8952237268",
      "ref": "node/8952237268",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8952237269",
      "ref": "node/8952237269",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9127971655",
      "ref": "node/9127971655",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9129371622",
      "ref": "node/9129371622",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10785806976",
      "ref": "node/10785806976",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11191751111",
      "ref": "node/11191751111",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11222277799",
      "ref": "node/11222277799",
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
