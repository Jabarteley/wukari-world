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
  "name": "Santo Domingo",
  "box": [
    18.290504910066023,
    -70.08146532695397,
    18.652266689933978,
    -69.65943029578544
  ],
  "core": [
    18.426165577516507,
    -69.93921130672038,
    18.516606022483494,
    -69.84447589327962
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/12643051616",
      "line": "Amín Abel Hasbún, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1743869202",
      "line": "Club Nautico Haina, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/30087660",
      "line": "Instituto Tecnológico de Santo Domingo, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/164695925",
      "line": "Plaza de la Salud, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28101419",
      "line": "Parque Colón, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3493437574",
      "line": "Parador Ejecutivo, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/3566463694",
      "line": "Ministerios Casa De Zion, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/6525597885",
      "line": "Junta Distrito Municipal La Victoria; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/327261539",
      "line": "Ministerio de Relaciones Exteriores, a mapped place for the game."
    },
    {
      "key": "osm-way-410061868",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/410061868",
      "line": "Universidad del Caribe, a mapped place for the game."
    },
    {
      "key": "osm-way-250861349",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/250861349",
      "line": "Autódromo Internacional de Las Américas, a mapped place for the game."
    },
    {
      "key": "osm-way-53622354",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/53622354",
      "line": "Faro a Colón, a mapped place for the game."
    },
    {
      "key": "osm-way-80445127",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/80445127",
      "line": "Museo del Hombre Dominicano, a mapped place for the game."
    },
    {
      "key": "osm-way-250877911",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/250877911",
      "line": "Universidad Nacional Pedro Heriquez Urena - UNPHU, a mapped place for the game."
    },
    {
      "key": "osm-way-300113579",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/300113579",
      "line": "Pabellón de la Fama del Deporte Dominicano, a mapped place for the game."
    },
    {
      "key": "osm-way-338342953",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/338342953",
      "line": "Universidad Católica Santo Domingo (UCSD), a mapped place for the game."
    },
    {
      "key": "osm-way-316141824",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/316141824",
      "line": "Templo de Santo Domingo, a mapped place for the game."
    },
    {
      "key": "osm-way-28809979",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/28809979",
      "line": "Estadio Olímpico Félix Sánchez, a mapped place for the game."
    },
    {
      "key": "osm-way-111187823",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/111187823",
      "line": "Estadio Quisqueya, a mapped place for the game."
    },
    {
      "key": "osm-way-41565898",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/41565898",
      "line": "Basílica Catedral Metropolitana Santa María de la Encarnación Primada de América, a mapped place for the game."
    },
    {
      "key": "osm-way-378243851",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/378243851",
      "line": "Centro de Medicina Avanzada Dr. Abel González, a mapped place for the game."
    },
    {
      "key": "osm-way-222941453",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/222941453",
      "line": "Hospital Infantil Robert Reid Cabral, a mapped place for the game."
    },
    {
      "key": "osm-way-358599439",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/358599439",
      "line": "Centro Olímpico Juan Pablo Duarte, a mapped place for the game."
    },
    {
      "key": "osm-way-1170357043",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1170357043",
      "line": "Parque Central de San Antonio de Guerra, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1736374131",
      "ref": "node/1736374131",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1736374154",
      "ref": "node/1736374154",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1990140155",
      "ref": "node/1990140155",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2320132482",
      "ref": "node/2320132482",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5080158911",
      "ref": "node/5080158911",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7403953465",
      "ref": "node/7403953465",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1000826019",
      "ref": "node/1000826019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10147460410",
      "ref": "node/10147460410",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10147460411",
      "ref": "node/10147460411",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10266064019",
      "ref": "node/10266064019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10307264796",
      "ref": "node/10307264796",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10309238099",
      "ref": "node/10309238099",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10309281235",
      "ref": "node/10309281235",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10309281236",
      "ref": "node/10309281236",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10309281237",
      "ref": "node/10309281237",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10827406480",
      "ref": "node/10827406480",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10827406481",
      "ref": "node/10827406481",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10827406482",
      "ref": "node/10827406482",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-253854",
      "ref": "relation/253854",
      "kind": "water"
    },
    {
      "id": "water-relation-3084737",
      "ref": "relation/3084737",
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
