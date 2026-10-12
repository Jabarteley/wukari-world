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
  "name": "Santiago",
  "box": [
    -33.61858038993398,
    -70.86681494446434,
    -33.25681861006602,
    -70.43531925553567
  ],
  "core": [
    -33.482919722483494,
    -70.70491943672432,
    -33.39247927751651,
    -70.59721476327569
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/141096340",
      "line": "Toesca, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/338969590",
      "line": "Pizza Pizza, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/9689186988",
      "line": "Escuela de Especialidades Sargento 1.º Adolfo Menadier Rojas, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/23393396",
      "line": "Air Force Clinical Hospital General Doctor Raúl Yazigi, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/30359747",
      "line": "Plaza Elvira Matte, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/25448975",
      "line": "Mall Plaza Vespucio, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/175940910",
      "line": "Templo Votivo de Maipú, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/192294478",
      "line": "Ilustre Municipalidad de La Pintana; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/264762579",
      "line": "Consejo Nacional de Televisión, a mapped place for the game."
    },
    {
      "key": "osm-way-229040812",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/229040812",
      "line": "Campus Peñalolén Universidad Adolfo Ibáñez, a mapped place for the game."
    },
    {
      "key": "osm-way-38622709",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/38622709",
      "line": "Hipódromo Chile, a mapped place for the game."
    },
    {
      "key": "osm-node-3372723745",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3372723745",
      "line": "Un lugar para la memoria (Memorial Tres Sillas), a mapped place for the game."
    },
    {
      "key": "osm-way-259812380",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/259812380",
      "line": "Parque Metropolitano Sur Cerro Chena, a mapped place for the game."
    },
    {
      "key": "osm-way-446732086",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/446732086",
      "line": "Centro Nacional de Arte Contemporáneo de Los Cerrillos, a mapped place for the game."
    },
    {
      "key": "osm-node-6938501880",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6938501880",
      "line": "Museo de la Vivienda Tradicional Local, a mapped place for the game."
    },
    {
      "key": "osm-way-1494357523",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1494357523",
      "line": "Iglesia de Santa Rosa de Lo Barnechea, a mapped place for the game."
    },
    {
      "key": "osm-way-195112800",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/195112800",
      "line": "Parque Mapocho Río Tramo 3, a mapped place for the game."
    },
    {
      "key": "osm-way-103593737",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/103593737",
      "line": "Academia Politécnica Militar del General de Ejército René Schneider Chereau, a mapped place for the game."
    },
    {
      "key": "osm-way-570065671",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/570065671",
      "line": "Universidad de Los Andes, a mapped place for the game."
    },
    {
      "key": "osm-node-7009112985",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/7009112985",
      "line": "Clínica RedSalud Santiago, a mapped place for the game."
    },
    {
      "key": "osm-way-450296536",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/450296536",
      "line": "Parroquia la Natividad del Señor, a mapped place for the game."
    },
    {
      "key": "osm-relation-9951085",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/9951085",
      "line": "Pista Atlética Estadio La Cisterna, a mapped place for the game."
    },
    {
      "key": "osm-way-236844639",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/236844639",
      "line": "Velódromo Sergio Tormen Méndez, a mapped place for the game."
    },
    {
      "key": "osm-way-193760181",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/193760181",
      "line": "Hospital Padre Hurtado, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10605104239",
      "ref": "node/10605104239",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10701118609",
      "ref": "node/10701118609",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10703162238",
      "ref": "node/10703162238",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10863898391",
      "ref": "node/10863898391",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10863900838",
      "ref": "node/10863900838",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467325",
      "ref": "node/10882467325",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467326",
      "ref": "node/10882467326",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467328",
      "ref": "node/10882467328",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467329",
      "ref": "node/10882467329",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467337",
      "ref": "node/10882467337",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467338",
      "ref": "node/10882467338",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467339",
      "ref": "node/10882467339",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467341",
      "ref": "node/10882467341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882467342",
      "ref": "node/10882467342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882674879",
      "ref": "node/10882674879",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882674880",
      "ref": "node/10882674880",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882674881",
      "ref": "node/10882674881",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10882674884",
      "ref": "node/10882674884",
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
