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
  "name": "Managua",
  "box": [
    11.973830710066022,
    -86.45763311236715,
    12.33559248993398,
    -86.08981688763285
  ],
  "core": [
    12.109491377516505,
    -86.31967836279748,
    12.199931822483496,
    -86.22777163720252
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/769169058",
      "line": "TICABUS Central Managua., a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1258848143",
      "line": "Papa John's & Narcy's Chicken, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/20105503",
      "line": "Universidad Católica Nicaragua, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/239002175",
      "line": "Carlos Marx Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/225062335",
      "line": "Polideportivo España, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/113063248",
      "line": "Mercado Municipal de Ciudad Sandino, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/4832005830",
      "line": "Iglesia Santa María de Guadalupe, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/21161414",
      "line": "Plaza de la Fe Juan Pablo II; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/306044446",
      "line": "MARENA (Ministerio del Ambiente y los Recursos Naturales), a mapped place for the game."
    },
    {
      "key": "osm-way-38578925",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/38578925",
      "line": "Universidad Nacional Casimiro Sotelo Montenegro, a mapped place for the game."
    },
    {
      "key": "osm-way-160261758",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/160261758",
      "line": "Estadio Nacional de fútbol de Nicaragua, a mapped place for the game."
    },
    {
      "key": "osm-node-497371428",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/497371428",
      "line": "Busto José Martí, a mapped place for the game."
    },
    {
      "key": "osm-node-14225260759",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/14225260759",
      "line": "Estadio Olímpico del IND, a mapped place for the game."
    },
    {
      "key": "osm-way-38578726",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/38578726",
      "line": "Metrocentro, a mapped place for the game."
    },
    {
      "key": "osm-node-2355682005",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/2355682005",
      "line": "Zoológico Nacional, a mapped place for the game."
    },
    {
      "key": "osm-node-1787488316",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/1787488316",
      "line": "Monumento a los Mártires, a mapped place for the game."
    },
    {
      "key": "osm-relation-21143410",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/21143410",
      "line": "Mercado de Mayoreo, a mapped place for the game."
    },
    {
      "key": "osm-relation-5844843",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/5844843",
      "line": "Parque Las Piedrecitas, a mapped place for the game."
    },
    {
      "key": "osm-node-4001705843",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4001705843",
      "line": "Iglesia El Carmen, a mapped place for the game."
    },
    {
      "key": "osm-way-70193885",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/70193885",
      "line": "Universidad Americana (UAM), a mapped place for the game."
    },
    {
      "key": "osm-way-241368647",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/241368647",
      "line": "Universidad Nicaragüense de Ciencia y Tecnología, a mapped place for the game."
    },
    {
      "key": "osm-node-889552361",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/889552361",
      "line": "Iglesia Santo Domingo, a mapped place for the game."
    },
    {
      "key": "osm-relation-20576117",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/20576117",
      "line": "Parque Luis Alfonso Velásquez Flores, a mapped place for the game."
    },
    {
      "key": "osm-way-363530474",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/363530474",
      "line": "Hospital Militar Escuela Dr. Alejandro Dávila Bolaños, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-12691139760",
      "ref": "node/12691139760",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12691139761",
      "ref": "node/12691139761",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13336396116",
      "ref": "node/13336396116",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13382509508",
      "ref": "node/13382509508",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13668156726",
      "ref": "node/13668156726",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13705693878",
      "ref": "node/13705693878",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13705714240",
      "ref": "node/13705714240",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13705761231",
      "ref": "node/13705761231",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13705777264",
      "ref": "node/13705777264",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13778401999",
      "ref": "node/13778401999",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13778414605",
      "ref": "node/13778414605",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13778414606",
      "ref": "node/13778414606",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13832028641",
      "ref": "node/13832028641",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13835259740",
      "ref": "node/13835259740",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2388786967",
      "ref": "node/2388786967",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2473803805",
      "ref": "node/2473803805",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2474762611",
      "ref": "node/2474762611",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2478527289",
      "ref": "node/2478527289",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-18713239",
      "ref": "relation/18713239",
      "kind": "water"
    },
    {
      "id": "water-relation-49752",
      "ref": "relation/49752",
      "kind": "water"
    },
    {
      "id": "water-relation-5883615",
      "ref": "relation/5883615",
      "kind": "water"
    },
    {
      "id": "water-relation-5883616",
      "ref": "relation/5883616",
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
