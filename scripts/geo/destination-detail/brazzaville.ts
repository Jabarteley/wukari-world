import type { DetailConfig } from './config.ts';
import { extrasQuery, inlandWaterQuery, landuseQuery, placesQuery, roadsQuery } from './queries.ts';

export const CONFIG: DetailConfig = {
  name: 'Brazzaville',
  box: [-4.36, 15.16, -4.16, 15.4],
  core: [-4.295, 15.235, -4.225, 15.325],
  discovery: (bbox) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
  landuse: landuseQuery,
  cell: 0.004,
  grow: 2,
  split: 12,
  shore: 1,
  minHole: 40,
  minRoadKm: 0.7,
  maxRoads: 700,
  roadMarginDegrees: 0.004,
  minWaterKm2: 0.4,
  surround: '#b4d08f',
  water: inlandWaterQuery,
  roads: roadsQuery,
  boundaryNote: 'the built-up extent of Brazzaville, from the mapped land use',
  terrainNote: 'the Congo River and inland water mapped as water, and the motorway, trunk and primary roads of the box plus named secondary roads in the core.',
  source: 'OpenStreetMap contributors via the dated Geofabrik Republic of the Congo PBF',
  outlineTolerance: 0.0003,
  waterTolerance: 0.0003,
  farTolerance: 0.0008,
  coreTolerance: 0.0004,
  places: [
  {
    "slot": "transit",
    "ref": "node/3748007971",
    "kind": "hub",
    "category": "civic",
    "icon": "bus",
    "line": "A bus station; check the road journeys available in the game."
  },
  {
    "slot": "meal",
    "ref": "node/3725418819",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A café; the game meal counter is set here."
  },
  {
    "slot": "community",
    "ref": "way/368806390",
    "kind": "office",
    "category": "work",
    "icon": "school",
    "line": "A university; the game sets community activities and starter work shifts here."
  },
  {
    "slot": "clinic",
    "ref": "way/368809377",
    "kind": "hospital",
    "category": "care",
    "icon": "health",
    "line": "A hospital; game clinic activities are set here."
  },
  {
    "slot": "recreation",
    "ref": "way/364766139",
    "kind": "park",
    "category": "fun",
    "icon": "park",
    "line": "A public esplanade for a free break and a game of chess."
  },
  {
    "slot": "market",
    "ref": "node/3725889187",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A market; the game market stop is set here."
  },
  {
    "slot": "worship",
    "ref": "way/50491968",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A basilica; rest and reflect in the game."
  },
  {
    "slot": "polling",
    "ref": "node/3291519892",
    "kind": "polling",
    "category": "civic",
    "icon": "poll",
    "line": "A town hall; the voting desk here is fictional game activity, not an election office."
  },
  {
    "slot": "government",
    "ref": "way/370986947",
    "kind": "statehouse",
    "category": "civic",
    "icon": "civic",
    "line": "The city hall; the game notice board is fictional activity, not a government service."
  },
  {
    "key": "brazza-memorial",
    "ref": "way/370986946",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "congo-gallery",
    "ref": "node/3725455994",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "felix-eboue-stadium",
    "ref": "way/48986326",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "massamba-debat-stadium",
    "ref": "way/325722883",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "michel-dornano-gymnasium",
    "ref": "way/55685712",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "arts-and-crafts",
    "ref": "way/694114716",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "national-library",
    "ref": "way/1026525114",
    "kind": "walk",
    "category": "fun",
    "icon": "school",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "palais-des-congres",
    "ref": "way/55685714",
    "kind": "walk",
    "category": "fun",
    "icon": "civic",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "grand-fleuve",
    "ref": "way/477506458",
    "kind": "mall",
    "category": "fun",
    "icon": "market",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "brazza-mall",
    "ref": "way/1381284135",
    "kind": "mall",
    "category": "fun",
    "icon": "market",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "isg-university",
    "ref": "way/483285672",
    "kind": "quad",
    "category": "fun",
    "icon": "school",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "protestant-university",
    "ref": "way/1358118381",
    "kind": "quad",
    "category": "fun",
    "icon": "school",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "sacre-coeur",
    "ref": "way/731643099",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "place-rotary",
    "ref": "way/364766149",
    "kind": "walk",
    "category": "fun",
    "icon": "park",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "marien-ngouabi-esplanade",
    "ref": "way/364766140",
    "kind": "walk",
    "category": "fun",
    "icon": "park",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "nkombo-market",
    "ref": "way/595453407",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "moukondo-market",
    "ref": "way/766337897",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A real named place; visitor activities here are fictional game content."
  }
],
  names: [
  {
    "id": "district-29827644",
    "ref": "node/29827644",
    "kind": "neighbourhood"
  },
  {
    "id": "district-435984270",
    "ref": "node/435984270",
    "kind": "neighbourhood"
  },
  {
    "id": "district-436070754",
    "ref": "node/436070754",
    "kind": "neighbourhood"
  },
  {
    "id": "district-1538403250",
    "ref": "node/1538403250",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3291596705",
    "ref": "node/3291596705",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3295642804",
    "ref": "node/3295642804",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3295662334",
    "ref": "node/3295662334",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3295662335",
    "ref": "node/3295662335",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3300966998",
    "ref": "node/3300966998",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3300967740",
    "ref": "node/3300967740",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3300968378",
    "ref": "node/3300968378",
    "kind": "neighbourhood"
  },
  {
    "id": "district-3653951816",
    "ref": "node/3653951816",
    "kind": "neighbourhood"
  },
  {
    "id": "district-6412187193",
    "ref": "node/6412187193",
    "kind": "neighbourhood"
  },
  {
    "id": "district-6412187195",
    "ref": "node/6412187195",
    "kind": "neighbourhood"
  },
  {
    "id": "district-11210621438",
    "ref": "node/11210621438",
    "kind": "neighbourhood"
  },
  {
    "id": "district-11214284926",
    "ref": "node/11214284926",
    "kind": "neighbourhood"
  },
  {
    "id": "district-12573657387",
    "ref": "node/12573657387",
    "kind": "neighbourhood"
  }
],
};
