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
  "name": "Podgorica",
  "box": [
    42.26064291006602,
    19.017946185363805,
    42.62240468993398,
    19.506270014636193
  ],
  "core": [
    42.396303577516505,
    19.201200165490835,
    42.48674402248349,
    19.323016034509163
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/418346188",
      "line": "Bioče, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/308048952",
      "line": "Studentska menza, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/312760420",
      "line": "Univerzitet Donja Gorica, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/309274533",
      "line": "Dom zdravlja Konik, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28130532",
      "line": "Njegošev park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5409350621",
      "line": "Mall of Montenegro, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "relation/15487672",
      "line": "Manastir Vranjina, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/27557242",
      "line": "Trg nezavisnosti; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/185576903",
      "line": "Agencija za Nacionalnu Bezbjednost, a mapped place for the game."
    },
    {
      "key": "osm-node-4345473682",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/4345473682",
      "line": "Faculty of Political Science, a mapped place for the game."
    },
    {
      "key": "osm-way-923891668",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/923891668",
      "line": "Stadion Trešnjica, a mapped place for the game."
    },
    {
      "key": "osm-node-4751745100",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4751745100",
      "line": "Memorial to the Fallen of the Lješanska Nahija Region, a mapped place for the game."
    },
    {
      "key": "osm-way-331572836",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/331572836",
      "line": "Manastir Piperska Celija, a mapped place for the game."
    },
    {
      "key": "osm-way-273450355",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/273450355",
      "line": "Braća Velašević Stadium, a mapped place for the game."
    },
    {
      "key": "osm-relation-15505766",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/15505766",
      "line": "Žabljak Crnojevića, a mapped place for the game."
    },
    {
      "key": "osm-way-239484551",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/239484551",
      "line": "Stadion Ljajkovići, a mapped place for the game."
    },
    {
      "key": "osm-way-170592633",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/170592633",
      "line": "Lesendro, a mapped place for the game."
    },
    {
      "key": "osm-way-175501033",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/175501033",
      "line": "Cathedral of the Resurrection of Christ, a mapped place for the game."
    },
    {
      "key": "osm-way-28130522",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/28130522",
      "line": "Karađorđev park, a mapped place for the game."
    },
    {
      "key": "osm-way-185576891",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/185576891",
      "line": "Univerzitet Crne Gore, a mapped place for the game."
    },
    {
      "key": "osm-way-134769445",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/134769445",
      "line": "Ramada Podgorica, a mapped place for the game."
    },
    {
      "key": "osm-node-2242615494",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2242615494",
      "line": "Poslednja Luka, a mapped place for the game."
    },
    {
      "key": "osm-node-9896999137",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9896999137",
      "line": "Cemi holiday resort, a mapped place for the game."
    },
    {
      "key": "osm-way-1333029322",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1333029322",
      "line": "Gushing Water Tree, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11229612891",
      "ref": "node/11229612891",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2968259625",
      "ref": "node/2968259625",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11207178915",
      "ref": "node/11207178915",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12400723037",
      "ref": "node/12400723037",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2871167984",
      "ref": "node/2871167984",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2877103486",
      "ref": "node/2877103486",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2877103487",
      "ref": "node/2877103487",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2877103488",
      "ref": "node/2877103488",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2878357378",
      "ref": "node/2878357378",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2878357619",
      "ref": "node/2878357619",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2968259624",
      "ref": "node/2968259624",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2968259626",
      "ref": "node/2968259626",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2968259628",
      "ref": "node/2968259628",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2968266390",
      "ref": "node/2968266390",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2970641193",
      "ref": "node/2970641193",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5548452589",
      "ref": "node/5548452589",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6775699315",
      "ref": "node/6775699315",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-14368174",
      "ref": "way/14368174",
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
