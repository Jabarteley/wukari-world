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
  "name": "Roseau",
  "box": [
    15.11831141006602,
    -61.573711916042896,
    15.5557170444967,
    -61.2008616839571
  ],
  "core": [
    15.253972077516504,
    -61.433862667858776,
    15.344412522483495,
    -61.34071093214122
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4882864440",
      "line": "Roseau, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4650862590",
      "line": "Molly's Food Spot, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/5963855",
      "line": "Dominica State College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/370396285",
      "line": "Marigot Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/142324885",
      "line": "Lindo Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1033304908",
      "line": "Bellevue Chopin Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/361451997",
      "line": "Our Lady of Fair Haven Cthedral, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/271661481",
      "line": "Grand Fond Community Center; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/6366091386",
      "line": "pas de jonction, a mapped place for the game."
    },
    {
      "key": "osm-way-198518720",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/198518720",
      "line": "Pierre Charles Secondary School, a mapped place for the game."
    },
    {
      "key": "osm-node-11977639451",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/11977639451",
      "line": "Windsor Park, a mapped place for the game."
    },
    {
      "key": "osm-node-1418090286",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1418090286",
      "line": "Victoria Falls, a mapped place for the game."
    },
    {
      "key": "osm-node-5779237653",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5779237653",
      "line": "House of the president, a mapped place for the game."
    },
    {
      "key": "osm-node-3661886297",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/3661886297",
      "line": "Trafalgar Falls, a mapped place for the game."
    },
    {
      "key": "osm-way-145400476",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/145400476",
      "line": "Botanical Gardens, a mapped place for the game."
    },
    {
      "key": "osm-node-5238480521",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5238480521",
      "line": "Islet view, a mapped place for the game."
    },
    {
      "key": "osm-node-4650862492",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4650862492",
      "line": "3D Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-1102696829",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1102696829",
      "line": "Concord Playing Feild, a mapped place for the game."
    },
    {
      "key": "osm-node-4568918989",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4568918989",
      "line": "View of Trafalgar Falls, a mapped place for the game."
    },
    {
      "key": "osm-node-9682732830",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9682732830",
      "line": "Morne Bruce, a mapped place for the game."
    },
    {
      "key": "osm-way-389821142",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/389821142",
      "line": "All Saints University School of Medicine, a mapped place for the game."
    },
    {
      "key": "osm-way-396804252",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/396804252",
      "line": "The University of the West Indies Open Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-396970462",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/396970462",
      "line": "Dominica-China Friendship Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-361451994",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/361451994",
      "line": "Old Market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-240271426",
      "ref": "node/240271426",
      "kind": "neighbourhood"
    },
    {
      "id": "district-242414051",
      "ref": "node/242414051",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1479897755",
      "ref": "node/1479897755",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1479897817",
      "ref": "node/1479897817",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1557772026",
      "ref": "node/1557772026",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1557789651",
      "ref": "node/1557789651",
      "kind": "neighbourhood"
    },
    {
      "id": "district-238943614",
      "ref": "node/238943614",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240269571",
      "ref": "node/240269571",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240270646",
      "ref": "node/240270646",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240272213",
      "ref": "node/240272213",
      "kind": "neighbourhood"
    },
    {
      "id": "district-240273652",
      "ref": "node/240273652",
      "kind": "neighbourhood"
    },
    {
      "id": "district-248763322",
      "ref": "node/248763322",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5196719411",
      "ref": "node/5196719411",
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
