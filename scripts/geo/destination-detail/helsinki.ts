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
  "maxRoads": 350,
  "roadMarginDegrees": 0.004,
  "surround": "#bcd596",
  "outlineTolerance": 0.0003,
  "waterTolerance": 0.0003,
  "farTolerance": 0.0008,
  "coreTolerance": 0.0004,
  "boundaryNote": "mapped built-up land use within the pinned source box",
  "terrainNote": "source-mapped water areas, main roads and recorded place labels",
  "source": "OpenStreetMap contributors via Geofabrik PBF",
  "name": "Helsinki",
  "box": [
    60.07617995503301,
    24.762469653099558,
    60.327407044496695,
    25.124611946900444
  ],
  "core": [
    60.121400177516506,
    24.853130081057834,
    60.21184062248349,
    25.033951518942168
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/25474663",
      "line": "Helsinki, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5679165168",
      "line": "Robert's Coffee, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/50821497",
      "line": "Roihuvuoren kirjasto, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/333579518",
      "line": "Malmi Hospital, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/4820257",
      "line": "Silkkiniitty, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/27518041",
      "line": "Centre commercial de Vantaanpuisto, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/119591025",
      "line": "Vaaralan kappeli, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "relation/9935906",
      "line": "Arabianaukio; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/11438211295",
      "line": "Finnish Institute for Health and Welfare, a mapped place for the game."
    },
    {
      "key": "osm-way-985184377",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/985184377",
      "line": "Metropolia University of Applied Sciences, Myyrmäki Campus, a mapped place for the game."
    },
    {
      "key": "osm-way-4254163",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/4254163",
      "line": "Veikkaus Arena, a mapped place for the game."
    },
    {
      "key": "osm-way-240369113",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/240369113",
      "line": "Viipurinkivi, a mapped place for the game."
    },
    {
      "key": "osm-way-378932257",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/378932257",
      "line": "Linnaisten Rautakaivos, a mapped place for the game."
    },
    {
      "key": "osm-way-320921828",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/320921828",
      "line": "Vantaan vapaaseurakunta, a mapped place for the game."
    },
    {
      "key": "osm-way-123034962",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/123034962",
      "line": "Vesikko, a mapped place for the game."
    },
    {
      "key": "osm-way-404325219",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/404325219",
      "line": "Merikylpylänpuisto, a mapped place for the game."
    },
    {
      "key": "osm-way-58253939",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/58253939",
      "line": "Puotilan kappeli, a mapped place for the game."
    },
    {
      "key": "osm-way-17038654",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/17038654",
      "line": "Kulosaaren Casino, a mapped place for the game."
    },
    {
      "key": "osm-way-23704046",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/23704046",
      "line": "National Defence University of Finland, a mapped place for the game."
    },
    {
      "key": "osm-way-218286514",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/218286514",
      "line": "Leppävaaran urheilupuisto, a mapped place for the game."
    },
    {
      "key": "osm-node-9712397575",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/9712397575",
      "line": "Friends & Brgrs, a mapped place for the game."
    },
    {
      "key": "osm-way-852039737",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/852039737",
      "line": "Länsiviitta, a mapped place for the game."
    },
    {
      "key": "osm-way-115770414",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/115770414",
      "line": "Viikki campus, a mapped place for the game."
    },
    {
      "key": "osm-way-91765309",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/91765309",
      "line": "Kauppakeskus Ruoholahti, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10154747633",
      "ref": "node/10154747633",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1017894464",
      "ref": "node/1017894464",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1048811766",
      "ref": "node/1048811766",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1078627941",
      "ref": "node/1078627941",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1078627942",
      "ref": "node/1078627942",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10886692151",
      "ref": "node/10886692151",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10905764290",
      "ref": "node/10905764290",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10905764291",
      "ref": "node/10905764291",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11302973068",
      "ref": "node/11302973068",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11628052331",
      "ref": "node/11628052331",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11759145369",
      "ref": "node/11759145369",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1192874887",
      "ref": "node/1192874887",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12188945006",
      "ref": "node/12188945006",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12193880573",
      "ref": "node/12193880573",
      "kind": "neighbourhood"
    },
    {
      "id": "district-12582383260",
      "ref": "node/12582383260",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1278669606",
      "ref": "node/1278669606",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1305277899",
      "ref": "node/1305277899",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1323450834",
      "ref": "node/1323450834",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-4777868",
      "ref": "way/4777868",
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
