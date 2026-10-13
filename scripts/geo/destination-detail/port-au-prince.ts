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
  "name": "Port-au-Prince",
  "box": [
    18.366446110066022,
    -72.5292995685392,
    18.728207889933977,
    -72.14988603146081
  ],
  "core": [
    18.502106777516506,
    -72.38698158459303,
    18.592547222483493,
    -72.29220401540698
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/375734791",
      "line": "Portail Léogâne, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1103239497",
      "line": "Hôtel Montana, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/5236861122",
      "line": "Université de Port-au-Prince, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/629092104",
      "line": "Hopital la Trinite, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/8929056",
      "line": "Champs de Mars, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/643630634",
      "line": "Marché en Fer, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1328919400",
      "line": "Temple of Port-au-Prince, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/2481734890",
      "line": "Annexe de la Mairie de Thomazeau; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/3953648814",
      "line": "Annexe Mairie Croix des Bouquets, a mapped place for the game."
    },
    {
      "key": "osm-way-310210009",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/310210009",
      "line": "Université Quisqueya, a mapped place for the game."
    },
    {
      "key": "osm-node-4842345826",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4842345826",
      "line": "Mc-Intosh, a mapped place for the game."
    },
    {
      "key": "osm-way-48277658",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48277658",
      "line": "Musée National d'Art d'Haïti, a mapped place for the game."
    },
    {
      "key": "osm-way-27937322",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/27937322",
      "line": "Port-au-Prince Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-48215560",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48215560",
      "line": "Haiti National Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-48279480",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48279480",
      "line": "Holy Trinity Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-2753138714",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2753138714",
      "line": "Le Marron Inconnu, a mapped place for the game."
    },
    {
      "key": "osm-relation-13545105",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/13545105",
      "line": "Hôpital Saint-Damien, a mapped place for the game."
    },
    {
      "key": "osm-node-883450377",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/883450377",
      "line": "Université de technologie d'Haïti, a mapped place for the game."
    },
    {
      "key": "osm-way-380648401",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/380648401",
      "line": "Hôpital de l'Université d'État d'Haïti, a mapped place for the game."
    },
    {
      "key": "osm-node-1584933011",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1584933011",
      "line": "Rustik, a mapped place for the game."
    },
    {
      "key": "osm-node-1929227554",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1929227554",
      "line": "Ajoupas Beach Club, a mapped place for the game."
    },
    {
      "key": "osm-node-4217575341",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4217575341",
      "line": "Petit Marché de Canaan, a mapped place for the game."
    },
    {
      "key": "osm-node-1323785127",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/1323785127",
      "line": "Marche de Fermathe, a mapped place for the game."
    },
    {
      "key": "osm-node-6356671168",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6356671168",
      "line": "Centre d’Enseignement des Techniques Appliquées, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2402972617",
      "ref": "node/2402972617",
      "kind": "neighbourhood"
    },
    {
      "id": "district-616730335",
      "ref": "node/616730335",
      "kind": "neighbourhood"
    },
    {
      "id": "district-616733015",
      "ref": "node/616733015",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1402396224",
      "ref": "node/1402396224",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1612250993",
      "ref": "node/1612250993",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1724408140",
      "ref": "node/1724408140",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1806604225",
      "ref": "node/1806604225",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1806695075",
      "ref": "node/1806695075",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1818306368",
      "ref": "node/1818306368",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1885902036",
      "ref": "node/1885902036",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1986262513",
      "ref": "node/1986262513",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1987021796",
      "ref": "node/1987021796",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2421354667",
      "ref": "node/2421354667",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2562040647",
      "ref": "node/2562040647",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2588088901",
      "ref": "node/2588088901",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2622048137",
      "ref": "node/2622048137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2739829597",
      "ref": "node/2739829597",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2790426832",
      "ref": "node/2790426832",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-49229763",
      "ref": "way/49229763",
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
