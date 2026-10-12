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
  "name": "Nouakchott",
  "box": [
    17.89835701006602,
    -16.167196177109663,
    18.319044044496696,
    -15.788818022890336
  ],
  "core": [
    18.034017677516506,
    -16.025267580841156,
    18.124458122483492,
    -15.930746619158842
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4717072589",
      "line": "Vans to Kiffa, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9669148230",
      "line": "Le Mirador, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/390393455",
      "line": "Lebanese International University, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/325739083",
      "line": "Clinique Chiva, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/374443931",
      "line": "Parc Ehel Limame, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/8725384451",
      "line": "Marché el Bechair, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/535692984",
      "line": "Airport Mosque, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/230061010",
      "line": "Mairie Dar Naim; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/238469031",
      "line": "État civil, a mapped place for the game."
    },
    {
      "key": "osm-way-94938496",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/94938496",
      "line": "Nouakchott University, a mapped place for the game."
    },
    {
      "key": "osm-way-142062875",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/142062875",
      "line": "Stade Olympique de Nouakchott, a mapped place for the game."
    },
    {
      "key": "osm-way-94938531",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/94938531",
      "line": "Musée National de la Mauritanie, a mapped place for the game."
    },
    {
      "key": "osm-way-334308412",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/334308412",
      "line": "Centre de santé, a mapped place for the game."
    },
    {
      "key": "osm-way-228858570",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/228858570",
      "line": "École Normale Supérieure de Nouakchott, a mapped place for the game."
    },
    {
      "key": "osm-way-1276090644",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1276090644",
      "line": "Dream Land Ocean, a mapped place for the game."
    },
    {
      "key": "osm-node-6555685946",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6555685946",
      "line": "Mosquée AL Tawba, a mapped place for the game."
    },
    {
      "key": "osm-way-453601079",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/453601079",
      "line": "Fish Market, a mapped place for the game."
    },
    {
      "key": "osm-way-428023202",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/428023202",
      "line": "Faculté de Médécine, a mapped place for the game."
    },
    {
      "key": "osm-node-8706615379",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8706615379",
      "line": "Le Bonto, a mapped place for the game."
    },
    {
      "key": "osm-way-231168874",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/231168874",
      "line": "Maternité Suisse, a mapped place for the game."
    },
    {
      "key": "osm-node-8708819578",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/8708819578",
      "line": "Restaurant el Hamd, a mapped place for the game."
    },
    {
      "key": "osm-node-8696420174",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/8696420174",
      "line": "Lemina Mall, a mapped place for the game."
    },
    {
      "key": "osm-node-4406868798",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4406868798",
      "line": "Mosquée Cheikh Sidya, a mapped place for the game."
    },
    {
      "key": "osm-node-5171076923",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/5171076923",
      "line": "Ehel Diddah Baiba, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-4506643278",
      "ref": "node/4506643278",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4507040705",
      "ref": "node/4507040705",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4513703315",
      "ref": "node/4513703315",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4514023457",
      "ref": "node/4514023457",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477057258",
      "ref": "node/4477057258",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477058361",
      "ref": "node/4477058361",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477062525",
      "ref": "node/4477062525",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477062575",
      "ref": "node/4477062575",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477087465",
      "ref": "node/4477087465",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477093902",
      "ref": "node/4477093902",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477105655",
      "ref": "node/4477105655",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4477107366",
      "ref": "node/4477107366",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4506634498",
      "ref": "node/4506634498",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4506636932",
      "ref": "node/4506636932",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4507968090",
      "ref": "node/4507968090",
      "kind": "neighbourhood"
    },
    {
      "id": "district-4507968091",
      "ref": "node/4507968091",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5607668581",
      "ref": "node/5607668581",
      "kind": "neighbourhood"
    },
    {
      "id": "district-8920023948",
      "ref": "node/8920023948",
      "kind": "neighbourhood"
    }
  ],
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
