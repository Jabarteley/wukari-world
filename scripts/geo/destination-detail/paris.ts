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
  "name": "Paris",
  "box": [
    48.68165825456273,
    2.0881009083398387,
    49.02533194543728,
    2.608682091660161
  ],
  "core": [
    48.80827487751651,
    2.280067655089659,
    48.8987153224835,
    2.416715344910341
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/12388534",
      "line": "Malakoff - Rue Étienne Dolet, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/132248181",
      "line": "Maison du Val, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/267355578",
      "line": "Institut supérieur de mécanique de Paris, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/1773821",
      "line": "Hôpital Henri Mondor, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/6697690",
      "line": "Parc de Versailles, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/3294447",
      "line": "Aéroville, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/43014678",
      "line": "Église Saint-Flaive, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/19802284",
      "line": "Mairie de Noisy-le-Grand; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/4187796",
      "line": "Préfecture des Hauts-de-Seine, a mapped place for the game."
    },
    {
      "key": "osm-node-6698144969",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6698144969",
      "line": "Télécom Paris, a mapped place for the game."
    },
    {
      "key": "osm-way-252506849",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/252506849",
      "line": "Accor Arena, a mapped place for the game."
    },
    {
      "key": "osm-node-1906996216",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1906996216",
      "line": "Menhirs de la propiété Talma, dits la femme et la fille de Loth, a mapped place for the game."
    },
    {
      "key": "osm-node-2295902532",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2295902532",
      "line": "Pyramide de Juvisy, a mapped place for the game."
    },
    {
      "key": "osm-way-111365747",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/111365747",
      "line": "Parc de Ladoucette, a mapped place for the game."
    },
    {
      "key": "osm-way-346302141",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/346302141",
      "line": "Église Saint-Didier, a mapped place for the game."
    },
    {
      "key": "osm-way-976068267",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/976068267",
      "line": "Fort de Vaujours, a mapped place for the game."
    },
    {
      "key": "osm-way-85301687",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/85301687",
      "line": "Église Saint-Martin, a mapped place for the game."
    },
    {
      "key": "osm-way-678745793",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/678745793",
      "line": "Westfield Vélizy 2, a mapped place for the game."
    },
    {
      "key": "osm-way-365579410",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/365579410",
      "line": "Parc Montreau, a mapped place for the game."
    },
    {
      "key": "osm-way-130808774",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/130808774",
      "line": "Rungis International Market, a mapped place for the game."
    },
    {
      "key": "osm-relation-1223157",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/1223157",
      "line": "Institut hospitalier franco-britannique - Site Kléber, a mapped place for the game."
    },
    {
      "key": "osm-way-46173452",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/46173452",
      "line": "Hôpital Émile Roux, a mapped place for the game."
    },
    {
      "key": "osm-way-39316077",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/39316077",
      "line": "Stade Roland-Garros, a mapped place for the game."
    },
    {
      "key": "osm-way-1415157895",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1415157895",
      "line": "École Nationale Supérieure d'Architecture de Paris La Villette, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10589858518",
      "ref": "node/10589858518",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10945819246",
      "ref": "node/10945819246",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11314820438",
      "ref": "node/11314820438",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11314820440",
      "ref": "node/11314820440",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12997652037",
      "ref": "node/12997652037",
      "kind": "neighbourhood"
    },
    {
      "id": "district-148950780",
      "ref": "node/148950780",
      "kind": "neighbourhood"
    },
    {
      "id": "district-161608370",
      "ref": "node/161608370",
      "kind": "neighbourhood"
    },
    {
      "id": "district-175517170",
      "ref": "node/175517170",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1863573689",
      "ref": "node/1863573689",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1863664714",
      "ref": "node/1863664714",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1863664715",
      "ref": "node/1863664715",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1863666222",
      "ref": "node/1863666222",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1980084566",
      "ref": "node/1980084566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2038017580",
      "ref": "node/2038017580",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071360466",
      "ref": "node/2071360466",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2071360472",
      "ref": "node/2071360472",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2137503425",
      "ref": "node/2137503425",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2140578004",
      "ref": "node/2140578004",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1020942",
      "ref": "relation/1020942",
      "kind": "water"
    },
    {
      "id": "water-relation-10837211",
      "ref": "relation/10837211",
      "kind": "water"
    },
    {
      "id": "water-relation-2155763",
      "ref": "relation/2155763",
      "kind": "water"
    },
    {
      "id": "water-relation-2191006",
      "ref": "relation/2191006",
      "kind": "water"
    },
    {
      "id": "water-relation-2431884",
      "ref": "relation/2431884",
      "kind": "water"
    },
    {
      "id": "water-relation-3238606",
      "ref": "relation/3238606",
      "kind": "water"
    },
    {
      "id": "water-relation-6745195",
      "ref": "relation/6745195",
      "kind": "water"
    },
    {
      "id": "water-way-70333437",
      "ref": "way/70333437",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
