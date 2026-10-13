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
  "maxRoads": 400,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Stockholm",
  "box": [
    59.21658866603961,
    17.85911761747465,
    59.6575340444967,
    18.28306938252535
  ],
  "core": [
    59.27989697751651,
    17.982935093400606,
    59.370337422483495,
    18.159251906599394
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/312051",
      "line": "Huddinge, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/277145122",
      "line": "Kvarnen, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/165847212",
      "line": "Polishögskolan, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/400152301",
      "line": "Bromma Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/235092467",
      "line": "Fågelöuddebadet, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/120864772",
      "line": "Täby Centrum, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/24340484",
      "line": "Fresta kyrka, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/496669866",
      "line": "Solna stadshus; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/3822327232",
      "line": "Gillingebanan, a mapped place for the game."
    },
    {
      "key": "osm-node-1314052",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/1314052",
      "line": "Konstfack University of Arts, Crafts and Design, a mapped place for the game."
    },
    {
      "key": "osm-relation-11095283",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/11095283",
      "line": "Stockholms stadion, a mapped place for the game."
    },
    {
      "key": "osm-node-5094765075",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/5094765075",
      "line": "Granby Runestone, a mapped place for the game."
    },
    {
      "key": "osm-way-130648288",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/130648288",
      "line": "Fittja moské, a mapped place for the game."
    },
    {
      "key": "osm-way-133975840",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/133975840",
      "line": "Tacksägelsekyrkan, a mapped place for the game."
    },
    {
      "key": "osm-way-174125986",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/174125986",
      "line": "Jumbo Hostel, a mapped place for the game."
    },
    {
      "key": "osm-node-6673446413",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6673446413",
      "line": "U 347, a mapped place for the game."
    },
    {
      "key": "osm-way-6616471",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/6616471",
      "line": "Stinsen, a mapped place for the game."
    },
    {
      "key": "osm-way-161917128",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/161917128",
      "line": "Fjäderholmarnas krog, a mapped place for the game."
    },
    {
      "key": "osm-way-345758266",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/345758266",
      "line": "Einar Forseths park, a mapped place for the game."
    },
    {
      "key": "osm-way-374377103",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/374377103",
      "line": "Gubbängsparken, a mapped place for the game."
    },
    {
      "key": "osm-way-1103013221",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/1103013221",
      "line": "Tyresö Centrum, a mapped place for the game."
    },
    {
      "key": "osm-way-34838648",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/34838648",
      "line": "AIRA, a mapped place for the game."
    },
    {
      "key": "osm-way-499678529",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/499678529",
      "line": "Stockholms sjukhem, a mapped place for the game."
    },
    {
      "key": "osm-way-221105651",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/221105651",
      "line": "Frescati Hage, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-103850275",
      "ref": "node/103850275",
      "kind": "neighbourhood"
    },
    {
      "id": "district-103854564",
      "ref": "node/103854564",
      "kind": "neighbourhood"
    },
    {
      "id": "district-103951832",
      "ref": "node/103951832",
      "kind": "neighbourhood"
    },
    {
      "id": "district-106154429",
      "ref": "node/106154429",
      "kind": "neighbourhood"
    },
    {
      "id": "district-107266362",
      "ref": "node/107266362",
      "kind": "neighbourhood"
    },
    {
      "id": "district-107267884",
      "ref": "node/107267884",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1109534862",
      "ref": "node/1109534862",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11169231102",
      "ref": "node/11169231102",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1301180751",
      "ref": "node/1301180751",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13019237705",
      "ref": "node/13019237705",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13019237706",
      "ref": "node/13019237706",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13019237708",
      "ref": "node/13019237708",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1397768246",
      "ref": "node/1397768246",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1397768251",
      "ref": "node/1397768251",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1450909115",
      "ref": "node/1450909115",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1506692587",
      "ref": "node/1506692587",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1674641735",
      "ref": "node/1674641735",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1676601853",
      "ref": "node/1676601853",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1251467",
      "ref": "relation/1251467",
      "kind": "water"
    },
    {
      "id": "water-relation-14277500",
      "ref": "relation/14277500",
      "kind": "water"
    },
    {
      "id": "water-relation-15776352",
      "ref": "relation/15776352",
      "kind": "water"
    },
    {
      "id": "water-relation-17923352",
      "ref": "relation/17923352",
      "kind": "water"
    },
    {
      "id": "water-relation-186942",
      "ref": "relation/186942",
      "kind": "water"
    },
    {
      "id": "water-relation-1924566",
      "ref": "relation/1924566",
      "kind": "water"
    },
    {
      "id": "water-relation-237030",
      "ref": "relation/237030",
      "kind": "water"
    },
    {
      "id": "water-relation-271012",
      "ref": "relation/271012",
      "kind": "water"
    },
    {
      "id": "water-relation-3070391",
      "ref": "relation/3070391",
      "kind": "water"
    },
    {
      "id": "water-relation-3150348",
      "ref": "relation/3150348",
      "kind": "water"
    },
    {
      "id": "water-relation-5422286",
      "ref": "relation/5422286",
      "kind": "water"
    },
    {
      "id": "water-relation-5776802",
      "ref": "relation/5776802",
      "kind": "water"
    },
    {
      "id": "water-relation-59366",
      "ref": "relation/59366",
      "kind": "water"
    },
    {
      "id": "water-relation-912054",
      "ref": "relation/912054",
      "kind": "water"
    },
    {
      "id": "water-relation-93350",
      "ref": "relation/93350",
      "kind": "water"
    },
    {
      "id": "water-way-10371151",
      "ref": "way/10371151",
      "kind": "water"
    },
    {
      "id": "water-way-142042569",
      "ref": "way/142042569",
      "kind": "water"
    },
    {
      "id": "water-way-20420215",
      "ref": "way/20420215",
      "kind": "water"
    },
    {
      "id": "water-way-235808923",
      "ref": "way/235808923",
      "kind": "water"
    },
    {
      "id": "water-way-4662283",
      "ref": "way/4662283",
      "kind": "water"
    },
    {
      "id": "water-way-4966785",
      "ref": "way/4966785",
      "kind": "water"
    },
    {
      "id": "water-way-7559894",
      "ref": "way/7559894",
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
