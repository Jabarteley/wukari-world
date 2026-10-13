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
  "name": "Warsaw",
  "box": [
    52.05107721006602,
    20.712181006214685,
    52.41283898993398,
    21.30126879378531
  ],
  "core": [
    52.18673787751651,
    20.933314529370627,
    52.27717832248349,
    21.08013527062937
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/33210583",
      "line": "Warsaw East, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/226544896",
      "line": "Jeff's, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/1945019192",
      "line": "Miejska Biblioteka Publiczna w Legionowie, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/40370104",
      "line": "Centrum Zdrowia Dziecka, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/22987815",
      "line": "Park przy Bażantarni, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/695633081",
      "line": "Nowa Stacja, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/131905205",
      "line": "Kościół pw. Świętej Trójcy, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1083027481",
      "line": "Plac Konfederacji; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/558576563",
      "line": "Agencja Restrukturyzacji i Modernizacji Rolnictwa, a mapped place for the game."
    },
    {
      "key": "osm-way-110020158",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/110020158",
      "line": "Polska Akademia Nauk Centrum Badań Ekologicznych, a mapped place for the game."
    },
    {
      "key": "osm-way-256477802",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/256477802",
      "line": "Ząbki Dozbud Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-5111535",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/5111535",
      "line": "Cmentarz Palmiry, a mapped place for the game."
    },
    {
      "key": "osm-way-401557317",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/401557317",
      "line": "Kościół pw. Chrystusa Najwyższego Kapłana, a mapped place for the game."
    },
    {
      "key": "osm-way-124771239",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/124771239",
      "line": "Pałac w Falentach, a mapped place for the game."
    },
    {
      "key": "osm-way-173534115",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/173534115",
      "line": "Dwór Wielopolskich i Potulickich, a mapped place for the game."
    },
    {
      "key": "osm-way-271202947",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/271202947",
      "line": "Kościół pw. św. Rocha, a mapped place for the game."
    },
    {
      "key": "osm-way-23771865",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/23771865",
      "line": "Park Kombatantów, a mapped place for the game."
    },
    {
      "key": "osm-way-1025962496",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1025962496",
      "line": "Stadion GOS-u w Nadarzynie, a mapped place for the game."
    },
    {
      "key": "osm-way-693882871",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/693882871",
      "line": "CEZAMAT, a mapped place for the game."
    },
    {
      "key": "osm-way-339846775",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/339846775",
      "line": "War Studies University, a mapped place for the game."
    },
    {
      "key": "osm-way-326736657",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/326736657",
      "line": "Park Fosa, a mapped place for the game."
    },
    {
      "key": "osm-way-24924674",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24924674",
      "line": "G City Targówek, a mapped place for the game."
    },
    {
      "key": "osm-way-24279875",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/24279875",
      "line": "Targowisko na Szembeka, a mapped place for the game."
    },
    {
      "key": "osm-way-23498828",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23498828",
      "line": "Tor Stegny, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11063245750",
      "ref": "node/11063245750",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1255610693",
      "ref": "node/1255610693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12731540155",
      "ref": "node/12731540155",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13241204062",
      "ref": "node/13241204062",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1327199412",
      "ref": "node/1327199412",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13719518205",
      "ref": "node/13719518205",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1611708776",
      "ref": "node/1611708776",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1613244778",
      "ref": "node/1613244778",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1987380947",
      "ref": "node/1987380947",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1991375671",
      "ref": "node/1991375671",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1997329810",
      "ref": "node/1997329810",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2038163497",
      "ref": "node/2038163497",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2038163498",
      "ref": "node/2038163498",
      "kind": "neighbourhood"
    },
    {
      "id": "district-218097449",
      "ref": "node/218097449",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2331850934",
      "ref": "node/2331850934",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2441123200",
      "ref": "node/2441123200",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2569525772",
      "ref": "node/2569525772",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2569525774",
      "ref": "node/2569525774",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
