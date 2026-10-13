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
  "name": "Doha",
  "box": [
    25.104752010066022,
    51.32741872125049,
    25.466513789933977,
    51.72541367874951
  ],
  "core": [
    25.240412677516506,
    51.476722727755174,
    25.330853122483493,
    51.576109672244826
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/9960498797",
      "line": "National Museum, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6785051839",
      "line": "Levantine Doha, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/10725661",
      "line": "Qatar National Convention Center, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/247909086",
      "line": "Al Ahli Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/12719187",
      "line": "Al Bidda Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/463697424",
      "line": "Mall of Qatar, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/239713638",
      "line": "Church of Our Lady of the Rosary, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/154195867",
      "line": "Katara Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/490598248",
      "line": "Embassy of India, a mapped place for the game."
    },
    {
      "key": "osm-way-154525758",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/154525758",
      "line": "Qatar University, a mapped place for the game."
    },
    {
      "key": "osm-way-155039774",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/155039774",
      "line": "Saoud bin Abdulrahman Al-Thani Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-256250988",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/256250988",
      "line": "Barzan Towers, a mapped place for the game."
    },
    {
      "key": "osm-way-239171216",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/239171216",
      "line": "West End Park International Cricket Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-770633250",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/770633250",
      "line": "Aspire Tower, a mapped place for the game."
    },
    {
      "key": "osm-node-13278587089",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13278587089",
      "line": "Site of the 2022 FIFA World Cup Final, a mapped place for the game."
    },
    {
      "key": "osm-way-154923131",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/154923131",
      "line": "Jassim bin Hamad Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-103002122",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/103002122",
      "line": "Landmark Shopping Mall, a mapped place for the game."
    },
    {
      "key": "osm-node-3424940793",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3424940793",
      "line": "Souq Waqif, a mapped place for the game."
    },
    {
      "key": "osm-way-684144291",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/684144291",
      "line": "Northwestern University in Qatar, a mapped place for the game."
    },
    {
      "key": "osm-way-684407873",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/684407873",
      "line": "Virginia Commonwealth University - Qatar, a mapped place for the game."
    },
    {
      "key": "osm-relation-10664399",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/10664399",
      "line": "Fanar Qatar Islamic Cultural Center, a mapped place for the game."
    },
    {
      "key": "osm-way-238026555",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/238026555",
      "line": "Hamad Medical City, a mapped place for the game."
    },
    {
      "key": "osm-relation-13338453",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/13338453",
      "line": "NCCCR (Al Amal Hospital), a mapped place for the game."
    },
    {
      "key": "osm-node-6785101974",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/6785101974",
      "line": "The Kitchen Doha, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11746651788",
      "ref": "node/11746651788",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1230912279",
      "ref": "node/1230912279",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1232379948",
      "ref": "node/1232379948",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1274647503",
      "ref": "node/1274647503",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1274647518",
      "ref": "node/1274647518",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1277463303",
      "ref": "node/1277463303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1295150586",
      "ref": "node/1295150586",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1362877339",
      "ref": "node/1362877339",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1484914980",
      "ref": "node/1484914980",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1484914981",
      "ref": "node/1484914981",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1554184182",
      "ref": "node/1554184182",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2546968373",
      "ref": "node/2546968373",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10971252643",
      "ref": "node/10971252643",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11742184797",
      "ref": "node/11742184797",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11746650753",
      "ref": "node/11746650753",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1227027371",
      "ref": "node/1227027371",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1229160227",
      "ref": "node/1229160227",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1230782565",
      "ref": "node/1230782565",
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
