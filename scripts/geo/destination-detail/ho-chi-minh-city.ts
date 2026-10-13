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
  "name": "Ho Chi Minh City",
  "box": [
    10.59284521006602,
    106.53360400569034,
    10.954606989933978,
    106.89959759430965
  ],
  "core": [
    10.728505877516504,
    106.6708724302041,
    10.818946322483495,
    106.76232916979589
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/2893771497",
      "line": "Gò Vấp, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2672490173",
      "line": "Cà Phê 39A, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/290134801",
      "line": "Ton Duc Thang University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/493155228",
      "line": "CI Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/500888743",
      "line": "Tao Dan Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/39514795",
      "line": "Ben Thanh Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/366069915",
      "line": "Hoang Phap Temple, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/341504305",
      "line": "Ho Chi Minh City Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4545131791",
      "line": "UBND phường Dĩ An, a mapped place for the game."
    },
    {
      "key": "osm-way-306440163",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/306440163",
      "line": "Saigon International University, a mapped place for the game."
    },
    {
      "key": "osm-way-665450065",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/665450065",
      "line": "Thong Nhat Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-463548000",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/463548000",
      "line": "Khu du lịch Suối Tiên, a mapped place for the game."
    },
    {
      "key": "osm-way-516639172",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/516639172",
      "line": "Trường Đại học Lao động - Xã hội (cơ sở 2), a mapped place for the game."
    },
    {
      "key": "osm-way-1023330892",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1023330892",
      "line": "Ho Chi Minh City University of Culture, a mapped place for the game."
    },
    {
      "key": "osm-way-198047671",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/198047671",
      "line": "Bệnh viện Thống Nhất, a mapped place for the game."
    },
    {
      "key": "osm-way-32735046",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/32735046",
      "line": "Công viên Văn hóa Đầm Sen, a mapped place for the game."
    },
    {
      "key": "osm-way-503561771",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/503561771",
      "line": "Chùa Linh Phước, a mapped place for the game."
    },
    {
      "key": "osm-way-494789249",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/494789249",
      "line": "Vinh Nghiem Pagoda, a mapped place for the game."
    },
    {
      "key": "osm-way-613756783",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/613756783",
      "line": "Quân khu 7 Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1529292331",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1529292331",
      "line": "Hospital for Tropical Diseases, a mapped place for the game."
    },
    {
      "key": "osm-way-32735038",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/32735038",
      "line": "Saigon Zoo and Botanical Gardens, a mapped place for the game."
    },
    {
      "key": "osm-way-32735082",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/32735082",
      "line": "Le Van Tam Park, a mapped place for the game."
    },
    {
      "key": "osm-way-808022726",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/808022726",
      "line": "Ho Chi Minh Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-806860787",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/806860787",
      "line": "Dan Sinh market, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12343185261",
      "ref": "node/12343185261",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12343185263",
      "ref": "node/12343185263",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12343185264",
      "ref": "node/12343185264",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12343185267",
      "ref": "node/12343185267",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019716",
      "ref": "node/12474019716",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019734",
      "ref": "node/12474019734",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019738",
      "ref": "node/12474019738",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019739",
      "ref": "node/12474019739",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019744",
      "ref": "node/12474019744",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019745",
      "ref": "node/12474019745",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019767",
      "ref": "node/12474019767",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019832",
      "ref": "node/12474019832",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019839",
      "ref": "node/12474019839",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019849",
      "ref": "node/12474019849",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019851",
      "ref": "node/12474019851",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019852",
      "ref": "node/12474019852",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019853",
      "ref": "node/12474019853",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12474019856",
      "ref": "node/12474019856",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-13482660",
      "ref": "relation/13482660",
      "kind": "water"
    },
    {
      "id": "water-relation-13554320",
      "ref": "relation/13554320",
      "kind": "water"
    },
    {
      "id": "water-relation-19997528",
      "ref": "relation/19997528",
      "kind": "water"
    },
    {
      "id": "water-relation-2757154",
      "ref": "relation/2757154",
      "kind": "water"
    },
    {
      "id": "water-relation-3515389",
      "ref": "relation/3515389",
      "kind": "water"
    },
    {
      "id": "water-relation-3799819",
      "ref": "relation/3799819",
      "kind": "water"
    },
    {
      "id": "water-relation-3850169",
      "ref": "relation/3850169",
      "kind": "water"
    },
    {
      "id": "water-relation-3850170",
      "ref": "relation/3850170",
      "kind": "water"
    },
    {
      "id": "water-relation-3850487",
      "ref": "relation/3850487",
      "kind": "water"
    },
    {
      "id": "water-relation-3859102",
      "ref": "relation/3859102",
      "kind": "water"
    },
    {
      "id": "water-way-165829391",
      "ref": "way/165829391",
      "kind": "water"
    },
    {
      "id": "water-way-173920078",
      "ref": "way/173920078",
      "kind": "water"
    },
    {
      "id": "water-way-173920117",
      "ref": "way/173920117",
      "kind": "water"
    },
    {
      "id": "water-way-173920122",
      "ref": "way/173920122",
      "kind": "water"
    },
    {
      "id": "water-way-318323211",
      "ref": "way/318323211",
      "kind": "water"
    },
    {
      "id": "water-way-32667220",
      "ref": "way/32667220",
      "kind": "water"
    },
    {
      "id": "water-way-32680133",
      "ref": "way/32680133",
      "kind": "water"
    },
    {
      "id": "water-way-510783935",
      "ref": "way/510783935",
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
