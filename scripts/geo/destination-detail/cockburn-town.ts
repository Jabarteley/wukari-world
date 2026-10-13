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
  "name": "Cockburn Town",
  "box": [
    21.27989141006602,
    -71.33328292548742,
    21.641653189933976,
    -70.94670827451259
  ],
  "core": [
    21.415552077516505,
    -71.18827221373165,
    21.505992522483492,
    -71.09171898626836
  ],
  "places": [
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4090974932",
      "line": "The Inn Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/412178556",
      "line": "Victoria Public Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/410152908",
      "line": "Cockburn Town Medical Centre, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/410381414",
      "line": "Historic Lighthouse Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/410413537",
      "line": "Windmills Plaza, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "office=government",
        "ref": "node/4120352294"
      },
      "ref": "node/4120352294",
      "line": "Attorney General's Chambers; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4134580201",
      "line": "Govermental Information Service, a mapped place for the game."
    },
    {
      "key": "osm-way-410322609",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/410322609",
      "line": "Turks and Caicos National Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-410381421",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/410381421",
      "line": "Grand Turk Lighthouse, a mapped place for the game."
    },
    {
      "key": "osm-node-12828526601",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/12828526601",
      "line": "Boaby Rock Point Snorkeling, a mapped place for the game."
    },
    {
      "key": "osm-way-411904621",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/411904621",
      "line": "Lester Williams Community Park, a mapped place for the game."
    },
    {
      "key": "osm-node-5662570237",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5662570237",
      "line": "Reef Shark Bay and Grill, a mapped place for the game."
    },
    {
      "key": "osm-way-411579609",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/411579609",
      "line": "Breeza Restaurant, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-296255862",
      "ref": "node/296255862",
      "kind": "neighbourhood"
    },
    {
      "id": "district-7162587",
      "ref": "relation/7162587",
      "kind": "neighbourhood"
    },
    {
      "id": "district-150155035",
      "ref": "way/150155035",
      "kind": "neighbourhood"
    },
    {
      "id": "district-23088050",
      "ref": "way/23088050",
      "kind": "neighbourhood"
    },
    {
      "id": "district-23599947",
      "ref": "way/23599947",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1022280975",
      "ref": "way/1022280975",
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
