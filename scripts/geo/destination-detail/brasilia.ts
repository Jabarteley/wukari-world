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
  "name": "Brasília",
  "box": [
    -15.97486778993398,
    -48.06967903443277,
    -15.613106010066021,
    -47.69592096556724
  ],
  "core": [
    -15.839207122483495,
    -47.92948824372703,
    -15.748766677516505,
    -47.83611175627298
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/303847107",
      "line": "Brasília, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1340424680",
      "line": "Casa de Chá, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/332888307",
      "line": "Universidade de Brasília - Campus Universitário Darcy Ribeiro - Gleba A, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1143723421",
      "line": "Hospital SARAH, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/125232972",
      "line": "Parque Ecológico Águas Claras, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/216491572",
      "line": "ParkShopping, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1197729365",
      "line": "Sara Nossa Terra, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/849010921",
      "line": "Praça dos Orixás; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/550355836",
      "line": "Residência Oficial da Granja do Torto, a mapped place for the game."
    },
    {
      "key": "osm-way-739637976",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/739637976",
      "line": "Instituto de Ciências Biológicas, a mapped place for the game."
    },
    {
      "key": "osm-way-242250854",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/242250854",
      "line": "Estádio Augustinho Pires de Lima, a mapped place for the game."
    },
    {
      "key": "osm-node-2673931012",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2673931012",
      "line": "Museu do Catetinho, a mapped place for the game."
    },
    {
      "key": "osm-way-424628555",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/424628555",
      "line": "Torre de TV Digital, a mapped place for the game."
    },
    {
      "key": "osm-node-5496838926",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5496838926",
      "line": "Igreja Batista de Atos - BTA, a mapped place for the game."
    },
    {
      "key": "osm-way-18140049",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/18140049",
      "line": "Palácio da Alvorada, a mapped place for the game."
    },
    {
      "key": "osm-way-382528304",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/382528304",
      "line": "Estádio JK Paranoá, a mapped place for the game."
    },
    {
      "key": "osm-way-202664538",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/202664538",
      "line": "Praça do DI, a mapped place for the game."
    },
    {
      "key": "osm-way-84830646",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/84830646",
      "line": "JK Memorial, a mapped place for the game."
    },
    {
      "key": "osm-way-43339378",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/43339378",
      "line": "Igrejinha Nossa Senhora de Fátima, a mapped place for the game."
    },
    {
      "key": "osm-way-41573825",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/41573825",
      "line": "Parque Olhos d'Água, a mapped place for the game."
    },
    {
      "key": "osm-way-141913048",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/141913048",
      "line": "Conjunto Nacional, a mapped place for the game."
    },
    {
      "key": "osm-way-141496566",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/141496566",
      "line": "Centro de Ensino Tecnológico de Brasília, a mapped place for the game."
    },
    {
      "key": "osm-way-41573440",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/41573440",
      "line": "Hospital Universitário de Brasília, a mapped place for the game."
    },
    {
      "key": "osm-way-480025603",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/480025603",
      "line": "Instituto Rio Branco, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10090459526",
      "ref": "node/10090459526",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10313295335",
      "ref": "node/10313295335",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11367637631",
      "ref": "node/11367637631",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1168460736",
      "ref": "node/1168460736",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1168460742",
      "ref": "node/1168460742",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11907572421",
      "ref": "node/11907572421",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11907584750",
      "ref": "node/11907584750",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11907594524",
      "ref": "node/11907594524",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11907601889",
      "ref": "node/11907601889",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032725",
      "ref": "node/12686032725",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032726",
      "ref": "node/12686032726",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032727",
      "ref": "node/12686032727",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032728",
      "ref": "node/12686032728",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032729",
      "ref": "node/12686032729",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032730",
      "ref": "node/12686032730",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032731",
      "ref": "node/12686032731",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032732",
      "ref": "node/12686032732",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12686032733",
      "ref": "node/12686032733",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2758139",
      "ref": "relation/2758139",
      "kind": "water"
    },
    {
      "id": "water-way-160947821",
      "ref": "way/160947821",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
