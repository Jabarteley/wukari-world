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
  "name": "Minsk",
  "box": [
    53.72159071006602,
    27.25554926623365,
    54.08335248993398,
    28.055209327656982
  ],
  "core": [
    53.857251377516505,
    27.485503455517243,
    53.94769182248349,
    27.63814154448276
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/209186405",
      "line": "Kamiennaja Horka, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/39972661",
      "line": "Karčma z Chvojeva, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/281727438",
      "line": "Yakub Kolas Central Scientific Library, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/77346478",
      "line": "City Clinical Emergency Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/25210032",
      "line": "Выспа кахання, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/23555207",
      "line": "Тутэйшы, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/13275510861",
      "line": "Гудавіцкае свяцілішча, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/544081087",
      "line": "State Flag Square; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "relation/21417",
      "line": "Міністэрства сельскай гаспадаркі і харчавання Рэспублікі Беларусь, a mapped place for the game."
    },
    {
      "key": "osm-relation-21968",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/21968",
      "line": "Belarusian State Medical University, a mapped place for the game."
    },
    {
      "key": "osm-way-292848094",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/292848094",
      "line": "Minsk Arena, a mapped place for the game."
    },
    {
      "key": "osm-node-1165818843",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1165818843",
      "line": "Museum of Belarusian Folk Art, a mapped place for the game."
    },
    {
      "key": "osm-way-39246694",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/39246694",
      "line": "Mound of Glory, a mapped place for the game."
    },
    {
      "key": "osm-way-290903356",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/290903356",
      "line": "Храм Узвышэння Святога Крыжа (2010), a mapped place for the game."
    },
    {
      "key": "osm-node-2788685388",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2788685388",
      "line": "Былы сядзібна-паркавы комплекс Прушынскіх, a mapped place for the game."
    },
    {
      "key": "osm-node-2788687315",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2788687315",
      "line": "Царква могілкавая, a mapped place for the game."
    },
    {
      "key": "osm-relation-6172342",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/6172342",
      "line": "Палацава-паркавы комплекс Чапскіх, a mapped place for the game."
    },
    {
      "key": "osm-way-689138683",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/689138683",
      "line": "Stones Museum, a mapped place for the game."
    },
    {
      "key": "osm-way-76132102",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/76132102",
      "line": "4-я гарадская клінічная бальніца імя М.Я.Саўчанкі, a mapped place for the game."
    },
    {
      "key": "osm-way-384227903",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/384227903",
      "line": "Belarusian State Economic University, a mapped place for the game."
    },
    {
      "key": "osm-relation-8825869",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/8825869",
      "line": "Belarusian National Technical University, a mapped place for the game."
    },
    {
      "key": "osm-way-80616815",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/80616815",
      "line": "6 city clinical hospital, a mapped place for the game."
    },
    {
      "key": "osm-relation-13591047",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/13591047",
      "line": "Стадыён БДПУ, a mapped place for the game."
    },
    {
      "key": "osm-way-23409356",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23409356",
      "line": "Тарпеда, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1127712920",
      "ref": "node/1127712920",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1156503204",
      "ref": "node/1156503204",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1156503515",
      "ref": "node/1156503515",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1156504074",
      "ref": "node/1156504074",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386243",
      "ref": "node/12847386243",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386244",
      "ref": "node/12847386244",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386245",
      "ref": "node/12847386245",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386247",
      "ref": "node/12847386247",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386248",
      "ref": "node/12847386248",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386249",
      "ref": "node/12847386249",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386250",
      "ref": "node/12847386250",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386252",
      "ref": "node/12847386252",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386254",
      "ref": "node/12847386254",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386255",
      "ref": "node/12847386255",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386256",
      "ref": "node/12847386256",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12847386258",
      "ref": "node/12847386258",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12930169987",
      "ref": "node/12930169987",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1632803112",
      "ref": "node/1632803112",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-1731144",
      "ref": "relation/1731144",
      "kind": "water"
    },
    {
      "id": "water-relation-19781",
      "ref": "relation/19781",
      "kind": "water"
    },
    {
      "id": "water-relation-19791",
      "ref": "relation/19791",
      "kind": "water"
    },
    {
      "id": "water-relation-2096824",
      "ref": "relation/2096824",
      "kind": "water"
    },
    {
      "id": "water-relation-21210312",
      "ref": "relation/21210312",
      "kind": "water"
    },
    {
      "id": "water-relation-28757",
      "ref": "relation/28757",
      "kind": "water"
    },
    {
      "id": "water-relation-28758",
      "ref": "relation/28758",
      "kind": "water"
    },
    {
      "id": "water-relation-939281",
      "ref": "relation/939281",
      "kind": "water"
    },
    {
      "id": "water-way-25196242",
      "ref": "way/25196242",
      "kind": "water"
    },
    {
      "id": "water-way-35142854",
      "ref": "way/35142854",
      "kind": "water"
    },
    {
      "id": "water-way-60360233",
      "ref": "way/60360233",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
