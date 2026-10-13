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
  "name": "Tórshavn",
  "box": [
    61.82925871006602,
    -7.294962051435183,
    62.19102048993398,
    -6.386463709992522
  ],
  "core": [
    61.96491937751651,
    -6.867417702107388,
    62.055359822483496,
    -6.675724097892613
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/4860307819",
      "line": "M/F Teistin, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/326207871",
      "line": "Essabarr, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/30704456",
      "line": "Landsbókasavnið, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/696349363",
      "line": "National Hospital of the Faroe Islands, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/501834759",
      "line": "Viðarlundin, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/32351707",
      "line": "SMS, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/511472500",
      "line": "Kvívíkar kirkja, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/444643264",
      "line": "Kommunuskrivstovan; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/5156619646",
      "line": "Department of Social Services, a mapped place for the game."
    },
    {
      "key": "osm-way-997129492",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/997129492",
      "line": "Glasir, a mapped place for the game."
    },
    {
      "key": "osm-way-648765786",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/648765786",
      "line": "Argir Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-493139327",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/493139327",
      "line": "Magnus Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-way-43917412",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/43917412",
      "line": "Miðvágs kirkja, a mapped place for the game."
    },
    {
      "key": "osm-way-44945414",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/44945414",
      "line": "Vestmanna kirkja, a mapped place for the game."
    },
    {
      "key": "osm-way-44619145",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/44619145",
      "line": "Faroese National Heritage, a mapped place for the game."
    },
    {
      "key": "osm-way-43493030",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/43493030",
      "line": "Nordic House in the Faroe Islands, a mapped place for the game."
    },
    {
      "key": "osm-node-444659920",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/444659920",
      "line": "Aaron's Cafe og Grill, a mapped place for the game."
    },
    {
      "key": "osm-node-604992048",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/604992048",
      "line": "HOTEL VÁGAR RESTAURANT, a mapped place for the game."
    },
    {
      "key": "osm-node-683373731",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/683373731",
      "line": "Syðrugota, a mapped place for the game."
    },
    {
      "key": "osm-node-4918755823",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/4918755823",
      "line": "Trøllkonufingur, a mapped place for the game."
    },
    {
      "key": "osm-way-48075009",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/48075009",
      "line": "Torgið, a mapped place for the game."
    },
    {
      "key": "osm-node-5844823036",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5844823036",
      "line": "Náttúruvísindadeildin, Fróðskaparsetur Føroya, a mapped place for the game."
    },
    {
      "key": "osm-node-13743098696",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/13743098696",
      "line": "Føroya Fólkaháskúli, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12410233693",
      "ref": "node/12410233693",
      "kind": "neighbourhood"
    },
    {
      "id": "district-302101923",
      "ref": "node/302101923",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10235802827",
      "ref": "node/10235802827",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10236073988",
      "ref": "node/10236073988",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10236441924",
      "ref": "node/10236441924",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10252954343",
      "ref": "node/10252954343",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10253802006",
      "ref": "node/10253802006",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10262801821",
      "ref": "node/10262801821",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10296598629",
      "ref": "node/10296598629",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10298339984",
      "ref": "node/10298339984",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10308962756",
      "ref": "node/10308962756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10932240182",
      "ref": "node/10932240182",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10932240253",
      "ref": "node/10932240253",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10932240458",
      "ref": "node/10932240458",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10951252217",
      "ref": "node/10951252217",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10958094661",
      "ref": "node/10958094661",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10958094691",
      "ref": "node/10958094691",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11444996327",
      "ref": "node/11444996327",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-11557537",
      "ref": "relation/11557537",
      "kind": "water"
    },
    {
      "id": "water-way-40779239",
      "ref": "way/40779239",
      "kind": "water"
    },
    {
      "id": "water-way-45676892",
      "ref": "way/45676892",
      "kind": "water"
    },
    {
      "id": "water-way-45676897",
      "ref": "way/45676897",
      "kind": "water"
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
