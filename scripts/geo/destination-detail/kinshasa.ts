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
  "name": "Kinshasa",
  "box": [
    -4.55,
    15.15,
    -4.2,
    15.6
  ],
  "core": [
    -4.42,
    15.2,
    -4.28,
    15.38
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/26917327",
      "line": "Kinshasa Est, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/747821479",
      "line": "petit restaurant et plage, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/783572547",
      "line": "Université de Kinshasa, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/792136806",
      "line": "Centre hospitalier Nganda, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/5912709549",
      "line": "Parc Naturel de la Nsele (Mangiers), a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4792117214",
      "line": "Marche Wenzeyambila, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/700825930",
      "line": "Mosquée Diya Kingambua, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/65251763",
      "line": "Bureau de Quartier Kinkole Pêcheur; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/300933916",
      "line": "Institut Congolais pour la Conservation de la Nature, a mapped place for the game."
    },
    {
      "key": "osm-way-331313850",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/331313850",
      "line": "Université catholique du Congo, a mapped place for the game."
    },
    {
      "key": "osm-way-4402561",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/4402561",
      "line": "Stade des Martyrs de la Pentecôte, a mapped place for the game."
    },
    {
      "key": "osm-node-12684273365",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12684273365",
      "line": "Simon Kimbangu, a mapped place for the game."
    },
    {
      "key": "osm-node-2298412028",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2298412028",
      "line": "Patrice Lumumba, a mapped place for the game."
    },
    {
      "key": "osm-way-109431897",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/109431897",
      "line": "Académie des Beaux-Arts, a mapped place for the game."
    },
    {
      "key": "osm-way-362188754",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/362188754",
      "line": "Mémorial aux anciens combattants de la Force Publique, a mapped place for the game."
    },
    {
      "key": "osm-way-700648669",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/700648669",
      "line": "Hôpital Provincial Général de Référence de Kinshasa, a mapped place for the game."
    },
    {
      "key": "osm-way-23465935",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/23465935",
      "line": "Université protestante du Congo, a mapped place for the game."
    },
    {
      "key": "osm-way-102422512",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/102422512",
      "line": "Hôpital du Cinquantenaire, a mapped place for the game."
    },
    {
      "key": "osm-way-129297066",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/129297066",
      "line": "Stade Cardinal Malula, a mapped place for the game."
    },
    {
      "key": "osm-way-1536197976",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/1536197976",
      "line": "Espace MATELO, a mapped place for the game."
    },
    {
      "key": "osm-node-7802162236",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7802162236",
      "line": "Marché de Buma, a mapped place for the game."
    },
    {
      "key": "osm-node-6743676049",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/6743676049",
      "line": "Marché de Mitendi, a mapped place for the game."
    },
    {
      "key": "osm-node-6575061831",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6575061831",
      "line": "Eglisse Makaro, a mapped place for the game."
    },
    {
      "key": "osm-node-5331304126",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5331304126",
      "line": "Villa Bahari, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1424425039",
      "ref": "node/1424425039",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2440574752",
      "ref": "node/2440574752",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2468737677",
      "ref": "node/2468737677",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2468745629",
      "ref": "node/2468745629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2468796900",
      "ref": "node/2468796900",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2468800113",
      "ref": "node/2468800113",
      "kind": "neighbourhood"
    },
    {
      "id": "district-252928663",
      "ref": "node/252928663",
      "kind": "neighbourhood"
    },
    {
      "id": "district-252928742",
      "ref": "node/252928742",
      "kind": "neighbourhood"
    },
    {
      "id": "district-252928783",
      "ref": "node/252928783",
      "kind": "neighbourhood"
    },
    {
      "id": "district-252928806",
      "ref": "node/252928806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-27043347",
      "ref": "node/27043347",
      "kind": "neighbourhood"
    },
    {
      "id": "district-27043358",
      "ref": "node/27043358",
      "kind": "neighbourhood"
    },
    {
      "id": "district-27043362",
      "ref": "node/27043362",
      "kind": "neighbourhood"
    },
    {
      "id": "district-27043390",
      "ref": "node/27043390",
      "kind": "neighbourhood"
    },
    {
      "id": "district-29806128",
      "ref": "node/29806128",
      "kind": "neighbourhood"
    },
    {
      "id": "district-29927348",
      "ref": "node/29927348",
      "kind": "neighbourhood"
    },
    {
      "id": "district-29927349",
      "ref": "node/29927349",
      "kind": "neighbourhood"
    },
    {
      "id": "district-29927350",
      "ref": "node/29927350",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-8561",
      "ref": "relation/8561",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
