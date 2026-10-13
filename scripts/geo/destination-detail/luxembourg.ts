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
  "name": "Luxembourg",
  "box": [
    49.43039591006602,
    5.851495487379748,
    49.79215768993398,
    6.408102512620252
  ],
  "core": [
    49.566056577516505,
    6.060417268657366,
    49.65649702248349,
    6.199180731342635
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/25609667",
      "line": "Cents-Hamm, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/1480135589",
      "line": "La Distillerie, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "way/34248783",
      "line": "Centre National de la littérature, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/41407070",
      "line": "Centre Hospitalier de Luxembourg, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/39054579",
      "line": "Parc Gerlache, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "way/79885477",
      "line": "Centre Commercial Belle-Étoile, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "node/2844040292",
      "line": "Notre-Dame des Mineurs, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "way/146811861",
      "line": "Château de Bettembourg; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/10837810672",
      "line": "Administration du cadastre et de la topographie, a mapped place for the game."
    },
    {
      "key": "osm-way-460847721",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/460847721",
      "line": "University of Luxembourg, a mapped place for the game."
    },
    {
      "key": "osm-node-621867608",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/621867608",
      "line": "The Bock, a mapped place for the game."
    },
    {
      "key": "osm-node-258816379",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/258816379",
      "line": "Château de Septfontaines, a mapped place for the game."
    },
    {
      "key": "osm-node-365760606",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/365760606",
      "line": "Tumulus, a mapped place for the game."
    },
    {
      "key": "osm-node-588684577",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/588684577",
      "line": "Vicus Ricciacus, a mapped place for the game."
    },
    {
      "key": "osm-way-108752289",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/108752289",
      "line": "Saint-Michel, a mapped place for the game."
    },
    {
      "key": "osm-way-115712504",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/115712504",
      "line": "Saint-Sébastien, a mapped place for the game."
    },
    {
      "key": "osm-node-4250666792",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4250666792",
      "line": "Guillou Campagne, a mapped place for the game."
    },
    {
      "key": "osm-way-389682249",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/389682249",
      "line": "Stade Jos Haupert, a mapped place for the game."
    },
    {
      "key": "osm-way-526461841",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/526461841",
      "line": "Parc Heintz, a mapped place for the game."
    },
    {
      "key": "osm-way-469054630",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/469054630",
      "line": "Hôpital intercommunal de Steinfort, a mapped place for the game."
    },
    {
      "key": "osm-way-707074800",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/707074800",
      "line": "Stade de Luxembourg, a mapped place for the game."
    },
    {
      "key": "osm-way-50041968",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/50041968",
      "line": "Place de Gand, a mapped place for the game."
    },
    {
      "key": "osm-way-45252123",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "way/45252123",
      "line": "Ma langue sourit, a mapped place for the game."
    },
    {
      "key": "osm-way-48992138",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/48992138",
      "line": "University of Luxembourg - SnT, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10834274897",
      "ref": "node/10834274897",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1374388907",
      "ref": "node/1374388907",
      "kind": "neighbourhood"
    },
    {
      "id": "district-253129160",
      "ref": "node/253129160",
      "kind": "neighbourhood"
    },
    {
      "id": "district-276571566",
      "ref": "node/276571566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-279195028",
      "ref": "node/279195028",
      "kind": "neighbourhood"
    },
    {
      "id": "district-293380221",
      "ref": "node/293380221",
      "kind": "neighbourhood"
    },
    {
      "id": "district-470233038",
      "ref": "node/470233038",
      "kind": "neighbourhood"
    },
    {
      "id": "district-566672912",
      "ref": "node/566672912",
      "kind": "neighbourhood"
    },
    {
      "id": "district-566673442",
      "ref": "node/566673442",
      "kind": "neighbourhood"
    },
    {
      "id": "district-667900566",
      "ref": "node/667900566",
      "kind": "neighbourhood"
    },
    {
      "id": "district-667900568",
      "ref": "node/667900568",
      "kind": "neighbourhood"
    },
    {
      "id": "district-68778944",
      "ref": "node/68778944",
      "kind": "neighbourhood"
    },
    {
      "id": "district-1680979616",
      "ref": "node/1680979616",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2279678882",
      "ref": "node/2279678882",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2279678890",
      "ref": "node/2279678890",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2279678893",
      "ref": "node/2279678893",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2279678896",
      "ref": "node/2279678896",
      "kind": "neighbourhood"
    },
    {
      "id": "district-2279678899",
      "ref": "node/2279678899",
      "kind": "neighbourhood"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
