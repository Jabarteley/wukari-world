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
  "name": "Palikir",
  "box": [
    6.739863110066022,
    157.98166311858617,
    7.101624889933978,
    158.34376548141384
  ],
  "core": [
    6.875523777516506,
    158.11746472569575,
    6.965964222483494,
    158.20796387430426
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2595122729",
      "line": "Cupids Bar & Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/316806679",
      "line": "College of Micronesia National Campus, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/13282249219",
      "line": "hauan, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/316996154",
      "line": "Spanish Wall Park, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "node/11981379972"
      },
      "ref": "node/11981379972",
      "line": "Supreme Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/11981379973",
      "line": "Congress of the Federated States of Micronesia, a mapped place for the game."
    },
    {
      "key": "osm-node-4467670089",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4467670089",
      "line": "Bridge over stream near sakau, a mapped place for the game."
    },
    {
      "key": "osm-way-481854372",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/481854372",
      "line": "Nan Madol, a mapped place for the game."
    },
    {
      "key": "osm-node-358689543",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/358689543",
      "line": "German Tower, a mapped place for the game."
    },
    {
      "key": "osm-way-316996156",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/316996156",
      "line": "Historic Spanish Wall, a mapped place for the game."
    },
    {
      "key": "osm-way-551942387",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/551942387",
      "line": "JED's Cantina, a mapped place for the game."
    },
    {
      "key": "osm-node-3958969172",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3958969172",
      "line": "Nett Ramen, a mapped place for the game."
    },
    {
      "key": "osm-way-1447609575",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1447609575",
      "line": "hsaun, a mapped place for the game."
    },
    {
      "key": "osm-node-3230314553",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3230314553",
      "line": "Stone Look-Out, a mapped place for the game."
    },
    {
      "key": "osm-way-1292890855",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1292890855",
      "line": "Genesis Medical Center, a mapped place for the game."
    },
    {
      "key": "osm-way-1447609004",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1447609004",
      "line": "hsuan, a mapped place for the game."
    },
    {
      "key": "osm-way-585464416",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/585464416",
      "line": "Pohnpei State Hospital, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11982839816",
      "ref": "node/11982839816",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3229068725",
      "ref": "node/3229068725",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3229068650",
      "ref": "node/3229068650",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3229068651",
      "ref": "node/3229068651",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3229068719",
      "ref": "node/3229068719",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11983507951",
      "ref": "node/11983507951",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11982839818",
      "ref": "node/11982839818",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11982839817",
      "ref": "node/11982839817",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3229068762",
      "ref": "node/3229068762",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11982839815",
      "ref": "node/11982839815",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11982720363",
      "ref": "node/11982720363",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7935621157",
      "ref": "node/7935621157",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11983507952",
      "ref": "node/11983507952",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11983507950",
      "ref": "node/11983507950",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11983507949",
      "ref": "node/11983507949",
      "kind": "neighbourhood"
    },
    {
      "id": "district-368381835",
      "ref": "node/368381835",
      "kind": "neighbourhood"
    },
    {
      "id": "district-368381815",
      "ref": "node/368381815",
      "kind": "neighbourhood"
    },
    {
      "id": "district-368381829",
      "ref": "node/368381829",
      "kind": "neighbourhood"
    }
  ],
  "profile": "microstate",
  "emptySlots": [
    {
      "slot": "transit",
      "reason": "no unused named railway=station, amenity=bus_station or public_transport=station feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue"
    },
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
