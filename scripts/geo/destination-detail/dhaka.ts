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
  "name": "Dhaka",
  "box": [
    23.583505410066024,
    90.19243311848332,
    23.94526718993398,
    90.58559568151666
  ],
  "core": [
    23.71916607751651,
    90.33992056266716,
    23.809606522483495,
    90.43810823733283
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5798601925",
      "line": "Dhaka Airport Railway Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/3127514952",
      "line": "Bengal Foundation, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/14376114",
      "line": "China Bangladesh Friendship Exhibition Center, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/337766881",
      "line": "Enam Medical College and hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/32561564",
      "line": "Bangladesh National Monument, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/586535435",
      "line": "Jamuna Future Park, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/3711746808",
      "line": "Binat Bibi Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/689287638",
      "line": "Nagar Bhaban; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/1148134190",
      "line": "Sarak Bhaban, Roads & Highways Department Head Office, a mapped place for the game."
    },
    {
      "key": "osm-way-587828519",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/587828519",
      "line": "Daffodil International University, a mapped place for the game."
    },
    {
      "key": "osm-way-121390579",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/121390579",
      "line": "Sher-E-Bangla National Cricket Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-550516604",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/550516604",
      "line": "Fantasy Kingdom, a mapped place for the game."
    },
    {
      "key": "osm-node-9532058929",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/9532058929",
      "line": "Bashundhara Kings Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-490287434",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/490287434",
      "line": "International University of Business Agriculture and Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-1187202894",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1187202894",
      "line": "Bangladesh Islami University, a mapped place for the game."
    },
    {
      "key": "osm-node-4764950575",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4764950575",
      "line": "Khan Mohammad Mridha Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-502997496",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/502997496",
      "line": "Combined Military Hospital (CMH), a mapped place for the game."
    },
    {
      "key": "osm-way-370071885",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/370071885",
      "line": "National Museum of Science & Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-141641870",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/141641870",
      "line": "IZUMI, a mapped place for the game."
    },
    {
      "key": "osm-way-236956073",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/236956073",
      "line": "Ramna Park, a mapped place for the game."
    },
    {
      "key": "osm-way-499441489",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/499441489",
      "line": "Mugda Medical College & Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-296537243",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/296537243",
      "line": "Holy Rosary Church, a mapped place for the game."
    },
    {
      "key": "osm-way-245019710",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/245019710",
      "line": "Tara Mosque, a mapped place for the game."
    },
    {
      "key": "osm-way-24477071",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/24477071",
      "line": "National Stadium, Dhaka, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-141466267",
      "ref": "node/141466267",
      "kind": "neighbourhood"
    },
    {
      "id": "district-141466268",
      "ref": "node/141466268",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264032548",
      "ref": "node/264032548",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3396191063",
      "ref": "node/3396191063",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3396195793",
      "ref": "node/3396195793",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3808575870",
      "ref": "node/3808575870",
      "kind": "neighbourhood"
    },
    {
      "id": "district-393920647",
      "ref": "node/393920647",
      "kind": "neighbourhood"
    },
    {
      "id": "district-396699842",
      "ref": "node/396699842",
      "kind": "neighbourhood"
    },
    {
      "id": "district-396703556",
      "ref": "node/396703556",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5118172307",
      "ref": "node/5118172307",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5219237983",
      "ref": "node/5219237983",
      "kind": "neighbourhood"
    },
    {
      "id": "district-642560699",
      "ref": "node/642560699",
      "kind": "neighbourhood"
    },
    {
      "id": "district-6717775240",
      "ref": "node/6717775240",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8483930222",
      "ref": "node/8483930222",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8483986158",
      "ref": "node/8483986158",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8953203672",
      "ref": "node/8953203672",
      "kind": "neighbourhood"
    },
    {
      "id": "district-9024343174",
      "ref": "node/9024343174",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10079803798",
      "ref": "node/10079803798",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-5347205",
      "ref": "relation/5347205",
      "kind": "water"
    },
    {
      "id": "water-way-31167671",
      "ref": "way/31167671",
      "kind": "water"
    },
    {
      "id": "water-way-315929350",
      "ref": "way/315929350",
      "kind": "water"
    },
    {
      "id": "water-way-39765260",
      "ref": "way/39765260",
      "kind": "water"
    },
    {
      "id": "water-way-644696292",
      "ref": "way/644696292",
      "kind": "water"
    },
    {
      "id": "water-way-963633684",
      "ref": "way/963633684",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
