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
  "maxRoads": 500,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Seoul",
  "box": [
    37.38579821006602,
    126.43967634777182,
    37.74755998993398,
    127.2055061214048
  ],
  "core": [
    37.52145887751651,
    126.92159149876869,
    37.611899322483495,
    127.03499130123132
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/355172758",
      "line": "Jegi-dong, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/13874911724",
      "line": "Mega Coffee, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/368656330",
      "line": "Uijeongbu Digital Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/417994820",
      "line": "Samsung Medical Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/64933046",
      "line": "Paris Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/306956698",
      "line": "Mecenatpolis, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/13938380101",
      "line": "SSPX Korea Immaculate Conception Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/472113204",
      "line": "Bukahyeondong Community Service Center; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/238024537",
      "line": "Incheon City Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-1463915497",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1463915497",
      "line": "국제법률경영대학원대학교, a mapped place for the game."
    },
    {
      "key": "osm-way-613824923",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/613824923",
      "line": "Goyang Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-8573225768",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8573225768",
      "line": "호암산성, a mapped place for the game."
    },
    {
      "key": "osm-node-11469141023",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11469141023",
      "line": "가운동 지석묘, a mapped place for the game."
    },
    {
      "key": "osm-way-872196107",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/872196107",
      "line": "Namhansanseong Emergency Palace, a mapped place for the game."
    },
    {
      "key": "osm-way-231020902",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/231020902",
      "line": "Jayu Park, a mapped place for the game."
    },
    {
      "key": "osm-way-381119781",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/381119781",
      "line": "Sahmyook University, a mapped place for the game."
    },
    {
      "key": "osm-way-336024475",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/336024475",
      "line": "Korea Aerospace University, a mapped place for the game."
    },
    {
      "key": "osm-way-1080852337",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1080852337",
      "line": "Gogang dong Church, a mapped place for the game."
    },
    {
      "key": "osm-way-419363587",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/419363587",
      "line": "Amsa-dong Prehistoric Settlement Site, a mapped place for the game."
    },
    {
      "key": "osm-node-368860625",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/368860625",
      "line": "Yonggungsa, a mapped place for the game."
    },
    {
      "key": "osm-way-258637347",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/258637347",
      "line": "Gocheok Sky Dome, a mapped place for the game."
    },
    {
      "key": "osm-way-658766450",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/658766450",
      "line": "Tancheon Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-416586666",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/416586666",
      "line": "삼육의료원 서울병원, a mapped place for the game."
    },
    {
      "key": "osm-way-26281660",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/26281660",
      "line": "Lotte World, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11603080088",
      "ref": "node/11603080088",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12175329141",
      "ref": "node/12175329141",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12175329142",
      "ref": "node/12175329142",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12175329143",
      "ref": "node/12175329143",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13527734045",
      "ref": "node/13527734045",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13610701416",
      "ref": "node/13610701416",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13655649343",
      "ref": "node/13655649343",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1992113830",
      "ref": "node/1992113830",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2879168504",
      "ref": "node/2879168504",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3830221573",
      "ref": "node/3830221573",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153590",
      "ref": "node/415153590",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153596",
      "ref": "node/415153596",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153599",
      "ref": "node/415153599",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153630",
      "ref": "node/415153630",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153651",
      "ref": "node/415153651",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153653",
      "ref": "node/415153653",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153655",
      "ref": "node/415153655",
      "kind": "neighbourhood"
    },
    {
      "id": "district-415153660",
      "ref": "node/415153660",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-152336",
      "ref": "relation/152336",
      "kind": "water"
    },
    {
      "id": "water-relation-16259781",
      "ref": "relation/16259781",
      "kind": "water"
    },
    {
      "id": "water-relation-17800645",
      "ref": "relation/17800645",
      "kind": "water"
    },
    {
      "id": "water-relation-3769500",
      "ref": "relation/3769500",
      "kind": "water"
    },
    {
      "id": "water-relation-7935721",
      "ref": "relation/7935721",
      "kind": "water"
    },
    {
      "id": "water-relation-9035438",
      "ref": "relation/9035438",
      "kind": "water"
    },
    {
      "id": "water-way-227179331",
      "ref": "way/227179331",
      "kind": "water"
    },
    {
      "id": "water-way-367287220",
      "ref": "way/367287220",
      "kind": "water"
    },
    {
      "id": "water-way-37220900",
      "ref": "way/37220900",
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
