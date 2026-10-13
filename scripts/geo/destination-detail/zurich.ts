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
  "name": "Zurich",
  "box": [
    47.193568010066016,
    8.274827776048742,
    47.55532978993398,
    8.807256623951258
  ],
  "core": [
    47.329228677516504,
    8.474660266199539,
    47.41966912248349,
    8.60742413380046
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/1219787004",
      "line": "Dietikon, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/119247298",
      "line": "Haus Hiltl, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/4468111183",
      "line": "Stadtbibliothek Winterthur, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/235292955",
      "line": "Privatklinik Hohenegg, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/50397148",
      "line": "Kurpark, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/35203442",
      "line": "Zentrum Töss, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/12168787",
      "line": "Dreifaltigkeitskirche, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/477927605",
      "line": "Rathaus Bremgarten; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/5880755469",
      "line": "GVZ Gebäudeversicherung Kanton Zürich, a mapped place for the game."
    },
    {
      "key": "osm-way-30296204",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/30296204",
      "line": "Gottlieb-Duttweiler-Institut, a mapped place for the game."
    },
    {
      "key": "osm-way-312787805",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/312787805",
      "line": "Aussichtsturm Irchel, a mapped place for the game."
    },
    {
      "key": "osm-node-306475059",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/306475059",
      "line": "Schreibmaschinenmuseum Beck, a mapped place for the game."
    },
    {
      "key": "osm-node-6419670946",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/6419670946",
      "line": "Erdmannliloch, a mapped place for the game."
    },
    {
      "key": "osm-way-49895064",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/49895064",
      "line": "Römisch-katholische kirchliche Zentrum St. Gabriel, a mapped place for the game."
    },
    {
      "key": "osm-way-59561172",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/59561172",
      "line": "St. Peter und Paul, a mapped place for the game."
    },
    {
      "key": "osm-way-163539799",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/163539799",
      "line": "Schloss Horben, a mapped place for the game."
    },
    {
      "key": "osm-way-117336724",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/117336724",
      "line": "Gasthof zum Bären, a mapped place for the game."
    },
    {
      "key": "osm-way-769027329",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/769027329",
      "line": "Restaurant Storchen, a mapped place for the game."
    },
    {
      "key": "osm-node-9717533158",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/9717533158",
      "line": "Liceo Vermigli, a mapped place for the game."
    },
    {
      "key": "osm-way-303186336",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/303186336",
      "line": "Loorenkopf-Turm, a mapped place for the game."
    },
    {
      "key": "osm-way-437737781",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/437737781",
      "line": "Stadlerturm, a mapped place for the game."
    },
    {
      "key": "osm-way-236595729",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/236595729",
      "line": "Spital Männedorf, a mapped place for the game."
    },
    {
      "key": "osm-way-555945140",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/555945140",
      "line": "Stadtspital Triemli, a mapped place for the game."
    },
    {
      "key": "osm-way-28367342",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/28367342",
      "line": "ETH Zürich, Hönggerberg, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-102311519",
      "ref": "node/102311519",
      "kind": "neighbourhood"
    },
    {
      "id": "district-102311797",
      "ref": "node/102311797",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11636059168",
      "ref": "node/11636059168",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12606391054",
      "ref": "node/12606391054",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1388718893",
      "ref": "node/1388718893",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1474570891",
      "ref": "node/1474570891",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1474570893",
      "ref": "node/1474570893",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1597438015",
      "ref": "node/1597438015",
      "kind": "neighbourhood"
    },
    {
      "id": "district-224648137",
      "ref": "node/224648137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-232964785",
      "ref": "node/232964785",
      "kind": "neighbourhood"
    },
    {
      "id": "district-25429070",
      "ref": "node/25429070",
      "kind": "neighbourhood"
    },
    {
      "id": "district-29973047",
      "ref": "node/29973047",
      "kind": "neighbourhood"
    },
    {
      "id": "district-30757711",
      "ref": "node/30757711",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3282979611",
      "ref": "node/3282979611",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3282979612",
      "ref": "node/3282979612",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3282979616",
      "ref": "node/3282979616",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3402024690",
      "ref": "node/3402024690",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3444613985",
      "ref": "node/3444613985",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1598599",
      "ref": "relation/1598599",
      "kind": "water"
    },
    {
      "id": "water-relation-1678346",
      "ref": "relation/1678346",
      "kind": "water"
    },
    {
      "id": "water-way-4605042",
      "ref": "way/4605042",
      "kind": "water"
    },
    {
      "id": "water-way-4605083",
      "ref": "way/4605083",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
