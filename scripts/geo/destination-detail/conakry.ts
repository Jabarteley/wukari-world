import type { DetailConfig } from './config.ts';
import { coastWaterQuery, extrasQuery, landuseQuery, placesQuery, roadsQuery } from './queries.ts';

/** Conakry recipe. Place and neighbourhood names are selected from the validated offline OSM extract. */
export const CONFIG: DetailConfig = {
  name: 'Conakry',
  box: [9.43, -13.8, 9.63, -13.56],
  core: [9.495, -13.725, 9.565, -13.635],
  discovery: (bbox) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
  landuse: landuseQuery,
  cell: 0.004,
  grow: 2,
  split: 12,
  shore: 0,
  minHole: 40,
  minRoadKm: 0.7,
  maxRoads: 700,
  roadMarginDegrees: 0.004,
  surround: '#bcd596',
  water: coastWaterQuery,
  wideWater: true,
  sea: { kind: 'coast', bandMetres: 40000 },
  roads: roadsQuery,
  boundaryNote: 'the built-up extent of Conakry, from the mapped land use',
  terrainNote: 'the Atlantic coast as a band of water along the coast, mapped inland water, and the motorway, trunk and primary roads of the box plus named secondary roads in the core.',
  source: 'OpenStreetMap contributors via Geofabrik PBF',
  outlineTolerance: 0.0003,
  waterTolerance: 0.0003,
  farTolerance: 0.0008,
  coreTolerance: 0.0004,
  places: [
  {
    "slot": "transit",
    "ref": "way/451332338",
    "kind": "hub",
    "category": "civic",
    "icon": "train",
    "line": "A bus station; check the game travel connections here."
  },
  {
    "slot": "meal",
    "ref": "node/5423206730",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; the game meal stop is set here."
  },
  {
    "slot": "community",
    "ref": "node/3476325220",
    "kind": "office",
    "category": "work",
    "icon": "school",
    "line": "A university faculty; the game community desk and starter shifts are set here."
  },
  {
    "slot": "clinic",
    "ref": "way/549652805",
    "kind": "hospital",
    "category": "care",
    "icon": "health",
    "line": "A hospital; the game clinic activities are set here."
  },
  {
    "slot": "recreation",
    "ref": "way/550010888",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A stadium; take a break and watch from the stands in the game."
  },
  {
    "slot": "market",
    "ref": "node/5866884272",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A market; the game market stop is set here."
  },
  {
    "slot": "worship",
    "ref": "way/549242648",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A cathedral; rest and reflect in the game."
  },
  {
    "slot": "polling",
    "ref": "way/554582547",
    "kind": "polling",
    "category": "civic",
    "icon": "poll",
    "line": "A town hall; the voting desk here is a fictional game activity, not an election office."
  },
  {
    "slot": "government",
    "ref": "way/38713075",
    "kind": "statehouse",
    "category": "civic",
    "icon": "civic",
    "line": "A presidential palace; the notice board here is a fictional game activity, not a government service."
  },
  {
    "key": "national-museum",
    "ref": "way/552008098",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A museum; explore its exhibits in the game."
  },
  {
    "key": "palais-des-sports",
    "ref": "way/555585408",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A sports venue; watch from the stands in the game."
  },
  {
    "key": "kabinet-kouyate-stadium",
    "ref": "way/548791131",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A stadium; watch from the stands in the game."
  },
  {
    "key": "lansana-conte-stadium",
    "ref": "relation/7829658",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A stadium; watch from the stands in the game."
  },
  {
    "key": "atelier-keita",
    "ref": "node/5393588130",
    "kind": "walk",
    "category": "fun",
    "icon": "walk",
    "line": "A mapped attraction; walk around it in the game."
  },
  {
    "key": "grill-express",
    "ref": "node/4176826090",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; stop for a meal in the game."
  },
  {
    "key": "bistro-parisien",
    "ref": "node/4212901903",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; stop for a meal in the game."
  },
  {
    "key": "amore-mio",
    "ref": "node/4849919421",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A cafe; take a break in the game."
  },
  {
    "key": "sushi-bar",
    "ref": "node/5361222719",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; stop for a meal in the game."
  },
  {
    "key": "brasserie-des-arts",
    "ref": "node/5996728969",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; stop for a meal in the game."
  },
  {
    "key": "la-fourchette",
    "ref": "node/6343662789",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; stop for a meal in the game."
  },
  {
    "key": "le-patio",
    "ref": "node/6651752885",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A restaurant; stop for a meal in the game."
  }
],
  names: [
  {
    "id": "district-481376003",
    "ref": "node/481376003",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481377186",
    "ref": "node/481377186",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481377856",
    "ref": "node/481377856",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481379574",
    "ref": "node/481379574",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481390569",
    "ref": "node/481390569",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481390739",
    "ref": "node/481390739",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481390939",
    "ref": "node/481390939",
    "kind": "neighbourhood"
  },
  {
    "id": "district-481391093",
    "ref": "node/481391093",
    "kind": "neighbourhood"
  },
  {
    "id": "district-2272477748",
    "ref": "node/2272477748",
    "kind": "neighbourhood"
  },
  {
    "id": "district-2272566457",
    "ref": "node/2272566457",
    "kind": "neighbourhood"
  },
  {
    "id": "district-2272596116",
    "ref": "node/2272596116",
    "kind": "neighbourhood"
  },
  {
    "id": "district-4269850383",
    "ref": "node/4269850383",
    "kind": "neighbourhood"
  },
  {
    "id": "district-4269860990",
    "ref": "node/4269860990",
    "kind": "neighbourhood"
  },
  {
    "id": "district-5345940902",
    "ref": "node/5345940902",
    "kind": "neighbourhood"
  },
  {
    "id": "district-5481200247",
    "ref": "node/5481200247",
    "kind": "neighbourhood"
  },
  {
    "id": "district-5551459713",
    "ref": "node/5551459713",
    "kind": "neighbourhood"
  }
],
};
