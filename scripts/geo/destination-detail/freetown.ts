import type { DetailConfig } from './config.ts';
import { coastWaterQuery, extrasQuery, landuseQuery, placesQuery, roadsQuery } from './queries.ts';

/** Freetown and Lungi recipe. All venue and district names come from the dated country PBF. */
export const CONFIG: DetailConfig = {
  name: 'Freetown',
  box: [8.37, -13.36, 8.65, -13.12],
  core: [8.435, -13.285, 8.505, -13.195],
  discovery: (bbox) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
  landuse: landuseQuery,
  cell: 0.003, grow: 2, split: 12, shore: 0, minHole: 40,
  minRoadKm: 0.45, maxRoads: 500, roadMarginDegrees: 0.004,
  surround: '#bcd596',
  water: coastWaterQuery, wideWater: true,
  sea: { kind: 'coast', bandMetres: 40000 },
  roads: roadsQuery,
  boundaryNote: 'the mapped built-up extent of Freetown and Lungi on opposite shores of the estuary',
  terrainNote: 'the mapped Atlantic coastline and Sierra Leone River estuary, inland water, main roads and named neighbourhoods; no invented bridge across the estuary',
  source: 'OpenStreetMap contributors via Geofabrik PBF',
  outlineTolerance: 0.0003, waterTolerance: 0.0003, farTolerance: 0.0008, coreTolerance: 0.0004,
  places: [
  {
    "slot": "transit",
    "ref": "node/4526412290",
    "kind": "hub",
    "category": "civic",
    "icon": "bus",
    "line": "A mapped minibus terminal. Check the game road travel options here."
  },
  {
    "slot": "meal",
    "ref": "node/410088163",
    "kind": "buka",
    "category": "food",
    "icon": "food",
    "line": "A mapped cafe. The simple visitor meal is a game activity here."
  },
  {
    "slot": "community",
    "ref": "way/28548338",
    "kind": "office",
    "category": "work",
    "icon": "school",
    "line": "A mapped university. Community activities and starter work shifts are fictional game content here."
  },
  {
    "slot": "clinic",
    "ref": "way/306316437",
    "kind": "hospital",
    "category": "care",
    "icon": "health",
    "line": "A mapped hospital. The clinic activities are fictional game content here."
  },
  {
    "slot": "recreation",
    "ref": "way/33113835",
    "kind": "park",
    "category": "fun",
    "icon": "park",
    "line": "A mapped public park. Take a free break or play game chess here."
  },
  {
    "slot": "market",
    "ref": "way/173226206",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A mapped market. Visit the game market stop here."
  },
  {
    "slot": "worship",
    "ref": "way/177518789",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A mapped cathedral. Rest and reflect here in the game."
  },
  {
    "slot": "polling",
    "ref": "node/13133044444",
    "kind": "polling",
    "category": "civic",
    "icon": "poll",
    "line": "The mapped city council building. The voting desk is a fictional game activity, not an election office."
  },
  {
    "slot": "government",
    "ref": "way/91664110",
    "kind": "statehouse",
    "category": "civic",
    "icon": "civic",
    "line": "A mapped courthouse. The notice board is fictional game content, not government advice."
  },
  {
    "key": "national-museum",
    "ref": "node/3563419694",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A mapped museum. Explore the exhibits in the game."
  },
  {
    "key": "national-railway-museum",
    "ref": "way/307686732",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A mapped railway museum. Walk the exhibits."
  },
  {
    "key": "siaka-stevens-stadium",
    "ref": "way/28429017",
    "kind": "viewing",
    "category": "fun",
    "icon": "ball",
    "line": "A mapped stadium. Watch from the stands in the game."
  },
  {
    "key": "sierra-leone-library",
    "ref": "way/173226207",
    "kind": "walk",
    "category": "fun",
    "icon": "museum",
    "line": "A mapped library. Take a quiet reading break."
  },
  {
    "key": "parliament",
    "ref": "way/33080070",
    "kind": "walk",
    "category": "fun",
    "icon": "civic",
    "line": "The mapped parliament building. Walk around this civic landmark."
  },
  {
    "key": "maroon-church",
    "ref": "way/177518788",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A mapped church. Take a quiet break."
  },
  {
    "key": "st-georges-cathedral",
    "ref": "way/177521574",
    "kind": "worship",
    "category": "fun",
    "icon": "worship",
    "line": "A mapped cathedral. Rest and reflect."
  },
  {
    "key": "lumley-market",
    "ref": "way/314699783",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A mapped market. Look around the stalls."
  },
  {
    "key": "congo-town-market",
    "ref": "way/173225236",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A mapped market. Look around the stalls."
  },
  {
    "key": "freetown-mall",
    "ref": "node/3715252412",
    "kind": "mall",
    "category": "fun",
    "icon": "market",
    "line": "A mapped shopping mall. Explore the shops."
  },
  {
    "key": "hill-station",
    "ref": "node/370751258",
    "kind": "walk",
    "category": "fun",
    "icon": "walk",
    "line": "A mapped attraction. Walk around the landmark."
  },
  {
    "key": "chimpanzee-sanctuary",
    "ref": "node/625129335",
    "kind": "walk",
    "category": "fun",
    "icon": "walk",
    "line": "A mapped sanctuary attraction. Take a game visit."
  },
  {
    "key": "njala-university",
    "ref": "way/307096805",
    "kind": "walk",
    "category": "fun",
    "icon": "school",
    "line": "A mapped university. Walk around the campus."
  },
  {
    "key": "belia-park",
    "ref": "way/307078031",
    "kind": "park",
    "category": "fun",
    "icon": "park",
    "line": "A mapped park. Take a free break."
  },
  {
    "key": "adjai-crowther-amphitheatre",
    "ref": "way/1251127845",
    "kind": "viewing",
    "category": "fun",
    "icon": "view",
    "line": "A mapped theatre. Watch from the audience in the game."
  },
  {
    "key": "king-jimmy-market",
    "ref": "node/2414270994",
    "kind": "market",
    "category": "work",
    "icon": "market",
    "line": "A mapped market. Look around the stalls."
  }
],
  names: [
  {
    "id": "goderich",
    "ref": "node/370327499",
    "kind": "neighbourhood"
  },
  {
    "id": "murray-town",
    "ref": "node/370495828",
    "kind": "neighbourhood"
  },
  {
    "id": "aberdeen",
    "ref": "node/370495917",
    "kind": "neighbourhood"
  },
  {
    "id": "wilberforce",
    "ref": "node/370496125",
    "kind": "neighbourhood"
  },
  {
    "id": "congo-town",
    "ref": "node/370496518",
    "kind": "neighbourhood"
  },
  {
    "id": "mount-aureol",
    "ref": "node/370496794",
    "kind": "neighbourhood"
  },
  {
    "id": "lumley",
    "ref": "node/370751807",
    "kind": "neighbourhood"
  },
  {
    "id": "cline-town",
    "ref": "node/370794239",
    "kind": "neighbourhood"
  },
  {
    "id": "hill-station",
    "ref": "node/371009770",
    "kind": "neighbourhood"
  },
  {
    "id": "kissy",
    "ref": "node/372618813",
    "kind": "neighbourhood"
  },
  {
    "id": "wellington",
    "ref": "node/391448586",
    "kind": "neighbourhood"
  },
  {
    "id": "tower-hill",
    "ref": "node/423761590",
    "kind": "neighbourhood"
  },
  {
    "id": "new-england",
    "ref": "node/428767378",
    "kind": "neighbourhood"
  },
  {
    "id": "kingtom",
    "ref": "node/1401580567",
    "kind": "neighbourhood"
  },
  {
    "id": "kambia",
    "ref": "node/3071911189",
    "kind": "neighbourhood"
  },
  {
    "id": "tulomasaw",
    "ref": "node/3071911192",
    "kind": "neighbourhood"
  },
  {
    "id": "kamasundo",
    "ref": "node/3072025739",
    "kind": "neighbourhood"
  },
  {
    "id": "kasuan",
    "ref": "node/3072290424",
    "kind": "neighbourhood"
  }
],
};
