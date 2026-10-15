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
  "name": "The Valley",
  "box": [
    18.135993353323684,
    -63.24111307900157,
    18.395466989933976,
    -62.86243872099843
  ],
  "core": [
    18.169365877516505,
    -63.099073084172005,
    18.25980632248349,
    -63.004478715828
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1236465390",
      "line": "Blowing Point Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/200829135",
      "line": "Allan and Sue's Prickly Pear Restaurant, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/360806409",
      "line": "Princess Alexandra Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/226917922",
      "line": "Ronald Webster Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2386468615",
      "line": "Clarita Mason Shopping Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/360815720",
      "line": "St. Gerard's Catholic Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "way/360643395"
      },
      "ref": "way/360643395",
      "line": "National Health Insurance; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/3690523267",
      "line": "Public Utilities Commission, a mapped place for the game."
    },
    {
      "key": "osm-way-362017267",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/362017267",
      "line": "Heritage Collection Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-360817333",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/360817333",
      "line": "Wallblake House, a mapped place for the game."
    },
    {
      "key": "osm-node-2107724413",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2107724413",
      "line": "Lower West End Point, a mapped place for the game."
    },
    {
      "key": "osm-way-839159058",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/839159058",
      "line": "Celeste Restaraunt, a mapped place for the game."
    },
    {
      "key": "osm-way-361821807",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/361821807",
      "line": "Madeariman Restaurant, a mapped place for the game."
    },
    {
      "key": "osm-way-230276598",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/230276598",
      "line": "South Hill Plaza, a mapped place for the game."
    },
    {
      "key": "osm-way-522219599",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/522219599",
      "line": "WSC GROUP, a mapped place for the game."
    },
    {
      "key": "osm-way-793135698",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/793135698",
      "line": "Owen Mussington Playing Field, a mapped place for the game."
    },
    {
      "key": "osm-node-3652964299",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/3652964299",
      "line": "Mary Elizabeth Recreation Park, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-2108011519",
      "ref": "node/2108011519",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107882095",
      "ref": "node/2107882095",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2109392064",
      "ref": "node/2109392064",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2108033406",
      "ref": "node/2108033406",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107882094",
      "ref": "node/2107882094",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107882090",
      "ref": "node/2107882090",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2108011517",
      "ref": "node/2108011517",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2108011516",
      "ref": "node/2108011516",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9727508822",
      "ref": "node/9727508822",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2110691792",
      "ref": "node/2110691792",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2107910778",
      "ref": "node/2107910778",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2402528665",
      "ref": "node/2402528665",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12871028888",
      "ref": "node/12871028888",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12871028889",
      "ref": "node/12871028889",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2402528663",
      "ref": "node/2402528663",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2356442212",
      "ref": "node/2356442212",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12871028887",
      "ref": "node/12871028887",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12871028890",
      "ref": "node/12871028890",
      "kind": "neighbourhood"
    }
  ],
  "playAreaWithinBox": true,
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "community",
      "reason": "no unused named amenity=university, college, library, community_centre or conference_centre feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
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
