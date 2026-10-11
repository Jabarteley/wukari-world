import type { DetailConfig } from './config.ts';
import { extrasQuery, inlandWaterQuery, landuseQuery, placesQuery, roadsQuery } from './queries.ts';

export const CONFIG: DetailConfig = {
  name: 'Kinshasa',
  box: [-4.55, 15.15, -4.20, 15.60],
  core: [-4.42, 15.20, -4.28, 15.38],
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
  boundaryNote: 'the built-up extent of Kinshasa, from the mapped land use',
  terrainNote: 'the Congo River and inland water mapped as water, and the motorway, trunk and primary roads of the box plus named secondary roads in the core.',
  source: 'OpenStreetMap contributors via the dated Geofabrik Democratic Republic of the Congo PBF',
  outlineTolerance: 0.0003,
  waterTolerance: 0.0003,
  farTolerance: 0.0008,
  coreTolerance: 0.0004,
  places: [
  {
    "slot": "transit",
    "ref": "node/11402352300",
    "kind": "hub",
    "category": "civic",
    "icon": "bus",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "meal",
    "ref": "node/440132538",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "community",
    "ref": "node/9979337843",
    "kind": "office",
    "category": "work",
    "icon": "school",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "clinic",
    "ref": "node/6582144017",
    "kind": "hospital",
    "category": "care",
    "icon": "health",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "recreation",
    "ref": "way/301966327",
    "kind": "park",
    "category": "fun",
    "icon": "park",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "market",
    "ref": "node/1640305526",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "worship",
    "ref": "node/4225087991",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A real named place; the activities here are fictional game content."
  },
  {
    "slot": "polling",
    "ref": "node/2299738133",
    "kind": "polling",
    "category": "civic",
    "icon": "poll",
    "line": "A town hall; the voting desk here is fictional game activity, not an election office."
  },
  {
    "slot": "government",
    "ref": "relation/13749447",
    "kind": "statehouse",
    "category": "civic",
    "icon": "civic",
    "line": "A government building; the game notice board is fictional activity, not a government service."
  },
  {
    "key": "palais-de-marbre",
    "ref": "node/925647492",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "ndaku-arts",
    "ref": "node/6986664285",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "congolese-arts",
    "ref": "way/105847849",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "national-museum",
    "ref": "way/1229581933",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "martyrs-stadium",
    "ref": "way/4402561",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "velodrome",
    "ref": "way/4638823",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "tata-raphael",
    "ref": "way/4650276",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "cardinal-malula",
    "ref": "way/129297066",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "cepromad",
    "ref": "node/4650134577",
    "kind": "quad",
    "category": "fun",
    "icon": "school",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "petroleum-institute",
    "ref": "node/5179804973",
    "kind": "quad",
    "category": "fun",
    "icon": "school",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "mont-ngaliema",
    "ref": "node/746691834",
    "kind": "walk",
    "category": "fun",
    "icon": "park",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "la-corniche",
    "ref": "node/746702674",
    "kind": "walk",
    "category": "fun",
    "icon": "park",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "marche-upn",
    "ref": "node/2533328477",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "marche-kale",
    "ref": "node/2273728696",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A real named place; visitor activities here are fictional game content."
  },
  {
    "key": "place-independance",
    "ref": "way/204364214",
    "kind": "walk",
    "category": "fun",
    "icon": "civic",
    "line": "A real named place; visitor activities here are fictional game content."
  }
],
  names: [
  {
    "id": "district-27043347",
    "ref": "node/27043347",
    "kind": "neighbourhood"
  },
  {
    "id": "district-27043358",
    "ref": "node/27043358",
    "kind": "neighbourhood"
  },
  {
    "id": "district-27043362",
    "ref": "node/27043362",
    "kind": "neighbourhood"
  },
  {
    "id": "district-27043390",
    "ref": "node/27043390",
    "kind": "neighbourhood"
  },
  {
    "id": "district-29806128",
    "ref": "node/29806128",
    "kind": "neighbourhood"
  },
  {
    "id": "district-29927348",
    "ref": "node/29927348",
    "kind": "neighbourhood"
  },
  {
    "id": "district-29927349",
    "ref": "node/29927349",
    "kind": "neighbourhood"
  },
  {
    "id": "district-29927350",
    "ref": "node/29927350",
    "kind": "neighbourhood"
  },
  {
    "id": "district-29927352",
    "ref": "node/29927352",
    "kind": "neighbourhood"
  },
  {
    "id": "district-435515963",
    "ref": "node/435515963",
    "kind": "neighbourhood"
  },
  {
    "id": "district-435748363",
    "ref": "node/435748363",
    "kind": "neighbourhood"
  },
  {
    "id": "district-435971627",
    "ref": "node/435971627",
    "kind": "neighbourhood"
  },
  {
    "id": "district-440176871",
    "ref": "node/440176871",
    "kind": "neighbourhood"
  },
  {
    "id": "district-790012856",
    "ref": "node/790012856",
    "kind": "neighbourhood"
  },
  {
    "id": "district-435702966",
    "ref": "node/435702966",
    "kind": "neighbourhood"
  },
  {
    "id": "district-619168290",
    "ref": "node/619168290",
    "kind": "neighbourhood"
  }
],
};
