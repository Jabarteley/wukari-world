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
  "name": "San Salvador",
  "box": [
    13.435425955503302,
    -89.37622092484835,
    13.878509889933978,
    -89.00609107515166
  ],
  "core": [
    13.652408777516504,
    -89.2373953103713,
    13.742849222483494,
    -89.14491668962872
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/443130350",
      "line": "Estación de Tren FENADESAL, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1519171556",
      "line": "La Ramada 2, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/139809829",
      "line": "Universidad Centroamericana José Simeón Cañas, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/140084935",
      "line": "Hospital El Salvador, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1193781654",
      "line": "Centro Recreativo Cultural Puerta del Diablo, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/178904086",
      "line": "Metrocentro, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "relation/7966675",
      "line": "Catedral Metropolitana del Divino Salvador del Mundo, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/4259632506",
      "line": "Alcaldía Municipal; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/562915545",
      "line": "Asamblea Legislativa, a mapped place for the game."
    },
    {
      "key": "osm-way-138475747",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/138475747",
      "line": "Universidad Dr. José Matías Delgado | Campus I, a mapped place for the game."
    },
    {
      "key": "osm-node-448010104",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/448010104",
      "line": "Estadio España, a mapped place for the game."
    },
    {
      "key": "osm-relation-6127139",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/6127139",
      "line": "Sitio Arqueológico Joya de Cerén, a mapped place for the game."
    },
    {
      "key": "osm-way-199426776",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/199426776",
      "line": "El Boqueron National Park, a mapped place for the game."
    },
    {
      "key": "osm-node-4236378091",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4236378091",
      "line": "Cristo de La Paz, a mapped place for the game."
    },
    {
      "key": "osm-node-3838426270",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3838426270",
      "line": "Monumento a La Constitución, a mapped place for the game."
    },
    {
      "key": "osm-way-38045211",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/38045211",
      "line": "Centro Comercial Galerías, a mapped place for the game."
    },
    {
      "key": "osm-way-1546379365",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1546379365",
      "line": "Estadio Cuscatlán, a mapped place for the game."
    },
    {
      "key": "osm-relation-6195189",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/6195189",
      "line": "Parque Cuscatlán, a mapped place for the game."
    },
    {
      "key": "osm-way-196615967",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/196615967",
      "line": "Iglesia El Carmen, a mapped place for the game."
    },
    {
      "key": "osm-node-7439633333",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7439633333",
      "line": "Santuario de Fátima, a mapped place for the game."
    },
    {
      "key": "osm-way-1546142604",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1546142604",
      "line": "Estadio Universitario Héroes y Mártires del 30 de julio de 1975, a mapped place for the game."
    },
    {
      "key": "osm-relation-8166884",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/8166884",
      "line": "Universidad Francisco Gavidia, a mapped place for the game."
    },
    {
      "key": "osm-way-373925847",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/373925847",
      "line": "Centro Comercial Multiplaza, a mapped place for the game."
    },
    {
      "key": "osm-relation-8776526",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/8776526",
      "line": "Hospital Benjamín Bloom, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10032569773",
      "ref": "node/10032569773",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12794845931",
      "ref": "node/12794845931",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1549828377",
      "ref": "node/1549828377",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2072441416",
      "ref": "node/2072441416",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2084090758",
      "ref": "node/2084090758",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3983178767",
      "ref": "node/3983178767",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3984288543",
      "ref": "node/3984288543",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4343872417",
      "ref": "node/4343872417",
      "kind": "neighbourhood"
    },
    {
      "id": "district-443196675",
      "ref": "node/443196675",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4518277705",
      "ref": "node/4518277705",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4521198155",
      "ref": "node/4521198155",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4521802415",
      "ref": "node/4521802415",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5425921950",
      "ref": "node/5425921950",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5436417172",
      "ref": "node/5436417172",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5463238207",
      "ref": "node/5463238207",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5490075077",
      "ref": "node/5490075077",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5490124806",
      "ref": "node/5490124806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6237244558",
      "ref": "node/6237244558",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3553081",
      "ref": "relation/3553081",
      "kind": "water"
    },
    {
      "id": "water-relation-8601946",
      "ref": "relation/8601946",
      "kind": "water"
    },
    {
      "id": "water-way-1085399798",
      "ref": "way/1085399798",
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
