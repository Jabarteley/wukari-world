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
  "name": "Tehran",
  "box": [
    35.40705550384315,
    51.14117485750729,
    35.87013318993398,
    51.6113105965208
  ],
  "core": [
    35.644032077516506,
    51.334267429433744,
    35.73447252248349,
    51.444933370566254
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/660658572",
      "line": "Shahid Hemmat, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4647512822",
      "line": "Gol-e Rezaieh, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/616050822",
      "line": "West Tehran Islamic Azad University College of Engineering, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/437662365",
      "line": "Iran Neurology Sciences Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/206925858",
      "line": "Jamshidieh Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/471736211",
      "line": "فروشگاه شهروند, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/526888092",
      "line": "امامزاده شعیب, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/7790807",
      "line": "Azadi Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/182083848",
      "line": "Parliament of Iran, a mapped place for the game."
    },
    {
      "key": "osm-way-112376927",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/112376927",
      "line": "Iran University of Science and Technology (IUSIT), a mapped place for the game."
    },
    {
      "key": "osm-way-119376034",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/119376034",
      "line": "Azadi Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-13416585667",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13416585667",
      "line": "Tomb of Imam Khomeini, a mapped place for the game."
    },
    {
      "key": "osm-node-10214246553",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/10214246553",
      "line": "امامزاده هادی و زینب خاتون, a mapped place for the game."
    },
    {
      "key": "osm-way-222107363",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/222107363",
      "line": "Shahid Beheshti University of Tehran (SBU), a mapped place for the game."
    },
    {
      "key": "osm-way-1193089813",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1193089813",
      "line": "vellayat park, a mapped place for the game."
    },
    {
      "key": "osm-way-1067538666",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1067538666",
      "line": "شهرک سینمایی و تلویزیونی ایران, a mapped place for the game."
    },
    {
      "key": "osm-way-458252915",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/458252915",
      "line": "پارک الهیه, a mapped place for the game."
    },
    {
      "key": "osm-way-425887188",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/425887188",
      "line": "مجتمع کوی دانشگاه تهران, a mapped place for the game."
    },
    {
      "key": "osm-way-572366884",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/572366884",
      "line": "تکیه تجریش, a mapped place for the game."
    },
    {
      "key": "osm-way-600451203",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/600451203",
      "line": "Farhikhtegan Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-1527989327",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1527989327",
      "line": "حسینیه جوانان قمر بنی هاشم, a mapped place for the game."
    },
    {
      "key": "osm-way-312296275",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/312296275",
      "line": "بیمارستان روزبه (تخصصی اعصاب و روان), a mapped place for the game."
    },
    {
      "key": "osm-relation-6957011",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/6957011",
      "line": "بازار خانات, a mapped place for the game."
    },
    {
      "key": "osm-relation-8129683",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/8129683",
      "line": "Iran Mall, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10296699960",
      "ref": "node/10296699960",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3305243513",
      "ref": "node/3305243513",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4459432381",
      "ref": "node/4459432381",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4459436709",
      "ref": "node/4459436709",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4461340141",
      "ref": "node/4461340141",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4461340158",
      "ref": "node/4461340158",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4461340296",
      "ref": "node/4461340296",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4461340342",
      "ref": "node/4461340342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4461340499",
      "ref": "node/4461340499",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472037",
      "ref": "node/4516472037",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472039",
      "ref": "node/4516472039",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472040",
      "ref": "node/4516472040",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472041",
      "ref": "node/4516472041",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472042",
      "ref": "node/4516472042",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472043",
      "ref": "node/4516472043",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472044",
      "ref": "node/4516472044",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472045",
      "ref": "node/4516472045",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4516472046",
      "ref": "node/4516472046",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-8128152",
      "ref": "relation/8128152",
      "kind": "water"
    },
    {
      "id": "water-way-25934314",
      "ref": "way/25934314",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
