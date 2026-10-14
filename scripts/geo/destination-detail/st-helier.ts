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
  "name": "St Helier",
  "box": [
    49.07713516603961,
    -2.2755166177377726,
    49.29419223396039,
    -1.9449387822622268
  ],
  "core": [
    49.140443477516506,
    -2.179009784392083,
    49.23088392248349,
    -2.0414456156079166
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/12625753",
      "line": "Elizabeth Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6960822569",
      "line": "Bohemia, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/185953209",
      "line": "Jersey Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/168422036",
      "line": "General Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/169454630",
      "line": "Les Pres d'Auvergne, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/179249117",
      "line": "Waterfront Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/168967980",
      "line": "Church of Our Lady of the Annunciation, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/210509614",
      "line": "Royal Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/906637546",
      "line": "St John Parish Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-182786869",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/182786869",
      "line": "School of Art, a mapped place for the game."
    },
    {
      "key": "osm-way-182196435",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/182196435",
      "line": "Springfield Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-166663089",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/166663089",
      "line": "Portelet Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-179763514",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/179763514",
      "line": "St. Clement's Church, a mapped place for the game."
    },
    {
      "key": "osm-node-1784634611",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1784634611",
      "line": "Little Menhir, a mapped place for the game."
    },
    {
      "key": "osm-way-166410471",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/166410471",
      "line": "Mount Pride Castle, a mapped place for the game."
    },
    {
      "key": "osm-way-1182987296",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1182987296",
      "line": "Sacred Heart Church, a mapped place for the game."
    },
    {
      "key": "osm-node-1793026515",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1793026515",
      "line": "Cafe Delicia, a mapped place for the game."
    },
    {
      "key": "osm-way-496496072",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/496496072",
      "line": "Le Parc de la Petite Falaise, a mapped place for the game."
    },
    {
      "key": "osm-way-903201743",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/903201743",
      "line": "Moignard Liberation Garden, a mapped place for the game."
    },
    {
      "key": "osm-node-1795426195",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1795426195",
      "line": "Old Napoleonic gun platform, a mapped place for the game."
    },
    {
      "key": "osm-way-177305474",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/177305474",
      "line": "Corbiere Phare, a mapped place for the game."
    },
    {
      "key": "osm-node-1783469367",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1783469367",
      "line": "Sorel Point, a mapped place for the game."
    },
    {
      "key": "osm-way-193301844",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/193301844",
      "line": "Clinique Pinel, a mapped place for the game."
    },
    {
      "key": "osm-way-182787368",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/182787368",
      "line": "Laundry, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10174243681",
      "ref": "node/10174243681",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1787256050",
      "ref": "node/1787256050",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889356",
      "ref": "node/7677889356",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889359",
      "ref": "node/7677889359",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889360",
      "ref": "node/7677889360",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889361",
      "ref": "node/7677889361",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889365",
      "ref": "node/7677889365",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889367",
      "ref": "node/7677889367",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7677889369",
      "ref": "node/7677889369",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445788683",
      "ref": "node/8445788683",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445788684",
      "ref": "node/8445788684",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445788685",
      "ref": "node/8445788685",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8445788686",
      "ref": "node/8445788686",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8476425591",
      "ref": "node/8476425591",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8625987541",
      "ref": "node/8625987541",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8638969222",
      "ref": "node/8638969222",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8677598365",
      "ref": "node/8677598365",
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
