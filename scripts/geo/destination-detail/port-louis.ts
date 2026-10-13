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
  "name": "Port Louis",
  "box": [
    -20.439245044496698,
    57.31119049223443,
    -19.981571310066023,
    57.694418307765574
  ],
  "core": [
    -20.207672422483494,
    57.454942805812735,
    -20.117231977516507,
    57.55066599418727
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/7158546294",
      "line": "Port Louis Victoria, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4981968897",
      "line": "Pakbo, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/223523808",
      "line": "Royal College Curepipe, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/2153376271",
      "line": "Clinique du Nord, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/126227132",
      "line": "Curepipe Botanic Gardens, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1149966482",
      "line": "Dr James Burty David Marketplace, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/170358867",
      "line": "St Francois D'Assise, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/5981672043",
      "line": "Camp-Levieux; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1006065313",
      "line": "Le château du Réduit, a mapped place for the game."
    },
    {
      "key": "osm-way-305142563",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/305142563",
      "line": "Université de technologie, Île Maurice, a mapped place for the game."
    },
    {
      "key": "osm-way-296191237",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/296191237",
      "line": "Anjalay Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-33142632",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/33142632",
      "line": "Fort Adélaïde, a mapped place for the game."
    },
    {
      "key": "osm-way-287506166",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/287506166",
      "line": "Stade Germain Comarmond, a mapped place for the game."
    },
    {
      "key": "osm-way-154287619",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/154287619",
      "line": "Sir Gaetan Duval Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-471868507",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/471868507",
      "line": "Paul Octave Wiehe Auditorium, a mapped place for the game."
    },
    {
      "key": "osm-way-170362036",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/170362036",
      "line": "L'Aventure du Sucre, a mapped place for the game."
    },
    {
      "key": "osm-way-495476854",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/495476854",
      "line": "Mosquée Djoumâ, a mapped place for the game."
    },
    {
      "key": "osm-way-475489173",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/475489173",
      "line": "New Eton College, a mapped place for the game."
    },
    {
      "key": "osm-relation-14750287",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/14750287",
      "line": "Musée d'Histoire Naturelle, a mapped place for the game."
    },
    {
      "key": "osm-way-158575993",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/158575993",
      "line": "St Louis Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-5558934330",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5558934330",
      "line": "L a marmite mauricienne, a mapped place for the game."
    },
    {
      "key": "osm-node-1793110377",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1793110377",
      "line": "Le Chamarel, a mapped place for the game."
    },
    {
      "key": "osm-node-3753991177",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/3753991177",
      "line": "Primary School, a mapped place for the game."
    },
    {
      "key": "osm-way-445169724",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/445169724",
      "line": "Health Center Montagne Blanche, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2675749581",
      "ref": "node/2675749581",
      "kind": "neighbourhood"
    },
    {
      "id": "district-448958855",
      "ref": "node/448958855",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9280540362",
      "ref": "node/9280540362",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9280540363",
      "ref": "node/9280540363",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9280540374",
      "ref": "node/9280540374",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9280558604",
      "ref": "node/9280558604",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10657852850",
      "ref": "node/10657852850",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10657852852",
      "ref": "node/10657852852",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10657852853",
      "ref": "node/10657852853",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690266767",
      "ref": "node/10690266767",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690266768",
      "ref": "node/10690266768",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690266769",
      "ref": "node/10690266769",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690266770",
      "ref": "node/10690266770",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690266771",
      "ref": "node/10690266771",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690266772",
      "ref": "node/10690266772",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690283136",
      "ref": "node/10690283136",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690283137",
      "ref": "node/10690283137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10690283138",
      "ref": "node/10690283138",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-7419541",
      "ref": "relation/7419541",
      "kind": "water"
    },
    {
      "id": "water-way-158605915",
      "ref": "way/158605915",
      "kind": "water"
    },
    {
      "id": "water-way-22894669",
      "ref": "way/22894669",
      "kind": "water"
    },
    {
      "id": "water-way-422499557",
      "ref": "way/422499557",
      "kind": "water"
    },
    {
      "id": "water-way-422876973",
      "ref": "way/422876973",
      "kind": "water"
    },
    {
      "id": "water-way-507755283",
      "ref": "way/507755283",
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
