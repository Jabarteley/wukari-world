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
  "name": "Quito",
  "box": [
    -0.40104498993397847,
    -78.69199403625385,
    -0.039283210066021534,
    -78.33266076374616
  ],
  "core": [
    -0.26538432248349464,
    -78.55724344055972,
    -0.1749438775165054,
    -78.46741135944029
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/783649627",
      "line": "TelefériQo, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/499513295",
      "line": "California, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/4150084999",
      "line": "ESCUELA POLITECNICA DEL EJERCITO, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1101691224",
      "line": "Hospital Carlos Andrade Marin, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/31133611",
      "line": "Parque La Carolina, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/424993603",
      "line": "Palacio Arzobispal, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4858916958",
      "line": "Cimborio \"Virgen Del Cisne\", a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/1855823883",
      "line": "ESPE; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/381053952",
      "line": "Palacio de Carondelet, a mapped place for the game."
    },
    {
      "key": "osm-way-341560247",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/341560247",
      "line": "Colegio Academia Cotopaxi, a mapped place for the game."
    },
    {
      "key": "osm-way-26216680",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/26216680",
      "line": "Estadio Gonzalo Pozo Ripalda, a mapped place for the game."
    },
    {
      "key": "osm-way-31152844",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/31152844",
      "line": "Museo Capilla del Hombre, a mapped place for the game."
    },
    {
      "key": "osm-relation-4104543",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/4104543",
      "line": "Estadio Rodrigo Paz Delgado, a mapped place for the game."
    },
    {
      "key": "osm-way-1077119324",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1077119324",
      "line": "Estadio Banco Guayaquil, a mapped place for the game."
    },
    {
      "key": "osm-way-1090509480",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1090509480",
      "line": "Quito Ecuador Temple, a mapped place for the game."
    },
    {
      "key": "osm-way-161111197",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/161111197",
      "line": "Universidad UTE, a mapped place for the game."
    },
    {
      "key": "osm-way-63058770",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/63058770",
      "line": "Vulqano Park, a mapped place for the game."
    },
    {
      "key": "osm-way-463806835",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/463806835",
      "line": "Universidad San Francisco de Quito, a mapped place for the game."
    },
    {
      "key": "osm-node-2137276238",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2137276238",
      "line": "Batalla de Pichincha, a mapped place for the game."
    },
    {
      "key": "osm-way-31281127",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/31281127",
      "line": "Casa de la Cultura Ecuatoriana, a mapped place for the game."
    },
    {
      "key": "osm-way-24680928",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/24680928",
      "line": "La Alameda, a mapped place for the game."
    },
    {
      "key": "osm-way-673325435",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/673325435",
      "line": "Iglesia de Santo Domingo, a mapped place for the game."
    },
    {
      "key": "osm-node-899994089",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/899994089",
      "line": "Las Palmas, a mapped place for the game."
    },
    {
      "key": "osm-node-6124047644",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6124047644",
      "line": "Cevichería y Delicia Manabita, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1003358903",
      "ref": "node/1003358903",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003358929",
      "ref": "node/1003358929",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003363285",
      "ref": "node/1003363285",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003363286",
      "ref": "node/1003363286",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003363287",
      "ref": "node/1003363287",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003363288",
      "ref": "node/1003363288",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003363289",
      "ref": "node/1003363289",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1003363290",
      "ref": "node/1003363290",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1060602671",
      "ref": "node/1060602671",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1066205149",
      "ref": "node/1066205149",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1066205170",
      "ref": "node/1066205170",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1066306774",
      "ref": "node/1066306774",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1066727788",
      "ref": "node/1066727788",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076446639",
      "ref": "node/1076446639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1112471547",
      "ref": "node/1112471547",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1112471551",
      "ref": "node/1112471551",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1112471552",
      "ref": "node/1112471552",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1112471564",
      "ref": "node/1112471564",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
