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
  "name": "Istanbul",
  "box": [
    40.82550011006602,
    28.720181619192175,
    41.283918044496694,
    29.214605842962158
  ],
  "core": [
    40.961160777516504,
    28.91631114773655,
    41.05160122248349,
    29.03543185226345
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/27609492",
      "line": "Ayvansaray, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/276462508",
      "line": "beyti lokanta, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/5285477246",
      "line": "Halki seminary, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/399306293",
      "line": "Ataşehir Memorial Hastanesi, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/41724831",
      "line": "Bebek Parkı, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/162139987",
      "line": "Carousel Alışveriş ve Yaşam Merkezi, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/317507205",
      "line": "Arnavutköy Osmanlı Camii, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/6458152384",
      "line": "Rıhtım Meydanı; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/341045630",
      "line": "Anadolu Palace of Justice, a mapped place for the game."
    },
    {
      "key": "osm-way-1491971480",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1491971480",
      "line": "Koç University, a mapped place for the game."
    },
    {
      "key": "osm-way-121462312",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/121462312",
      "line": "Atatürk Olympic Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-48162658",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/48162658",
      "line": "Uzun Aqueduct, a mapped place for the game."
    },
    {
      "key": "osm-way-1015392049",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1015392049",
      "line": "Bahçeköy Aqueduct, a mapped place for the game."
    },
    {
      "key": "osm-way-969480621",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/969480621",
      "line": "Mazul Kemer, a mapped place for the game."
    },
    {
      "key": "osm-way-989152604",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/989152604",
      "line": "Beykoz Korusu, a mapped place for the game."
    },
    {
      "key": "osm-way-791438790",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/791438790",
      "line": "İbn Haldun Üniversitesi, a mapped place for the game."
    },
    {
      "key": "osm-way-342828509",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/342828509",
      "line": "RAMS Park, a mapped place for the game."
    },
    {
      "key": "osm-way-1365047639",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1365047639",
      "line": "Şamlar Köyü Camii, a mapped place for the game."
    },
    {
      "key": "osm-relation-9948513",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/9948513",
      "line": "Büyük Çamlıca, a mapped place for the game."
    },
    {
      "key": "osm-way-475513360",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/475513360",
      "line": "Mimar Sinan Güzel Sanatlar Üniversitesi Dolmabahçe Yerleşkesi, a mapped place for the game."
    },
    {
      "key": "osm-node-4735960522",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4735960522",
      "line": "Saint Mary, a mapped place for the game."
    },
    {
      "key": "osm-way-401781146",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/401781146",
      "line": "Forum Istanbul Shopping and Life Center, a mapped place for the game."
    },
    {
      "key": "osm-way-159932934",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/159932934",
      "line": "Maltepe Hasan Polat Stadyumu, a mapped place for the game."
    },
    {
      "key": "osm-way-388925021",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/388925021",
      "line": "Olivium Outlet Center, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12027845820",
      "ref": "node/12027845820",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12206512417",
      "ref": "node/12206512417",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14040461121",
      "ref": "node/14040461121",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1451461467",
      "ref": "node/1451461467",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1485190885",
      "ref": "node/1485190885",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1485190972",
      "ref": "node/1485190972",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1496720876",
      "ref": "node/1496720876",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1690546203",
      "ref": "node/1690546203",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1751591929",
      "ref": "node/1751591929",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758438520",
      "ref": "node/1758438520",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758438524",
      "ref": "node/1758438524",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758438527",
      "ref": "node/1758438527",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758441314",
      "ref": "node/1758441314",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758441315",
      "ref": "node/1758441315",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758441898",
      "ref": "node/1758441898",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758445986",
      "ref": "node/1758445986",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758448695",
      "ref": "node/1758448695",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1758448699",
      "ref": "node/1758448699",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-17045554",
      "ref": "relation/17045554",
      "kind": "water"
    },
    {
      "id": "water-relation-20065163",
      "ref": "relation/20065163",
      "kind": "water"
    },
    {
      "id": "water-relation-2920345",
      "ref": "relation/2920345",
      "kind": "water"
    },
    {
      "id": "water-relation-2935606",
      "ref": "relation/2935606",
      "kind": "water"
    }
  ],
  "sceneWaterExtent": "play",
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
