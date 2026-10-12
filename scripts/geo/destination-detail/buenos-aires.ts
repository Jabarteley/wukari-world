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
  "name": "Buenos Aires",
  "box": [
    -34.8312440444967,
    -58.6075586829576,
    -34.42867701006602,
    -58.17002211704239
  ],
  "core": [
    -34.65477812248349,
    -58.44339280150393,
    -34.564337677516505,
    -58.33418799849606
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/256241985",
      "line": "Avenida La Plata, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2359629110",
      "line": "Cafe de Garcia, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/1942196695",
      "line": "Biblioteca Popular Antonio Mentruyt, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/129852442",
      "line": "Hospital Posadas, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/711562796",
      "line": "Parque General José de San Martín, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/122963275",
      "line": "Unicenter Shopping, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1302631309",
      "line": "Comunidad Amijai, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/23633883",
      "line": "Buenos Aires City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/396339546",
      "line": "Dirección Nacional de Vialidad - Distrito 1º Buenos Aires, a mapped place for the game."
    },
    {
      "key": "osm-relation-7447545",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/7447545",
      "line": "University of San Andrés, a mapped place for the game."
    },
    {
      "key": "osm-way-53012324",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/53012324",
      "line": "Estadio Norberto “Tito” Tomaghello, a mapped place for the game."
    },
    {
      "key": "osm-way-1312245862",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1312245862",
      "line": "Avión de los Vuelos de la Muerte, a mapped place for the game."
    },
    {
      "key": "osm-way-173109152",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/173109152",
      "line": "Estadio Ciudad de Laferrere, a mapped place for the game."
    },
    {
      "key": "osm-way-161797198",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/161797198",
      "line": "Estadio Julio Humberto Grondona, a mapped place for the game."
    },
    {
      "key": "osm-relation-14618378",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/14618378",
      "line": "National University of Lomas de Zamora, a mapped place for the game."
    },
    {
      "key": "osm-way-159783339",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/159783339",
      "line": "Torre Espacial, a mapped place for the game."
    },
    {
      "key": "osm-relation-3087274",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/3087274",
      "line": "Universidad Nacional Arturo Jauretche, a mapped place for the game."
    },
    {
      "key": "osm-relation-6788507",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/6788507",
      "line": "Parque Bosque Alegre, a mapped place for the game."
    },
    {
      "key": "osm-way-294261998",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/294261998",
      "line": "Parque Presidente Sarmiento, a mapped place for the game."
    },
    {
      "key": "osm-way-297407589",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/297407589",
      "line": "Hospital General de Agudos Doctor Teodoro Alvarez, a mapped place for the game."
    },
    {
      "key": "osm-way-205037220",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/205037220",
      "line": "Hospital General de Agudos Doctor Enrique Tornú, a mapped place for the game."
    },
    {
      "key": "osm-way-1387673826",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1387673826",
      "line": "Iglesia de Dios, a mapped place for the game."
    },
    {
      "key": "osm-way-517109240",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/517109240",
      "line": "Museo Histórico Municipal Brig. Gral. Juan M. Pueyrredón, a mapped place for the game."
    },
    {
      "key": "osm-node-455754665",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/455754665",
      "line": "San Francisco Javier, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10563587863",
      "ref": "node/10563587863",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11477692403",
      "ref": "node/11477692403",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11781964072",
      "ref": "node/11781964072",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13099031877",
      "ref": "node/13099031877",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13099031882",
      "ref": "node/13099031882",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13099116751",
      "ref": "node/13099116751",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1310853712",
      "ref": "node/1310853712",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13256760199",
      "ref": "node/13256760199",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13256771902",
      "ref": "node/13256771902",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13363621267",
      "ref": "node/13363621267",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13363621268",
      "ref": "node/13363621268",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1556421028",
      "ref": "node/1556421028",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1556421658",
      "ref": "node/1556421658",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1570879816",
      "ref": "node/1570879816",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1612004409",
      "ref": "node/1612004409",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1618113952",
      "ref": "node/1618113952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1620577930",
      "ref": "node/1620577930",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1626383510",
      "ref": "node/1626383510",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2364201",
      "ref": "relation/2364201",
      "kind": "water"
    },
    {
      "id": "water-relation-2364206",
      "ref": "relation/2364206",
      "kind": "water"
    },
    {
      "id": "water-relation-2621702",
      "ref": "relation/2621702",
      "kind": "water"
    },
    {
      "id": "water-relation-3961476",
      "ref": "relation/3961476",
      "kind": "water"
    },
    {
      "id": "water-relation-8472129",
      "ref": "relation/8472129",
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
