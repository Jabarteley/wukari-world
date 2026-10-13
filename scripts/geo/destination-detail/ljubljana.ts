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
  "name": "Ljubljana",
  "box": [
    45.86914591006602,
    14.247208961813255,
    46.232745044496696,
    14.766648838186745
  ],
  "core": [
    46.004806577516504,
    14.442158826507974,
    46.09524702248349,
    14.571698973492026
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/46350571",
      "line": "Trzin, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/181308219",
      "line": "AHotel, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/18841258",
      "line": "Knjižnica Medvode, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "relation/2226607",
      "line": "Univerzitetni rehabilitacijski inštitut Republike Slovenije - Soča, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/15045329",
      "line": "Park slovenske reformacije, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/785816151",
      "line": "Aleja, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/175985094",
      "line": "Župnijska cerkev svetega Vida, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/1036984484",
      "line": "Krekov trg; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/197202761",
      "line": "Selo Mansion, a mapped place for the game."
    },
    {
      "key": "osm-way-1561472443",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1561472443",
      "line": "Academy of Fine Arts and Design, a mapped place for the game."
    },
    {
      "key": "osm-way-1119457186",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1119457186",
      "line": "Stadion Domžale, a mapped place for the game."
    },
    {
      "key": "osm-node-7930305265",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/7930305265",
      "line": "Museum of Post and Telecommunications, a mapped place for the game."
    },
    {
      "key": "osm-way-106674045",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/106674045",
      "line": "Kunstljeva vila, a mapped place for the game."
    },
    {
      "key": "osm-way-166770310",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/166770310",
      "line": "Boštanjski grad, a mapped place for the game."
    },
    {
      "key": "osm-way-301226113",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/301226113",
      "line": "Cerkev svete Marjete, a mapped place for the game."
    },
    {
      "key": "osm-way-244860591",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/244860591",
      "line": "Župnijska cerkev svetega Jakoba, a mapped place for the game."
    },
    {
      "key": "osm-way-122905766",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/122905766",
      "line": "Planinski dom Komenda, a mapped place for the game."
    },
    {
      "key": "osm-relation-15822689",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/15822689",
      "line": "Stadion ŽAK, a mapped place for the game."
    },
    {
      "key": "osm-way-173167317",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/173167317",
      "line": "Arena Stožice, a mapped place for the game."
    },
    {
      "key": "osm-way-23057646",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/23057646",
      "line": "Shopping Center Citypark, a mapped place for the game."
    },
    {
      "key": "osm-way-200914350",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/200914350",
      "line": "Šlajmer Park, a mapped place for the game."
    },
    {
      "key": "osm-node-14208096624",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/14208096624",
      "line": "Academy of Fine Arts and Design - Tobacna, a mapped place for the game."
    },
    {
      "key": "osm-way-23061342",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/23061342",
      "line": "Bolnica Dr. Petra Držaja, a mapped place for the game."
    },
    {
      "key": "osm-relation-13216937",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/13216937",
      "line": "Park Gradaščica, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-11252295555",
      "ref": "node/11252295555",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11252763820",
      "ref": "node/11252763820",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11257649356",
      "ref": "node/11257649356",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11259988441",
      "ref": "node/11259988441",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11266209166",
      "ref": "node/11266209166",
      "kind": "neighbourhood"
    },
    {
      "id": "district-11266286647",
      "ref": "node/11266286647",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1282561914",
      "ref": "node/1282561914",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2354274692",
      "ref": "node/2354274692",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2354297545",
      "ref": "node/2354297545",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2354473596",
      "ref": "node/2354473596",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2385149175",
      "ref": "node/2385149175",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407356358",
      "ref": "node/2407356358",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407356359",
      "ref": "node/2407356359",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407356360",
      "ref": "node/2407356360",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407361787",
      "ref": "node/2407361787",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407362360",
      "ref": "node/2407362360",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407362988",
      "ref": "node/2407362988",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2407364723",
      "ref": "node/2407364723",
      "kind": "neighbourhood"
    },
    {
      "id": "water-relation-2273477",
      "ref": "relation/2273477",
      "kind": "water"
    },
    {
      "id": "water-relation-538336",
      "ref": "relation/538336",
      "kind": "water"
    },
    {
      "id": "water-way-966813644",
      "ref": "way/966813644",
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
