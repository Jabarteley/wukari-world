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
  "name": "Bratislava",
  "box": [
    47.96262171006602,
    16.838082391051863,
    48.32438348993398,
    17.37849100894814
  ],
  "core": [
    48.098282377516504,
    17.04091462693609,
    48.18872282248349,
    17.175658773063912
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/668119151",
      "line": "Bratislava predmestie, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/378574918",
      "line": "UFO, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/799366809",
      "line": "Fakulta sociálnych a ekonomických vied UK, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/778564760",
      "line": "Psychiatrická nemocnica Philippa Pinela Pezinok, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/4345760",
      "line": "Zámocký Park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/8504516",
      "line": "Bory Mall, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/49293383",
      "line": "Kostol svätého Michala, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/8246322",
      "line": "Námestie sv. Trojice; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/61630694",
      "line": "Mestský úrad v Šamoríne, a mapped place for the game."
    },
    {
      "key": "osm-way-242774480",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/242774480",
      "line": "Faculty of Mathematics, Physics and Informatics - Comenius University, a mapped place for the game."
    },
    {
      "key": "osm-way-1178108642",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1178108642",
      "line": "Stadium FC Petržalka 1898, a mapped place for the game."
    },
    {
      "key": "osm-relation-3416687",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/3416687",
      "line": "Eberhard, a mapped place for the game."
    },
    {
      "key": "osm-way-258662338",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/258662338",
      "line": "Kostol sv. Anny, a mapped place for the game."
    },
    {
      "key": "osm-way-150644741",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/150644741",
      "line": "Biely Kameň, a mapped place for the game."
    },
    {
      "key": "osm-node-302428961",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/302428961",
      "line": "Dračí hrádok, a mapped place for the game."
    },
    {
      "key": "osm-way-170458693",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/170458693",
      "line": "Kostol Ducha Svätého, a mapped place for the game."
    },
    {
      "key": "osm-node-27672692",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/27672692",
      "line": "Academy of the Police Force in Bratislava, a mapped place for the game."
    },
    {
      "key": "osm-way-273342996",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/273342996",
      "line": "Cirkevné konzervatórium v Bratislave, a mapped place for the game."
    },
    {
      "key": "osm-way-5215299",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/5215299",
      "line": "Market Hall, a mapped place for the game."
    },
    {
      "key": "osm-way-23963145",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/23963145",
      "line": "Národný onkologický ústav, a mapped place for the game."
    },
    {
      "key": "osm-way-24985922",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24985922",
      "line": "Obchodné centrum Galéria, a mapped place for the game."
    },
    {
      "key": "osm-way-15104547",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/15104547",
      "line": "Vladimír Dzurilla Ice Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1051649120",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1051649120",
      "line": "štadión FC ŠTK 1914 Šamorín, a mapped place for the game."
    },
    {
      "key": "osm-way-216958979",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/216958979",
      "line": "Lippayova záhrada, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10043247334",
      "ref": "node/10043247334",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10244173216",
      "ref": "node/10244173216",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1038300945",
      "ref": "node/1038300945",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1038302574",
      "ref": "node/1038302574",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1038302581",
      "ref": "node/1038302581",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1081843191",
      "ref": "node/1081843191",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1081843197",
      "ref": "node/1081843197",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1081848161",
      "ref": "node/1081848161",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1081848168",
      "ref": "node/1081848168",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1081848171",
      "ref": "node/1081848171",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1081848174",
      "ref": "node/1081848174",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082323635",
      "ref": "node/1082323635",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082323639",
      "ref": "node/1082323639",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082323642",
      "ref": "node/1082323642",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082336264",
      "ref": "node/1082336264",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082336280",
      "ref": "node/1082336280",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082336292",
      "ref": "node/1082336292",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1082336305",
      "ref": "node/1082336305",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-17709",
      "ref": "relation/17709",
      "kind": "water"
    },
    {
      "id": "water-relation-3062407",
      "ref": "relation/3062407",
      "kind": "water"
    },
    {
      "id": "water-relation-8331570",
      "ref": "relation/8331570",
      "kind": "water"
    },
    {
      "id": "water-way-4721928",
      "ref": "way/4721928",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
