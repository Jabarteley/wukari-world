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
  "name": "Amsterdam",
  "box": [
    52.192198710066016,
    4.596963101338747,
    52.55396048993398,
    5.187943698661253
  ],
  "core": [
    52.3278593775165,
    4.8188083075350825,
    52.41829982248349,
    4.966098492464917
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/45920072",
      "line": "Nieuw Vennep, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/251127910",
      "line": "Vermeer, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/747760656",
      "line": "Tyndale Theological Seminary, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/2895408123",
      "line": "Zaans Medisch Centrum, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/18012329",
      "line": "Pampushout, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/52651868",
      "line": "Hilvertshof, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/43389286",
      "line": "Hervormde Kerk (Ilpendam), a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/27657574",
      "line": "Grote Markt; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/11076875815",
      "line": "Zorginstituut Nederland, a mapped place for the game."
    },
    {
      "key": "osm-way-26401769",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/26401769",
      "line": "ACTA, a mapped place for the game."
    },
    {
      "key": "osm-node-3136758579",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/3136758579",
      "line": "Uitkijktoren Kruisberg, a mapped place for the game."
    },
    {
      "key": "osm-node-2881763865",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2881763865",
      "line": "Kasteel Loenersloot, a mapped place for the game."
    },
    {
      "key": "osm-node-4351285531",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4351285531",
      "line": "De tochtgenoten - 'Rachel beweent haar kinderen', a mapped place for the game."
    },
    {
      "key": "osm-relation-3711947",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/3711947",
      "line": "Muiderslot, a mapped place for the game."
    },
    {
      "key": "osm-way-55191054",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/55191054",
      "line": "Sint-Jan de Doperkerk, a mapped place for the game."
    },
    {
      "key": "osm-way-284901861",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/284901861",
      "line": "Hervormde Kerk Krommeniedijk, a mapped place for the game."
    },
    {
      "key": "osm-way-725091517",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/725091517",
      "line": "Amsterdam The Style Outlets, a mapped place for the game."
    },
    {
      "key": "osm-way-482698293",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/482698293",
      "line": "BUKO Stadion, a mapped place for the game."
    },
    {
      "key": "osm-way-943490220",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/943490220",
      "line": "Stadspark Hoofddorp, a mapped place for the game."
    },
    {
      "key": "osm-way-392300651",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/392300651",
      "line": "Beemster Arboretum, a mapped place for the game."
    },
    {
      "key": "osm-way-122547925",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/122547925",
      "line": "Spaarne Gasthuis Hoofddorp, a mapped place for the game."
    },
    {
      "key": "osm-way-673001166",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/673001166",
      "line": "Ziekenhuis Amstelland, a mapped place for the game."
    },
    {
      "key": "osm-way-157415662",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/157415662",
      "line": "Uitkijkpost 't Kopje, a mapped place for the game."
    },
    {
      "key": "osm-node-2739756603",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/2739756603",
      "line": "Schiphol Plaza, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10262832585",
      "ref": "node/10262832585",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10486207428",
      "ref": "node/10486207428",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10599350137",
      "ref": "node/10599350137",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11229775577",
      "ref": "node/11229775577",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11229791447",
      "ref": "node/11229791447",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11251865935",
      "ref": "node/11251865935",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11263344681",
      "ref": "node/11263344681",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11378180806",
      "ref": "node/11378180806",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12094770658",
      "ref": "node/12094770658",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12094773064",
      "ref": "node/12094773064",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12094799933",
      "ref": "node/12094799933",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12094852231",
      "ref": "node/12094852231",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12104971050",
      "ref": "node/12104971050",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12104971051",
      "ref": "node/12104971051",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12104971052",
      "ref": "node/12104971052",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12109161874",
      "ref": "node/12109161874",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12113322019",
      "ref": "node/12113322019",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12113322020",
      "ref": "node/12113322020",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1102571",
      "ref": "relation/1102571",
      "kind": "water"
    },
    {
      "id": "water-relation-1102901",
      "ref": "relation/1102901",
      "kind": "water"
    },
    {
      "id": "water-relation-1146003",
      "ref": "relation/1146003",
      "kind": "water"
    },
    {
      "id": "water-relation-1321001",
      "ref": "relation/1321001",
      "kind": "water"
    },
    {
      "id": "water-relation-1355881",
      "ref": "relation/1355881",
      "kind": "water"
    },
    {
      "id": "water-relation-1357685",
      "ref": "relation/1357685",
      "kind": "water"
    },
    {
      "id": "water-relation-1357687",
      "ref": "relation/1357687",
      "kind": "water"
    },
    {
      "id": "water-relation-1358123",
      "ref": "relation/1358123",
      "kind": "water"
    },
    {
      "id": "water-relation-1358125",
      "ref": "relation/1358125",
      "kind": "water"
    },
    {
      "id": "water-relation-1358357",
      "ref": "relation/1358357",
      "kind": "water"
    },
    {
      "id": "water-relation-1429144",
      "ref": "relation/1429144",
      "kind": "water"
    },
    {
      "id": "water-relation-18317022",
      "ref": "relation/18317022",
      "kind": "water"
    },
    {
      "id": "water-relation-18907883",
      "ref": "relation/18907883",
      "kind": "water"
    },
    {
      "id": "water-relation-7111512",
      "ref": "relation/7111512",
      "kind": "water"
    },
    {
      "id": "water-relation-9535435",
      "ref": "relation/9535435",
      "kind": "water"
    },
    {
      "id": "water-way-687355309",
      "ref": "way/687355309",
      "kind": "water"
    },
    {
      "id": "water-way-93240826",
      "ref": "way/93240826",
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
