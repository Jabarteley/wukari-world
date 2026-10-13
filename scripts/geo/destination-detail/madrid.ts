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
  "name": "Madrid",
  "box": [
    40.23590111006602,
    -3.940123282444742,
    40.59766288993398,
    -3.466890717555258
  ],
  "core": [
    40.371561777516504,
    -3.762541442416989,
    40.46200222248349,
    -3.6444725575830113
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/79715911",
      "line": "Fuencarral, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2830482300",
      "line": "Vips, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/2962284",
      "line": "Universidad Rey Juan Carlos, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/28070410",
      "line": "Hospital Universitario de Getafe, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/17542778",
      "line": "Dehesa de Navalcarbón, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/1137809",
      "line": "Centro Comercial Parque Corredor, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/28150310",
      "line": "Iglesia de Santa María de Caná, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/29993310",
      "line": "Junta Municipal de Distrito de Moncloa-Aravaca.; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/23290568",
      "line": "Junta Municipal de Distrito de Barajas., a mapped place for the game."
    },
    {
      "key": "osm-way-28744628",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/28744628",
      "line": "Universidad Rey Juan Carlos (Campus de Vicálvaro), a mapped place for the game."
    },
    {
      "key": "osm-way-198982440",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/198982440",
      "line": "Estadio Fernando Torres, a mapped place for the game."
    },
    {
      "key": "osm-way-35817901",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/35817901",
      "line": "Puente ferroviario la Poveda, a mapped place for the game."
    },
    {
      "key": "osm-way-596798361",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/596798361",
      "line": "Iglesia de San Cipriano, a mapped place for the game."
    },
    {
      "key": "osm-relation-18324181",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/18324181",
      "line": "Palacio Real de El Pardo, a mapped place for the game."
    },
    {
      "key": "osm-way-394889267",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/394889267",
      "line": "Hospital Universitario Infanta Sofía, a mapped place for the game."
    },
    {
      "key": "osm-way-48582857",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48582857",
      "line": "Palacio del Canto del Pico, a mapped place for the game."
    },
    {
      "key": "osm-way-394889270",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/394889270",
      "line": "Hospital del Henares, a mapped place for the game."
    },
    {
      "key": "osm-way-32030445",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/32030445",
      "line": "Parque de Las Presillas, a mapped place for the game."
    },
    {
      "key": "osm-way-28742252",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28742252",
      "line": "Parque Dehesa Boyal, a mapped place for the game."
    },
    {
      "key": "osm-way-7990496",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/7990496",
      "line": "Centro Comercial Palacio de Hielo, a mapped place for the game."
    },
    {
      "key": "osm-way-409110880",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/409110880",
      "line": "Estadio Cerro del Espino, a mapped place for the game."
    },
    {
      "key": "osm-way-70656562",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/70656562",
      "line": "Universidad Europea de Madrid, a mapped place for the game."
    },
    {
      "key": "osm-way-444827472",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/444827472",
      "line": "Ermita de Santa María la Antigua, a mapped place for the game."
    },
    {
      "key": "osm-way-368926226",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/368926226",
      "line": "Escuela Técnica Superior de Ingenieros Informáticos UPM, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10095126013",
      "ref": "node/10095126013",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11028153179",
      "ref": "node/11028153179",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11662782236",
      "ref": "node/11662782236",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11739514732",
      "ref": "node/11739514732",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1482404836",
      "ref": "node/1482404836",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1482405193",
      "ref": "node/1482405193",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1862923374",
      "ref": "node/1862923374",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1862926475",
      "ref": "node/1862926475",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1862937674",
      "ref": "node/1862937674",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1876962739",
      "ref": "node/1876962739",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349490",
      "ref": "node/2179349490",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349491",
      "ref": "node/2179349491",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349492",
      "ref": "node/2179349492",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349493",
      "ref": "node/2179349493",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349494",
      "ref": "node/2179349494",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349495",
      "ref": "node/2179349495",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349496",
      "ref": "node/2179349496",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2179349497",
      "ref": "node/2179349497",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-3631198",
      "ref": "relation/3631198",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
