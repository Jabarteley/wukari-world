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
  "name": "Manila",
  "box": [
    14.409568310066021,
    120.7945592842074,
    14.77133008993398,
    121.16616491579259
  ],
  "core": [
    14.545228977516505,
    120.93394024765352,
    14.635669422483495,
    121.02678395234646
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/5377269277",
      "line": "Katipunan, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/12647066223",
      "line": "Zus Coffee, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/23378044",
      "line": "San Beda College Alabang, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/29353952",
      "line": "St. Luke's Medical Center Global City, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/16132673",
      "line": "Valenzuela People's Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/261385828",
      "line": "SM Center Angono, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/168831685",
      "line": "Saint Mary Magdalene Parish Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/233133013",
      "line": "Rodriguez Municipal Hall; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/36691595",
      "line": "Batasang Pambansa Complex, a mapped place for the game."
    },
    {
      "key": "osm-way-165717167",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/165717167",
      "line": "La Consolacion College of Novaliches, a mapped place for the game."
    },
    {
      "key": "osm-way-368600427",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/368600427",
      "line": "SM Mall of Asia Arena, a mapped place for the game."
    },
    {
      "key": "osm-node-1782932802",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1782932802",
      "line": "Battle of Zapote River, a mapped place for the game."
    },
    {
      "key": "osm-way-70411261",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/70411261",
      "line": "Taguig City University, a mapped place for the game."
    },
    {
      "key": "osm-way-41374806",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/41374806",
      "line": "Our Lady of the Annunciation Parish, a mapped place for the game."
    },
    {
      "key": "osm-way-28921378",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/28921378",
      "line": "Cainta Church, a mapped place for the game."
    },
    {
      "key": "osm-way-1234015855",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1234015855",
      "line": "Musoleo De Los Veteranos De La Revolucion, a mapped place for the game."
    },
    {
      "key": "osm-way-223179404",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/223179404",
      "line": "MCCID College of Technology, a mapped place for the game."
    },
    {
      "key": "osm-way-308687760",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/308687760",
      "line": "Old Meycauayan Station, a mapped place for the game."
    },
    {
      "key": "osm-way-108541189",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/108541189",
      "line": "Playtime Filoil Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-1435976373",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/1435976373",
      "line": "The Medical City, a mapped place for the game."
    },
    {
      "key": "osm-way-280162481",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/280162481",
      "line": "Felix Y. Manalo National Historical Landmark, a mapped place for the game."
    },
    {
      "key": "osm-way-319524305",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/319524305",
      "line": "168 Shopping Mall, a mapped place for the game."
    },
    {
      "key": "osm-way-51549859",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/51549859",
      "line": "SM City Fairview, a mapped place for the game."
    },
    {
      "key": "osm-way-231404558",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/231404558",
      "line": "Philippine Children's Medical Center, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1061286634",
      "ref": "node/1061286634",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1067419276",
      "ref": "node/1067419276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1068735293",
      "ref": "node/1068735293",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1068735295",
      "ref": "node/1068735295",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1068735297",
      "ref": "node/1068735297",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1068735298",
      "ref": "node/1068735298",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076444419",
      "ref": "node/1076444419",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076444420",
      "ref": "node/1076444420",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076487791",
      "ref": "node/1076487791",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076645355",
      "ref": "node/1076645355",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076645356",
      "ref": "node/1076645356",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1076645357",
      "ref": "node/1076645357",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1080105334",
      "ref": "node/1080105334",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1080105341",
      "ref": "node/1080105341",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1080105342",
      "ref": "node/1080105342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11115404684",
      "ref": "node/11115404684",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1148329835",
      "ref": "node/1148329835",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1171659523",
      "ref": "node/1171659523",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2505038",
      "ref": "relation/2505038",
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
