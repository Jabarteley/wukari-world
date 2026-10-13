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
  "name": "Andorra la Vella",
  "box": [
    42.326058210066016,
    1.276827819456585,
    42.68781998993398,
    1.7656655805434152
  ],
  "core": [
    42.4617188775165,
    1.4602749675771234,
    42.55215932248349,
    1.5822184324228767
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/604030704",
      "line": "National Bus Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5736767209",
      "line": "Refugi de Sorteny, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/270902310",
      "line": "Universitat d'Andorra, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/194554955",
      "line": "Hospital of Our Lady of Meritxell, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/6275507",
      "line": "Parc Central, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/54858984",
      "line": "Pyrénées Hyper-Centre, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/202636510",
      "line": "Sant Pere del Tarter, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/545322380",
      "line": "De Sant Serni De Canillo; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4456947592",
      "line": "Govern d'Andorra, a mapped place for the game."
    },
    {
      "key": "osm-way-968544460",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/968544460",
      "line": "Cadran solaire de Tristaina, a mapped place for the game."
    },
    {
      "key": "osm-node-4516461789",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4516461789",
      "line": "Madriu-Perafita-Claror Valley, a mapped place for the game."
    },
    {
      "key": "osm-way-202616749",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/202616749",
      "line": "Sant Andreu d’Arinsal, a mapped place for the game."
    },
    {
      "key": "osm-way-202640608",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/202640608",
      "line": "Església de Sant Corneli i Sant Cebrià d'Ordino, a mapped place for the game."
    },
    {
      "key": "osm-way-202617257",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/202617257",
      "line": "Museu Etnogràfic Casa Cristo, a mapped place for the game."
    },
    {
      "key": "osm-way-202614660",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/202614660",
      "line": "Museu Casa Rull, a mapped place for the game."
    },
    {
      "key": "osm-way-908107551",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/908107551",
      "line": "Mirador Roc del Quer, a mapped place for the game."
    },
    {
      "key": "osm-way-352338250",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/352338250",
      "line": "Centre Comercial Pyrénées Andorra, a mapped place for the game."
    },
    {
      "key": "osm-way-361846817",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/361846817",
      "line": "Plaça del Poble, a mapped place for the game."
    },
    {
      "key": "osm-node-321679777",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/321679777",
      "line": "la Rabassa, a mapped place for the game."
    },
    {
      "key": "osm-node-10089764818",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/10089764818",
      "line": "Port de Cabús, a mapped place for the game."
    },
    {
      "key": "osm-node-1894423912",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1894423912",
      "line": "Restaurant Refugi del Llac de Pessons, a mapped place for the game."
    },
    {
      "key": "osm-node-6698440905",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/6698440905",
      "line": "Jardins de Juberri, a mapped place for the game."
    },
    {
      "key": "osm-way-194556039",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/194556039",
      "line": "Epizen, a mapped place for the game."
    },
    {
      "key": "osm-way-385230804",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/385230804",
      "line": "Centre Mèdic Grau, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-14115030545",
      "ref": "node/14115030545",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14115030576",
      "ref": "node/14115030576",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14115030578",
      "ref": "node/14115030578",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2125755654",
      "ref": "node/2125755654",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954477",
      "ref": "node/64954477",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954512",
      "ref": "node/64954512",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954598",
      "ref": "node/64954598",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2125770584",
      "ref": "node/2125770584",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954554",
      "ref": "node/64954554",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2125730238",
      "ref": "node/2125730238",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954385",
      "ref": "node/64954385",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954525",
      "ref": "node/64954525",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954593",
      "ref": "node/64954593",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954464",
      "ref": "node/64954464",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954570",
      "ref": "node/64954570",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954521",
      "ref": "node/64954521",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954435",
      "ref": "node/64954435",
      "kind": "neighbourhood"
    },
    {
      "id": "district-64954515",
      "ref": "node/64954515",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
