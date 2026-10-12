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
  "name": "Bangui",
  "box": [
    4.182630910066022,
    18.403362469626906,
    4.544392689933979,
    18.76382013037309
  ],
  "core": [
    4.318291577516506,
    18.538542443868806,
    4.408732022483495,
    18.62864015613119
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4637748533",
      "line": "Terminal Nord, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5636195222",
      "line": "Chinese restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/802512689",
      "line": "Groupe Elite Formation, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1005223767",
      "line": "Saint Donatien, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/400792235",
      "line": "parco, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/596757623",
      "line": "Marché Miskine, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/188769617",
      "line": "Cathédrale Notre-Dame de l’Immaculée Conception, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/212710100",
      "line": "La ville de Bégoua; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4637140696",
      "line": "Société de Distribution d’Eau de Centrafrique, a mapped place for the game."
    },
    {
      "key": "osm-way-800392634",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/800392634",
      "line": "Faculté de la Théologie Biblique, a mapped place for the game."
    },
    {
      "key": "osm-way-235317733",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/235317733",
      "line": "Stade Barthélémy Boganda, a mapped place for the game."
    },
    {
      "key": "osm-way-188492702",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/188492702",
      "line": "National Museum Barthelemy Boganda, a mapped place for the game."
    },
    {
      "key": "osm-node-2225615058",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/2225615058",
      "line": "Centre de Santé Urbain de Ouango Bangui, a mapped place for the game."
    },
    {
      "key": "osm-node-2225267665",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/2225267665",
      "line": "Centre de Santé Guitangola, a mapped place for the game."
    },
    {
      "key": "osm-node-2381567443",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2381567443",
      "line": "La Brasserie, a mapped place for the game."
    },
    {
      "key": "osm-node-4733960505",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4733960505",
      "line": "Restaurante, a mapped place for the game."
    },
    {
      "key": "osm-way-405889132",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/405889132",
      "line": "University of Bangui, a mapped place for the game."
    },
    {
      "key": "osm-way-188497852",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/188497852",
      "line": "Stade Bonga Bonga, a mapped place for the game."
    },
    {
      "key": "osm-way-316073499",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/316073499",
      "line": "Jardin de Mairie, a mapped place for the game."
    },
    {
      "key": "osm-node-4637219536",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4637219536",
      "line": "Institut New Tech, a mapped place for the game."
    },
    {
      "key": "osm-node-5369227121",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5369227121",
      "line": "Salle omnisports, a mapped place for the game."
    },
    {
      "key": "osm-node-4637748534",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/4637748534",
      "line": "Marché d'Artisanat, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1984367557",
      "ref": "node/1984367557",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2001128137",
      "ref": "node/2001128137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3213816710",
      "ref": "node/3213816710",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007910715",
      "ref": "node/5007910715",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5020114623",
      "ref": "node/5020114623",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984282",
      "ref": "node/5007984282",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5008113169",
      "ref": "node/5008113169",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5005809662",
      "ref": "node/5005809662",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984281",
      "ref": "node/5007984281",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2582338452",
      "ref": "node/2582338452",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5151368097",
      "ref": "node/5151368097",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984271",
      "ref": "node/5007984271",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5005809689",
      "ref": "node/5005809689",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984270",
      "ref": "node/5007984270",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007910734",
      "ref": "node/5007910734",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984284",
      "ref": "node/5007984284",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984283",
      "ref": "node/5007984283",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5007984285",
      "ref": "node/5007984285",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
