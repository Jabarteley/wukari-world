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
  "name": "Brussels",
  "box": [
    50.66585631006602,
    4.066836811706027,
    51.02761808993398,
    4.638149188293973
  ],
  "core": [
    50.801516977516506,
    4.281287157027194,
    50.89195742248349,
    4.423698842972806
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/17401552",
      "line": "Brussels-Midi, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/602765935",
      "line": "Chalet de la Forêt, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/302927116",
      "line": "G.C. De Oude Pastorie, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5426217922",
      "line": "Nationaal MS Centrum, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/29206013",
      "line": "Province domain Huizingen, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1365002898",
      "line": "Woluwe Shopping Center, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/35314454",
      "line": "Sint-Katharinakerk, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/365267814",
      "line": "Hôtel de Ville de Wavre; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/41223235",
      "line": "De Viron Castle, a mapped place for the game."
    },
    {
      "key": "osm-way-1360711774",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1360711774",
      "line": "AP Hogeschool - campus Dodoens, a mapped place for the game."
    },
    {
      "key": "osm-way-253875451",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/253875451",
      "line": "King Baudouin Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-267878387",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/267878387",
      "line": "Lion's Mound, a mapped place for the game."
    },
    {
      "key": "osm-node-1757391933",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1757391933",
      "line": "Grote Paal, a mapped place for the game."
    },
    {
      "key": "osm-relation-1990637",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/1990637",
      "line": "Kasteel van Moorsel, a mapped place for the game."
    },
    {
      "key": "osm-way-109862564",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/109862564",
      "line": "Sint-Gaugericuskerk, a mapped place for the game."
    },
    {
      "key": "osm-way-346514126",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/346514126",
      "line": "Boskapel, a mapped place for the game."
    },
    {
      "key": "osm-relation-16610859",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/16610859",
      "line": "Parc Trois Fontaines, a mapped place for the game."
    },
    {
      "key": "osm-way-1080889997",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1080889997",
      "line": "Park van het Kasteel Groenenberg, a mapped place for the game."
    },
    {
      "key": "osm-way-33149531",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/33149531",
      "line": "Centre hospitalier Paul Brien, a mapped place for the game."
    },
    {
      "key": "osm-relation-13298038",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/13298038",
      "line": "CERIA, a mapped place for the game."
    },
    {
      "key": "osm-node-4388790239",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4388790239",
      "line": "Le Pigeon Noir, a mapped place for the game."
    },
    {
      "key": "osm-relation-13366042",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/13366042",
      "line": "Vrije Universiteit Brussel – Campus Etterbeek, a mapped place for the game."
    },
    {
      "key": "osm-way-810195284",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/810195284",
      "line": "Institut Jules Bordet, a mapped place for the game."
    },
    {
      "key": "osm-way-23872736",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23872736",
      "line": "Edmond Machtens Stadium, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10112354861",
      "ref": "node/10112354861",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10177905465",
      "ref": "node/10177905465",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10178181065",
      "ref": "node/10178181065",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10178247780",
      "ref": "node/10178247780",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10185491219",
      "ref": "node/10185491219",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10302585676",
      "ref": "node/10302585676",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10303526380",
      "ref": "node/10303526380",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10312793402",
      "ref": "node/10312793402",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10567639512",
      "ref": "node/10567639512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10799695675",
      "ref": "node/10799695675",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12031720001",
      "ref": "node/12031720001",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12076730710",
      "ref": "node/12076730710",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12218203148",
      "ref": "node/12218203148",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12235826214",
      "ref": "node/12235826214",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12304092693",
      "ref": "node/12304092693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12318571814",
      "ref": "node/12318571814",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12324643085",
      "ref": "node/12324643085",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12385174550",
      "ref": "node/12385174550",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
