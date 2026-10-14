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
  "name": "Gustavia",
  "box": [
    17.71482341006602,
    -62.94953618220457,
    18.076585189933976,
    -62.66184689789981
  ],
  "core": [
    17.850484077516505,
    -62.898048422067106,
    17.940924522483492,
    -62.803625977932896
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/3659532889",
      "line": "Gustavia Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/363590642",
      "line": "Restaurant Le Gaïac, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/338583111",
      "line": "Biblithèque de Lorient, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/399483982",
      "line": "Irénée de Bruyn Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/929036319",
      "line": "La Maison des Plantes, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/363204411",
      "line": "Église Notre-Dame-de-l'Assomption, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1451711981",
      "line": "Espace Rockfeller; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/361630547",
      "line": "Hôtel de la Collectivité, a mapped place for the game."
    },
    {
      "key": "osm-way-1286299984",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1286299984",
      "line": "Stade Municipal de Saint-Jean, a mapped place for the game."
    },
    {
      "key": "osm-node-5639324918",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5639324918",
      "line": "Maison des Gouverneurs, actuellement hôtel de ville de Gustavia, a mapped place for the game."
    },
    {
      "key": "osm-node-5639324914",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5639324914",
      "line": "Maison Dinzey, a mapped place for the game."
    },
    {
      "key": "osm-node-5639324916",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5639324916",
      "line": "Clocher suédois de Gustavia, a mapped place for the game."
    },
    {
      "key": "osm-way-496898761",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/496898761",
      "line": "Church of Our Lady of the Assumption, Lorient, a mapped place for the game."
    },
    {
      "key": "osm-way-1193995016",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1193995016",
      "line": "chapelle Sainte-Catherine-de-Sienne de Colombier, a mapped place for the game."
    },
    {
      "key": "osm-node-3104286317",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3104286317",
      "line": "Colombier Viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-node-3687052434",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3687052434",
      "line": "Le Ti St. Barth, a mapped place for the game."
    },
    {
      "key": "osm-way-364607503",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/364607503",
      "line": "Restaurant O'Corail, a mapped place for the game."
    },
    {
      "key": "osm-node-3663052503",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3663052503",
      "line": "Fort Gustave, a mapped place for the game."
    },
    {
      "key": "osm-way-361887020",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/361887020",
      "line": "Square de la Rétrocession, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2610107855",
      "ref": "node/2610107855",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107856",
      "ref": "node/2610107856",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107857",
      "ref": "node/2610107857",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107859",
      "ref": "node/2610107859",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107860",
      "ref": "node/2610107860",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107861",
      "ref": "node/2610107861",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107862",
      "ref": "node/2610107862",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107863",
      "ref": "node/2610107863",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107864",
      "ref": "node/2610107864",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107865",
      "ref": "node/2610107865",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107866",
      "ref": "node/2610107866",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107867",
      "ref": "node/2610107867",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107868",
      "ref": "node/2610107868",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107869",
      "ref": "node/2610107869",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107870",
      "ref": "node/2610107870",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107871",
      "ref": "node/2610107871",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107872",
      "ref": "node/2610107872",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2610107873",
      "ref": "node/2610107873",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
