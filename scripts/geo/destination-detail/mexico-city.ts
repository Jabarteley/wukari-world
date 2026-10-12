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
  "name": "Mexico City",
  "box": [
    19.25174871006602,
    -99.32390712929879,
    19.613510489933976,
    -98.94244987070121
  ],
  "core": [
    19.387409377516505,
    -99.1808205934508,
    19.477849822483492,
    -99.0855364065492
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/30384902",
      "line": "General Anaya, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "node/3536369648",
      "line": "Sanborns Café, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "way/371751495",
      "line": "Universidad Anáhuac del Sur, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "way/217109092",
      "line": "Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "relation/20008211",
      "line": "Bosque de San Juan de Aragón, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/1140049541",
      "line": "Toreo Parque Central, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/336891067",
      "line": "Capilla de San Juan Bautista, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "way/432636761",
      "line": "Torres de Satélite; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "node/5583089123",
      "line": "Secretaria de Hacienda, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-way-970515008",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/970515008",
      "line": "Universidad Autónoma Metropolitana Unidad Iztapalapa, a mapped place for the game."
    },
    {
      "key": "osm-way-168081622",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/168081622",
      "line": "Estadio Wilfrido Massieu, a mapped place for the game."
    },
    {
      "key": "osm-way-25103113",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/25103113",
      "line": "Six Flags Mexico, a mapped place for the game."
    },
    {
      "key": "osm-way-1411608827",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1411608827",
      "line": "Proyecto Ecológico Lago de Texcoco (PELT), a mapped place for the game."
    },
    {
      "key": "osm-way-1173762984",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1173762984",
      "line": "Velódromo Olímpico Agustín Melgar, a mapped place for the game."
    },
    {
      "key": "osm-way-175507039",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/175507039",
      "line": "Universidad Autónoma de la Ciudad de México, a mapped place for the game."
    },
    {
      "key": "osm-way-28932424",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/28932424",
      "line": "Museo de arte Carrillo Gil, a mapped place for the game."
    },
    {
      "key": "osm-way-146024228",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/146024228",
      "line": "Zona Arqueológica de Tlatelolco, a mapped place for the game."
    },
    {
      "key": "osm-way-526045165",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/526045165",
      "line": "Alameda del Sur, a mapped place for the game."
    },
    {
      "key": "osm-way-30291947",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/30291947",
      "line": "Centro Santa Fe, a mapped place for the game."
    },
    {
      "key": "osm-way-290432518",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/290432518",
      "line": "Tecmilenio, a mapped place for the game."
    },
    {
      "key": "osm-way-25337335",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/25337335",
      "line": "Estadio Ciudad de los Deportes, a mapped place for the game."
    },
    {
      "key": "osm-way-199148896",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/199148896",
      "line": "Instituto Nacional de Perinatología, a mapped place for the game."
    },
    {
      "key": "osm-node-739036171",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/739036171",
      "line": "Instituto Nacional de Pediatria, a mapped place for the game."
    },
    {
      "key": "osm-way-120733641",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/120733641",
      "line": "Basilica of Our Lady of Guadalupe, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10759183923",
      "ref": "node/10759183923",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10901058440",
      "ref": "node/10901058440",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253326764",
      "ref": "node/11253326764",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253417435",
      "ref": "node/11253417435",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253445593",
      "ref": "node/11253445593",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253445595",
      "ref": "node/11253445595",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253480423",
      "ref": "node/11253480423",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253500131",
      "ref": "node/11253500131",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253501514",
      "ref": "node/11253501514",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253543784",
      "ref": "node/11253543784",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253580202",
      "ref": "node/11253580202",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253623218",
      "ref": "node/11253623218",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11253630085",
      "ref": "node/11253630085",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11254047026",
      "ref": "node/11254047026",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11254050492",
      "ref": "node/11254050492",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11254054664",
      "ref": "node/11254054664",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11254055520",
      "ref": "node/11254055520",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11254056463",
      "ref": "node/11254056463",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11996327",
      "ref": "relation/11996327",
      "kind": "water"
    },
    {
      "id": "water-relation-14484155",
      "ref": "relation/14484155",
      "kind": "water"
    },
    {
      "id": "water-relation-20239423",
      "ref": "relation/20239423",
      "kind": "water"
    },
    {
      "id": "water-relation-545872",
      "ref": "relation/545872",
      "kind": "water"
    },
    {
      "id": "water-way-1168051943",
      "ref": "way/1168051943",
      "kind": "water"
    },
    {
      "id": "water-way-24942778",
      "ref": "way/24942778",
      "kind": "water"
    },
    {
      "id": "water-way-4780696",
      "ref": "way/4780696",
      "kind": "water"
    },
    {
      "id": "water-way-52503893",
      "ref": "way/52503893",
      "kind": "water"
    },
    {
      "id": "water-way-60844806",
      "ref": "way/60844806",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
