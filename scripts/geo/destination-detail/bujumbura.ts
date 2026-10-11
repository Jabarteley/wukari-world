import type { DetailConfig } from './config.ts';
import { extrasQuery, inlandWaterQuery, landuseQuery, placesQuery, roadsQuery } from './queries.ts';

export const CONFIG: DetailConfig = {
  "name": "Bujumbura",
  "box": [
    -3.48,
    29.24,
    -3.28,
    29.48
  ],
  "core": [
    -3.415,
    29.315,
    -3.345,
    29.405
  ],
  "cell": 0.004,
  "grow": 2,
  "split": 12,
  "shore": 0,
  "minHole": 40,
  "minRoadKm": 0.7,
  "maxRoads": 700,
  "roadMarginDegrees": 0.004,
  "surround": "#aed48c",
  "boundaryNote": "the built-up extent of Bujumbura traced from mapped land use, not an administrative boundary",
  "terrainNote": "the actual mapped Lake Tanganyika multipolygon and river water, main roads and named neighbourhoods",
  "source": "OpenStreetMap contributors via the dated Geofabrik Burundi PBF",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "places": [
    {
      "ref": "node/1344199948",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "line": "A bus station; check the game travel routes here.",
      "slot": "transit"
    },
    {
      "ref": "node/1421688665",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "line": "A café; the game meal stop is set here.",
      "slot": "meal"
    },
    {
      "ref": "way/86783420",
      "kind": "office",
      "category": "work",
      "icon": "school",
      "line": "A university campus; the game community activities and starter shifts are set here.",
      "slot": "community"
    },
    {
      "ref": "way/995561196",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "line": "A hospital; the game clinic activities are set here.",
      "slot": "clinic"
    },
    {
      "ref": "way/29863497",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "line": "A public garden; rest or play chess in the game.",
      "slot": "recreation"
    },
    {
      "ref": "way/193688452",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "line": "A market; browse the game market stop here.",
      "slot": "market"
    },
    {
      "ref": "way/92028037",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "line": "A cathedral; rest and reflect in the game.",
      "slot": "worship"
    },
    {
      "ref": "way/46692291",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "line": "A public square; the voting desk is fictional game activity, not an election office.",
      "slot": "polling"
    },
    {
      "ref": "node/1423132686",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "line": "City hall; the game notice board is fictional activity, not a government service.",
      "slot": "government"
    },
    {
      "ref": "way/425918156",
      "kind": "walk",
      "category": "fun",
      "icon": "museum",
      "line": "A museum; walk through its exhibits.",
      "key": "musee-vivant"
    },
    {
      "ref": "way/10630191",
      "kind": "viewing",
      "category": "fun",
      "icon": "ball",
      "line": "A stadium; watch from the stands.",
      "key": "stade-intwari"
    },
    {
      "ref": "way/124316871",
      "kind": "quad",
      "category": "fun",
      "icon": "school",
      "line": "A university; walk the campus.",
      "key": "universite-burundi"
    },
    {
      "ref": "way/996823322",
      "kind": "quad",
      "category": "fun",
      "icon": "school",
      "line": "A university; walk the campus.",
      "key": "international-university"
    },
    {
      "ref": "way/1006372439",
      "kind": "quad",
      "category": "fun",
      "icon": "school",
      "line": "A university; walk the campus.",
      "key": "hope-africa-university"
    },
    {
      "ref": "node/2024913123",
      "kind": "walk",
      "category": "fun",
      "icon": "museum",
      "line": "An arts venue; look around in the game.",
      "key": "palais-arts"
    },
    {
      "ref": "node/3307131783",
      "kind": "walk",
      "category": "fun",
      "icon": "school",
      "line": "A library; explore its reading space.",
      "key": "american-corner"
    },
    {
      "ref": "way/46753243",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "line": "A public square; take a break.",
      "key": "place-revolution"
    },
    {
      "ref": "node/3410127488",
      "kind": "market",
      "category": "fun",
      "icon": "market",
      "line": "A market; browse its stalls.",
      "key": "marche-cotebu"
    },
    {
      "ref": "node/1347849746",
      "kind": "market",
      "category": "fun",
      "icon": "market",
      "line": "A market; browse its stalls.",
      "key": "marche-ngagara"
    },
    {
      "ref": "node/3410043375",
      "kind": "market",
      "category": "fun",
      "icon": "market",
      "line": "A market; browse its stalls.",
      "key": "marche-kinindo"
    },
    {
      "ref": "way/122023255",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "line": "A church; rest and reflect.",
      "key": "eglise-orthodoxe"
    },
    {
      "ref": "way/122957062",
      "kind": "quad",
      "category": "fun",
      "icon": "school",
      "line": "A campus; explore its grounds.",
      "key": "campus-kamenge"
    }
  ],
  "names": [
    {
      "id": "kinama",
      "ref": "node/589899697",
      "kind": "neighbourhood"
    },
    {
      "id": "mutakura",
      "ref": "node/589900393",
      "kind": "neighbourhood"
    },
    {
      "id": "quartier-industriel",
      "ref": "node/589900420",
      "kind": "neighbourhood"
    },
    {
      "id": "buyenzi",
      "ref": "node/589900708",
      "kind": "neighbourhood"
    },
    {
      "id": "kwijabe",
      "ref": "node/589900735",
      "kind": "neighbourhood"
    },
    {
      "id": "bwiza",
      "ref": "node/589900761",
      "kind": "neighbourhood"
    },
    {
      "id": "rohero-ii",
      "ref": "node/589900972",
      "kind": "neighbourhood"
    },
    {
      "id": "rohero-i",
      "ref": "node/589900974",
      "kind": "neighbourhood"
    },
    {
      "id": "vugizo",
      "ref": "node/589900976",
      "kind": "neighbourhood"
    },
    {
      "id": "kabondo",
      "ref": "node/589900979",
      "kind": "neighbourhood"
    },
    {
      "id": "kinindo",
      "ref": "node/589900986",
      "kind": "neighbourhood"
    },
    {
      "id": "musaga",
      "ref": "node/589900990",
      "kind": "neighbourhood"
    },
    {
      "id": "mutanga-sud",
      "ref": "node/1343529639",
      "kind": "neighbourhood"
    },
    {
      "id": "mutanga-nord",
      "ref": "node/1343529641",
      "kind": "neighbourhood"
    },
    {
      "id": "ngagara",
      "ref": "node/1343657773",
      "kind": "neighbourhood"
    },
    {
      "id": "kigobe",
      "ref": "node/1347805866",
      "kind": "neighbourhood"
    },
    {
      "id": "gasenyi",
      "ref": "node/1347805867",
      "kind": "neighbourhood"
    },
    {
      "id": "mirango",
      "ref": "node/1347805868",
      "kind": "neighbourhood"
    },
    {
      "id": "gihosha",
      "ref": "node/1347805870",
      "kind": "neighbourhood"
    },
    {
      "id": "carama",
      "ref": "node/1347941598",
      "kind": "neighbourhood"
    },
    {
      "id": "buterere",
      "ref": "node/1347941601",
      "kind": "neighbourhood"
    },
    {
      "id": "bukirasazi",
      "ref": "node/1347941629",
      "kind": "neighbourhood"
    },
    {
      "id": "kibenga",
      "ref": "node/1348273458",
      "kind": "neighbourhood"
    },
    {
      "id": "kamenge",
      "ref": "node/1348971473",
      "kind": "neighbourhood"
    },
    {
      "id": "nyakabiga",
      "ref": "node/1348971492",
      "kind": "neighbourhood"
    },
    {
      "id": "kiriri",
      "ref": "node/1349283321",
      "kind": "neighbourhood"
    },
    {
      "id": "plage",
      "ref": "node/1354650543",
      "kind": "neighbourhood"
    },
    {
      "id": "quartier-inss",
      "ref": "node/1424105035",
      "kind": "neighbourhood"
    },
    {
      "id": "building-bata",
      "ref": "node/1424113918",
      "kind": "neighbourhood"
    },
    {
      "id": "zeimet",
      "ref": "node/1424113928",
      "kind": "neighbourhood"
    },
    {
      "id": "cibitoke",
      "ref": "way/342902986",
      "kind": "neighbourhood"
    },
    {
      "id": "mukaza",
      "ref": "node/5810460940",
      "kind": "neighbourhood"
    },
    {
      "id": "kinanira",
      "ref": "node/12548042515",
      "kind": "neighbourhood"
    }
  ],
  discovery: (bbox) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
  landuse: landuseQuery,
  water: inlandWaterQuery,
  roads: roadsQuery,
};
