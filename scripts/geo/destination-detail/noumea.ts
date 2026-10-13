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
  "name": "Nouméa",
  "box": [
    -22.455407289933977,
    166.24801661034195,
    -22.093645510066022,
    166.63682138965805
  ],
  "core": [
    -22.319746622483493,
    166.39386577992963,
    -22.229306177516506,
    166.49097222007038
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/873236737",
      "line": "PAITA CENTRE, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/466938358",
      "line": "Le Bout du Monde, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/7262174119",
      "line": "Bibliothèque annexe de Plum, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/969939062",
      "line": "Centre Hospitalier Spécialisé Albert Bousquet, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/488647235",
      "line": "Esplanade du 22 Avril, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/414713908",
      "line": "Marché du Mt Dore, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/113775364",
      "line": "Église Sainte-Anne, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/415616293",
      "line": "Hôtel de Ville de Dumbéa; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/19257369",
      "line": "Tribunal de Nouméa, a mapped place for the game."
    },
    {
      "key": "osm-relation-1526580",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/1526580",
      "line": "IFPSS, a mapped place for the game."
    },
    {
      "key": "osm-way-430727319",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/430727319",
      "line": "Stade Numa-Daly, a mapped place for the game."
    },
    {
      "key": "osm-way-37890152",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/37890152",
      "line": "Parc Zoologique et Forestier Michel Corbasson, a mapped place for the game."
    },
    {
      "key": "osm-way-43894719",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/43894719",
      "line": "Église de la Conception, a mapped place for the game."
    },
    {
      "key": "osm-way-73813536",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/73813536",
      "line": "Église de Saint-Louis, a mapped place for the game."
    },
    {
      "key": "osm-relation-1296182",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/1296182",
      "line": "Musée de la Nouvelle-Calédonie, a mapped place for the game."
    },
    {
      "key": "osm-node-1426723288",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1426723288",
      "line": "Kaori Renversé, a mapped place for the game."
    },
    {
      "key": "osm-node-1110244565",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1110244565",
      "line": "Château d'Eau de Naia, a mapped place for the game."
    },
    {
      "key": "osm-way-716990917",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/716990917",
      "line": "Mozza Pizza, a mapped place for the game."
    },
    {
      "key": "osm-node-2512504065",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/2512504065",
      "line": "Cascade, a mapped place for the game."
    },
    {
      "key": "osm-way-413771556",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/413771556",
      "line": "Les 3 Bê, a mapped place for the game."
    },
    {
      "key": "osm-way-134363148",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/134363148",
      "line": "Casino Mont-Dore, a mapped place for the game."
    },
    {
      "key": "osm-way-542503416",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/542503416",
      "line": "Parc ex-Aquarêve, a mapped place for the game."
    },
    {
      "key": "osm-way-423514033",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/423514033",
      "line": "Parc de la Rivière Salée, a mapped place for the game."
    },
    {
      "key": "osm-way-65069903",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/65069903",
      "line": "Ducos Centre, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2603688539",
      "ref": "node/2603688539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-558057090",
      "ref": "node/558057090",
      "kind": "neighbourhood"
    },
    {
      "id": "district-558057122",
      "ref": "node/558057122",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1201440211",
      "ref": "node/1201440211",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1201440213",
      "ref": "node/1201440213",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1491203554",
      "ref": "node/1491203554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1491203555",
      "ref": "node/1491203555",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1491203556",
      "ref": "node/1491203556",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1900235200",
      "ref": "node/1900235200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1923145722",
      "ref": "node/1923145722",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933308313",
      "ref": "node/1933308313",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933308314",
      "ref": "node/1933308314",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933308316",
      "ref": "node/1933308316",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933308317",
      "ref": "node/1933308317",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933308318",
      "ref": "node/1933308318",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1933308319",
      "ref": "node/1933308319",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2052320629",
      "ref": "node/2052320629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2052351212",
      "ref": "node/2052351212",
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
