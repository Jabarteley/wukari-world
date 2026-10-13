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
  "name": "Bandar Seri Begawan",
  "box": [
    4.708664410066022,
    114.76138935172006,
    5.070426189933978,
    115.12212544827995
  ],
  "core": [
    4.844325077516506,
    114.89667473261095,
    4.934765522483494,
    114.98684006738905
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/376623464",
      "line": "Serasa Ferry Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1002632491",
      "line": "Raziqin Restaurant, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/548051510",
      "line": "Lambak Kanan Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/310970830",
      "line": "Jerudong Park Medical Centre, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/532442991",
      "line": "Golden Jubilee Crown Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/316233200",
      "line": "Pasar Serbaneka Kampong Masin dan Kampong Bebatik, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/321333285",
      "line": "Ash-Shaliheen Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/512363094",
      "line": "Bandar Seri Begawan Royal Wharf; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/521756870",
      "line": "Ministry of Religious Affairs, a mapped place for the game."
    },
    {
      "key": "osm-way-428761669",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/428761669",
      "line": "University of Brunei Darussalam, a mapped place for the game."
    },
    {
      "key": "osm-way-506728677",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/506728677",
      "line": "Hassanal Bolkiah National Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-438282545",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/438282545",
      "line": "Brunei Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-430464616",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/430464616",
      "line": "Nurul Iman Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-525946664",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/525946664",
      "line": "Masjid Hassanal Bolkiah, a mapped place for the game."
    },
    {
      "key": "osm-way-45984870",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/45984870",
      "line": "Lapau, a mapped place for the game."
    },
    {
      "key": "osm-way-45840473",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/45840473",
      "line": "Sultan Omar 'Ali Saifuddien Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-313407023",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/313407023",
      "line": "Maktab Duli Pengiran Muda Al-Muhtadee Billah, a mapped place for the game."
    },
    {
      "key": "osm-way-265532229",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/265532229",
      "line": "Taman Jubli Perak Sultan Haji Hassanal Bolkiah, a mapped place for the game."
    },
    {
      "key": "osm-way-45897644",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/45897644",
      "line": "Seri Begawan Religious Teachers University College, a mapped place for the game."
    },
    {
      "key": "osm-way-45895096",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/45895096",
      "line": "Raja Isteri Pengiran Anak Saleha Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-4723539711",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/4723539711",
      "line": "Gleneagles JPMC, a mapped place for the game."
    },
    {
      "key": "osm-way-936719394",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/936719394",
      "line": "Peliunan Park, a mapped place for the game."
    },
    {
      "key": "osm-node-4844890304",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4844890304",
      "line": "Diana Berudin, a mapped place for the game."
    },
    {
      "key": "osm-node-4758981105",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4758981105",
      "line": "Mono, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-5546883206",
      "ref": "node/5546883206",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3175125668",
      "ref": "node/3175125668",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4087570413",
      "ref": "node/4087570413",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4262352493",
      "ref": "node/4262352493",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5546885646",
      "ref": "node/5546885646",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5934764604",
      "ref": "node/5934764604",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5936294501",
      "ref": "node/5936294501",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5936348129",
      "ref": "node/5936348129",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5936348840",
      "ref": "node/5936348840",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5936349450",
      "ref": "node/5936349450",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5936352849",
      "ref": "node/5936352849",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5936355510",
      "ref": "node/5936355510",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5937091876",
      "ref": "node/5937091876",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-20364436",
      "ref": "relation/20364436",
      "kind": "water"
    },
    {
      "id": "water-way-262074855",
      "ref": "way/262074855",
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
