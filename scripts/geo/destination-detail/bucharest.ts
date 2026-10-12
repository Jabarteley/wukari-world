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
  "name": "Bucharest",
  "box": [
    44.255260510066016,
    25.850284672761397,
    44.61702228993398,
    26.355083327238603
  ],
  "core": [
    44.3909211775165,
    26.03973106740877,
    44.48136162248349,
    26.16563693259123
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/122236985",
      "line": "Chitila, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/916075216",
      "line": "Caru' cu Bere, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/242092560",
      "line": "The International School of Bucharest, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/23737371",
      "line": "Fundeni Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/1054221333",
      "line": "Parcul Tudor Arghezi, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/241256765",
      "line": "Băneasa Shopping City, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/1088260518",
      "line": "Biserica „Adormirea Maicii Domnului”, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/156815213",
      "line": "District 1 City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/284997385",
      "line": "Serviciul de Protecție și Pază, a mapped place for the game."
    },
    {
      "key": "osm-way-1073541452",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1073541452",
      "line": "National Intelligence Academy, a mapped place for the game."
    },
    {
      "key": "osm-way-847208795",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/847208795",
      "line": "Stadionul Concordia, a mapped place for the game."
    },
    {
      "key": "osm-node-13348629880",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/13348629880",
      "line": "MiG-21, a mapped place for the game."
    },
    {
      "key": "osm-way-538963326",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/538963326",
      "line": "Fostul conac Oteteleșanu, a mapped place for the game."
    },
    {
      "key": "osm-node-7192273754",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7192273754",
      "line": "Balotesti Victim Memorial, a mapped place for the game."
    },
    {
      "key": "osm-way-497380799",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/497380799",
      "line": "Biserica „Sfinții Împărați Constantin și Elena”, a mapped place for the game."
    },
    {
      "key": "osm-way-79128894",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/79128894",
      "line": "Biserica Sfânta Fecioară Maria Regină din Cioplea, a mapped place for the game."
    },
    {
      "key": "osm-way-23705733",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/23705733",
      "line": "Parcul Obor, a mapped place for the game."
    },
    {
      "key": "osm-way-240694437",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/240694437",
      "line": "Promenada Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-13860708",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/13860708",
      "line": "Polyvalent Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-21802163",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/21802163",
      "line": "Parcul Drumul Taberei, a mapped place for the game."
    },
    {
      "key": "osm-way-46256608",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/46256608",
      "line": "Jumbo Center, a mapped place for the game."
    },
    {
      "key": "osm-way-13450166",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/13450166",
      "line": "National Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-1227559971",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1227559971",
      "line": "Floreasca Hospital, a mapped place for the game."
    },
    {
      "key": "osm-way-23574618",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/23574618",
      "line": "“Prof. Dr. Alexandru Obregia” Clinical Hospital of Psychiatry, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-6233361766",
      "ref": "node/6233361766",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8863889489",
      "ref": "node/8863889489",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8863889490",
      "ref": "node/8863889490",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10100638854",
      "ref": "node/10100638854",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10931526489",
      "ref": "node/10931526489",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10942168223",
      "ref": "node/10942168223",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11070202377",
      "ref": "node/11070202377",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11664973303",
      "ref": "node/11664973303",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12122091249",
      "ref": "node/12122091249",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12122111428",
      "ref": "node/12122111428",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12122114476",
      "ref": "node/12122114476",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12122114526",
      "ref": "node/12122114526",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12122137807",
      "ref": "node/12122137807",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12124276452",
      "ref": "node/12124276452",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12124432391",
      "ref": "node/12124432391",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12126278285",
      "ref": "node/12126278285",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12126318667",
      "ref": "node/12126318667",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12137243075",
      "ref": "node/12137243075",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1130828",
      "ref": "relation/1130828",
      "kind": "water"
    },
    {
      "id": "water-relation-1210928",
      "ref": "relation/1210928",
      "kind": "water"
    },
    {
      "id": "water-relation-13212100",
      "ref": "relation/13212100",
      "kind": "water"
    },
    {
      "id": "water-relation-13216634",
      "ref": "relation/13216634",
      "kind": "water"
    },
    {
      "id": "water-relation-358013",
      "ref": "relation/358013",
      "kind": "water"
    },
    {
      "id": "water-relation-56833",
      "ref": "relation/56833",
      "kind": "water"
    },
    {
      "id": "water-way-12507317",
      "ref": "way/12507317",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
