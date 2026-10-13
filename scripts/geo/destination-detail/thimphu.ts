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
  "name": "Thimphu",
  "box": [
    27.290473710066024,
    89.41447965842985,
    27.65223548993398,
    89.83650211956622
  ],
  "core": [
    27.426134377516508,
    89.58302828112082,
    27.516574822483495,
    89.68431751887917
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4776561047",
      "line": "City Bus Terminal, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4496630080",
      "line": "Menchuna, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/260418942",
      "line": "National Library of Bhutan, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/425635150",
      "line": "Jigme Dorji Wangchuck National Referral Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1083747727",
      "line": "Dangrina Recreational Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/11937243669",
      "line": "Canteen, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/188067168",
      "line": "Buddha Dordenma, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/91559919",
      "line": "Clock Tower Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/10759470946",
      "line": "Kabesa Gewog Centre, a mapped place for the game."
    },
    {
      "key": "osm-node-6161406390",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/6161406390",
      "line": "Norbuling Rigter College, a mapped place for the game."
    },
    {
      "key": "osm-way-369953190",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/369953190",
      "line": "Changlimithang Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-187025042",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/187025042",
      "line": "National Museum of Bhutan, a mapped place for the game."
    },
    {
      "key": "osm-way-1380032231",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1380032231",
      "line": "Motithang Takin Preserve, a mapped place for the game."
    },
    {
      "key": "osm-relation-2532733",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/2532733",
      "line": "Tashichho Dzong, a mapped place for the game."
    },
    {
      "key": "osm-way-217728797",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/217728797",
      "line": "Royal Textile Academy, a mapped place for the game."
    },
    {
      "key": "osm-way-435186557",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/435186557",
      "line": "National Traditional Medicine Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-663910123",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/663910123",
      "line": "National Memorial Chorten, a mapped place for the game."
    },
    {
      "key": "osm-node-11933012275",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11933012275",
      "line": "Kuen-thun Restaurant and bar, a mapped place for the game."
    },
    {
      "key": "osm-node-10756662149",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10756662149",
      "line": "E/G88 Restaurant &Bar, a mapped place for the game."
    },
    {
      "key": "osm-way-541766925",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/541766925",
      "line": "Chamgang BHU, a mapped place for the game."
    },
    {
      "key": "osm-node-11936865369",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/11936865369",
      "line": "International Office ( IRO office), a mapped place for the game."
    },
    {
      "key": "osm-way-1380056477",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1380056477",
      "line": "Anniversary park, a mapped place for the game."
    },
    {
      "key": "osm-way-431787600",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/431787600",
      "line": "Royal Institute of Management, a mapped place for the game."
    },
    {
      "key": "osm-node-10308083192",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/10308083192",
      "line": "Jungshina Neighborhood Vegtable Market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11211469669",
      "ref": "node/11211469669",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11672157314",
      "ref": "node/11672157314",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11815957579",
      "ref": "node/11815957579",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4910671322",
      "ref": "node/4910671322",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4910671325",
      "ref": "node/4910671325",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4910671326",
      "ref": "node/4910671326",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-356909919",
      "ref": "way/356909919",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
