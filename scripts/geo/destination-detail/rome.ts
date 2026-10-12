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
  "name": "Rome",
  "box": [
    41.71243941006602,
    12.239945277277313,
    42.07420118993398,
    12.724973924975998
  ],
  "core": [
    41.848100077516506,
    12.422550538052503,
    41.93854052248349,
    12.543313661947495
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "train",
      "ref": "node/24694686",
      "line": "Roma Prenestina, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/2138753806",
      "line": "Cencio la Parolaccia, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "school",
      "ref": "relation/5763542",
      "line": "Villa Mondragone, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/14312289",
      "line": "Ospedale Sant'Andrea, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/2426556",
      "line": "Parco Centrale del Lago, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/204398096",
      "line": "Porta di Roma, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/6861964837",
      "line": "Chiesa di Sant'Ippolito e Lucia a Porto, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/431374177",
      "line": "Municipio Roma VI; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/186037229",
      "line": "Palazzo Orsini, a mapped place for the game."
    },
    {
      "key": "osm-relation-17854343",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/17854343",
      "line": "Pontificia Facoltà di Scienze dell'Educazione, a mapped place for the game."
    },
    {
      "key": "osm-way-23951383",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/23951383",
      "line": "Stadio dei Marmi, a mapped place for the game."
    },
    {
      "key": "osm-node-618491090",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/618491090",
      "line": "Galeria, a mapped place for the game."
    },
    {
      "key": "osm-node-8413119694",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8413119694",
      "line": "Castel Savello, a mapped place for the game."
    },
    {
      "key": "osm-relation-6533345",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "relation/6533345",
      "line": "Castello, a mapped place for the game."
    },
    {
      "key": "osm-way-499070475",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/499070475",
      "line": "Parrocchia Santa Maria e San Biagio, a mapped place for the game."
    },
    {
      "key": "osm-way-880583236",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/880583236",
      "line": "Nuovo Santuario Divino Amore, a mapped place for the game."
    },
    {
      "key": "osm-relation-11558912",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/11558912",
      "line": "Parco degli Acquedotti, a mapped place for the game."
    },
    {
      "key": "osm-way-878963031",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/878963031",
      "line": "Piazzale degli Eroi, a mapped place for the game."
    },
    {
      "key": "osm-way-27036246",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/27036246",
      "line": "Ospedale San Filippo Neri, a mapped place for the game."
    },
    {
      "key": "osm-relation-1517075",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/1517075",
      "line": "International University of Rome, a mapped place for the game."
    },
    {
      "key": "osm-way-370461335",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/370461335",
      "line": "LUISS, a mapped place for the game."
    },
    {
      "key": "osm-relation-2819550",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/2819550",
      "line": "Ippodromo di Tor di Valle, a mapped place for the game."
    },
    {
      "key": "osm-relation-1876703",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/1876703",
      "line": "Ospedale San Giovanni – Presidio Santa Maria, a mapped place for the game."
    },
    {
      "key": "osm-node-1172691363",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1172691363",
      "line": "Babington's, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-1182820756",
      "ref": "node/1182820756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1213407091",
      "ref": "node/1213407091",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1234559097",
      "ref": "node/1234559097",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12676096271",
      "ref": "node/12676096271",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12676096288",
      "ref": "node/12676096288",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12882207533",
      "ref": "node/12882207533",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12918903004",
      "ref": "node/12918903004",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13457547174",
      "ref": "node/13457547174",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13551425998",
      "ref": "node/13551425998",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1979260118",
      "ref": "node/1979260118",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2105495819",
      "ref": "node/2105495819",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2177676986",
      "ref": "node/2177676986",
      "kind": "neighbourhood"
    },
    {
      "id": "district-262116141",
      "ref": "node/262116141",
      "kind": "neighbourhood"
    },
    {
      "id": "district-262143087",
      "ref": "node/262143087",
      "kind": "neighbourhood"
    },
    {
      "id": "district-262147547",
      "ref": "node/262147547",
      "kind": "neighbourhood"
    },
    {
      "id": "district-262154383",
      "ref": "node/262154383",
      "kind": "neighbourhood"
    },
    {
      "id": "district-262158334",
      "ref": "node/262158334",
      "kind": "neighbourhood"
    },
    {
      "id": "district-264648240",
      "ref": "node/264648240",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2169086",
      "ref": "relation/2169086",
      "kind": "water"
    },
    {
      "id": "water-way-15800929",
      "ref": "way/15800929",
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
