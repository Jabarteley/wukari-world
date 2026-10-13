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
  "name": "Brades",
  "box": [
    16.62708209905942,
    -62.37898494990648,
    16.95266770094058,
    -62.04090185009352
  ],
  "core": [
    16.744654677516507,
    -62.25687013153457,
    16.835095122483494,
    -62.16301666846543
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/525908409",
      "line": "Montserrat Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/525911948",
      "line": "Isle's Bay Beach Bar, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/750181857",
      "line": "Montserrat Community College, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/381881809",
      "line": "Glendon Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1454779411",
      "line": "Salem Park, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "node/6394397340"
      },
      "ref": "node/6394397340",
      "line": "Office of the Auditor General; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/381894171",
      "line": "Sports Department, a mapped place for the game."
    },
    {
      "key": "osm-way-1470063189",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1470063189",
      "line": "University of the West Indies Global Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-409349407",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/409349407",
      "line": "Blakes Estate Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-13341371451",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13341371451",
      "line": "Plymouth, a mapped place for the game."
    },
    {
      "key": "osm-node-358226040",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/358226040",
      "line": "Montserrat Volcano Observatory, a mapped place for the game."
    },
    {
      "key": "osm-way-381894081",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/381894081",
      "line": "National Museum of Montserrat, a mapped place for the game."
    },
    {
      "key": "osm-node-359010199",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/359010199",
      "line": "Old Airport Viewpoint, a mapped place for the game."
    },
    {
      "key": "osm-node-13341390470",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/13341390470",
      "line": "Fort St. George, a mapped place for the game."
    },
    {
      "key": "osm-way-525902974",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/525902974",
      "line": "Ziggy's, a mapped place for the game."
    },
    {
      "key": "osm-way-397189233",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/397189233",
      "line": "Hilltop Coffee House, a mapped place for the game."
    },
    {
      "key": "osm-node-13341415105",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/13341415105",
      "line": "Grand Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-358222146",
      "ref": "node/358222146",
      "kind": "neighbourhood"
    },
    {
      "id": "district-823452950",
      "ref": "node/823452950",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11020900078",
      "ref": "node/11020900078",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11020900079",
      "ref": "node/11020900079",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13341573819",
      "ref": "node/13341573819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13366259732",
      "ref": "node/13366259732",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "market",
      "reason": "no unused named amenity=marketplace or shop=mall feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
    {
      "slot": "worship",
      "reason": "no unused named amenity=place_of_worship feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
