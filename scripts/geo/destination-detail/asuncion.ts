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
  "name": "Asuncion",
  "box": [
    -25.46092678993398,
    -57.83336963854545,
    -25.099165010066024,
    -57.435393161454556
  ],
  "core": [
    -25.325266122483495,
    -57.684072578847854,
    -25.234825677516508,
    -57.58469022115215
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3048300696",
      "line": "Línea 52, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/324817878",
      "line": "EuroGourmet, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/130888813",
      "line": "Universidad Católica \"Nuestra Señora de la Asunción\", a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/277760510",
      "line": "Hospital de Clinicas, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/1969320558",
      "line": "Parque Ñu Guasú, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/31143117",
      "line": "Shopping Mariscal López A, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/166748772",
      "line": "Santuario Virgen del Rosario, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/166917816",
      "line": "Municipalidad de San Antonio; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/384456846",
      "line": "Embassy of Chile, a mapped place for the game."
    },
    {
      "key": "osm-way-48488012",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/48488012",
      "line": "VILLA UNIVERSITARIA, a mapped place for the game."
    },
    {
      "key": "osm-way-274541627",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/274541627",
      "line": "Estadio Roberto Béttega, a mapped place for the game."
    },
    {
      "key": "osm-way-276233284",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/276233284",
      "line": "Museo Nacional de Bellas Artes, a mapped place for the game."
    },
    {
      "key": "osm-way-316831439",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/316831439",
      "line": "Instituto Nacional de Educación Superior Doctor Raúl Peña, a mapped place for the game."
    },
    {
      "key": "osm-way-28439068",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/28439068",
      "line": "Estadio Arsenio Erico, a mapped place for the game."
    },
    {
      "key": "osm-way-272754498",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/272754498",
      "line": "Estadio River Plate, a mapped place for the game."
    },
    {
      "key": "osm-way-273246495",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/273246495",
      "line": "Asunción Paraguay Temple, a mapped place for the game."
    },
    {
      "key": "osm-node-4379937704",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4379937704",
      "line": "Casa de la Independencia y Callejon Historico - Solar Martinez Saez, a mapped place for the game."
    },
    {
      "key": "osm-way-276186496",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/276186496",
      "line": "Hospital de Trauma Prof. Dr. Manuel Giagni, a mapped place for the game."
    },
    {
      "key": "osm-way-29045875",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/29045875",
      "line": "Jardín Botánico y Zoológico de Asunción, a mapped place for the game."
    },
    {
      "key": "osm-way-274352578",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/274352578",
      "line": "Universidad Autónoma de Asunción (UAA), a mapped place for the game."
    },
    {
      "key": "osm-way-164810076",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/164810076",
      "line": "Our Lady of Asunción Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-266156282",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/266156282",
      "line": "Mall Excelsior, a mapped place for the game."
    },
    {
      "key": "osm-node-5793564354",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5793564354",
      "line": "Hospital indígena, a mapped place for the game."
    },
    {
      "key": "osm-way-752981298",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/752981298",
      "line": "ecologica, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1764370855",
      "ref": "node/1764370855",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764371076",
      "ref": "node/1764371076",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764371425",
      "ref": "node/1764371425",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764371776",
      "ref": "node/1764371776",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764372892",
      "ref": "node/1764372892",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764373020",
      "ref": "node/1764373020",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764373202",
      "ref": "node/1764373202",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764373203",
      "ref": "node/1764373203",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764373291",
      "ref": "node/1764373291",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764379585",
      "ref": "node/1764379585",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764379586",
      "ref": "node/1764379586",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764380233",
      "ref": "node/1764380233",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764382241",
      "ref": "node/1764382241",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764384085",
      "ref": "node/1764384085",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764384552",
      "ref": "node/1764384552",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764384944",
      "ref": "node/1764384944",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764384945",
      "ref": "node/1764384945",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1764394188",
      "ref": "node/1764394188",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-164843533",
      "ref": "way/164843533",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
