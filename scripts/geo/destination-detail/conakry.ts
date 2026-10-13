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
  "name": "Conakry",
  "box": [
    9.33617931006602,
    -13.882110316157231,
    9.697941089933979,
    -13.51757648384277
  ],
  "core": [
    9.471839977516504,
    -13.745391826238123,
    9.562280422483495,
    -13.654294973761878
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3457242829",
      "line": "Simbaya, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2272771392",
      "line": "L'Avenue, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/338945649",
      "line": "Université Kofi Annan de Guinée, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/549652805",
      "line": "Ignace Deen Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/38662471",
      "line": "forêt classé de Dabompa, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/505452428",
      "line": "Marché de Bonfi, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/549242648",
      "line": "Cathédrale Sainte-Marie, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/7020605620",
      "line": "Maison des jeunes; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/552008196",
      "line": "Palais Roi Mohamed V, a mapped place for the game."
    },
    {
      "key": "osm-way-504460776",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/504460776",
      "line": "UNC, a mapped place for the game."
    },
    {
      "key": "osm-way-550010888",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/550010888",
      "line": "Stade de la mission, a mapped place for the game."
    },
    {
      "key": "osm-way-39240323",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/39240323",
      "line": "Monument du 22 novembre 1970, a mapped place for the game."
    },
    {
      "key": "osm-way-338977493",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/338977493",
      "line": "Donka Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-291396458",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/291396458",
      "line": "Clinique Ambroise Paré, a mapped place for the game."
    },
    {
      "key": "osm-way-338672791",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/338672791",
      "line": "Stade du 28 septembre, a mapped place for the game."
    },
    {
      "key": "osm-relation-7829658",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/7829658",
      "line": "Stade Général Lansana Conté, a mapped place for the game."
    },
    {
      "key": "osm-way-552008098",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/552008098",
      "line": "Musée national de Guinée, a mapped place for the game."
    },
    {
      "key": "osm-way-217953079",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/217953079",
      "line": "Université Gamal Abdel Nasser de Conakry, a mapped place for the game."
    },
    {
      "key": "osm-node-6813943851",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6813943851",
      "line": "Plage Soro, a mapped place for the game."
    },
    {
      "key": "osm-node-10024259768",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10024259768",
      "line": "Restaurant SansFrancisco, a mapped place for the game."
    },
    {
      "key": "osm-node-8007052060",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8007052060",
      "line": "restaurant, a mapped place for the game."
    },
    {
      "key": "osm-node-7289060001",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7289060001",
      "line": "Alimentation Générale DIALLO et Frère, a mapped place for the game."
    },
    {
      "key": "osm-way-504471379",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/504471379",
      "line": "Keyce Academy - Ecole Française de Guinée, a mapped place for the game."
    },
    {
      "key": "osm-way-616434324",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/616434324",
      "line": "Centre commercial poukou, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10211678587",
      "ref": "node/10211678587",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10211690354",
      "ref": "node/10211690354",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10211693328",
      "ref": "node/10211693328",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13960642227",
      "ref": "node/13960642227",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272477676",
      "ref": "node/2272477676",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272477748",
      "ref": "node/2272477748",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272477791",
      "ref": "node/2272477791",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272477829",
      "ref": "node/2272477829",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272566457",
      "ref": "node/2272566457",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272596116",
      "ref": "node/2272596116",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272643051",
      "ref": "node/2272643051",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2272648114",
      "ref": "node/2272648114",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2865708958",
      "ref": "node/2865708958",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3060297369",
      "ref": "node/3060297369",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4269850383",
      "ref": "node/4269850383",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4269860990",
      "ref": "node/4269860990",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4276012273",
      "ref": "node/4276012273",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4337214551",
      "ref": "node/4337214551",
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
