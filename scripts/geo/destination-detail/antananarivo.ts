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
  "name": "Antananarivo",
  "box": [
    -19.01,
    47.39,
    -18.76,
    47.63
  ],
  "core": [
    -18.945,
    47.465,
    -18.875,
    47.555
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "ref": "node/335803824",
      "line": "Soarano, a mapped place for the game.",
      "category": "civic",
      "icon": "bus"
    },
    {
      "slot": "meal",
      "kind": "buka",
      "ref": "node/1107526880",
      "line": "Le Castel, a mapped place for the game.",
      "category": "food",
      "icon": "food"
    },
    {
      "slot": "community",
      "kind": "office",
      "ref": "node/6978575117",
      "line": "Archives Nationales Malagasy, a mapped place for the game.",
      "category": "work",
      "icon": "office"
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "ref": "node/11491535952",
      "line": "ONG Mobile Hilfe Madagaskar, a mapped place for the game.",
      "category": "care",
      "icon": "health"
    },
    {
      "slot": "recreation",
      "kind": "park",
      "ref": "node/11844416762",
      "line": "Parc Adventures - Vidzar, a mapped place for the game.",
      "category": "fun",
      "icon": "park"
    },
    {
      "slot": "market",
      "kind": "market",
      "ref": "way/1280878984",
      "line": "Marché Communale Alakamisy, a mapped place for the game.",
      "category": "work",
      "icon": "market"
    },
    {
      "slot": "worship",
      "kind": "worship",
      "ref": "way/511204750",
      "line": "Catholic Cathedral of Andohalo, a mapped place for the game.",
      "category": "fun",
      "icon": "worship"
    },
    {
      "slot": "polling",
      "kind": "polling",
      "ref": "node/5316749261",
      "line": "Kaominina Ankadikely Ilafy; voting here is a fictional game activity.",
      "category": "civic",
      "icon": "poll"
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "ref": "node/11849665965",
      "line": "Fokontany Ampanefy, a mapped place for the game.",
      "category": "civic",
      "icon": "civic"
    },
    {
      "key": "osm-way-1280560456",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/1280560456",
      "line": "Collège théologique Assemblée de Dieu, a mapped place for the game."
    },
    {
      "key": "osm-way-49037178",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/49037178",
      "line": "Stade Ampasamborona, a mapped place for the game."
    },
    {
      "key": "osm-way-52638460",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/52638460",
      "line": "Queen's Palace, a mapped place for the game."
    },
    {
      "key": "osm-node-4391442008",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "node/4391442008",
      "line": "Centre de loisirs Tanamasoanadro, a mapped place for the game."
    },
    {
      "key": "osm-node-13496096598",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/13496096598",
      "line": "CHRD Ambohimangakely, a mapped place for the game."
    },
    {
      "key": "osm-relation-16814959",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "relation/16814959",
      "line": "Kianja Barea Mahamasina, a mapped place for the game."
    },
    {
      "key": "osm-node-11888568626",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11888568626",
      "line": "LANGO Snack, a mapped place for the game."
    },
    {
      "key": "osm-way-1222327356",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1222327356",
      "line": "Stade Cnaps, a mapped place for the game."
    },
    {
      "key": "osm-way-1280179586",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1280179586",
      "line": "Casa Niñas, a mapped place for the game."
    },
    {
      "key": "osm-node-11840542812",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/11840542812",
      "line": "CSB II Ampangabe, a mapped place for the game."
    },
    {
      "key": "osm-node-11883673240",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/11883673240",
      "line": "Parc Antsaha Soa sy Tsara, a mapped place for the game."
    },
    {
      "key": "osm-node-11892950099",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/11892950099",
      "line": "Maxi Pizza bypass, a mapped place for the game."
    },
    {
      "key": "osm-relation-1167731",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "relation/1167731",
      "line": "Tsarasaotra Bird Park, a mapped place for the game."
    },
    {
      "key": "osm-way-798028413",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/798028413",
      "line": "Institut Supérieur de Travail Social, a mapped place for the game."
    },
    {
      "key": "osm-node-623568960",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/623568960",
      "line": "Faculté de Médecine Département Vétérinaire, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-10002341919",
      "ref": "node/10002341919",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10003457280",
      "ref": "node/10003457280",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10003457281",
      "ref": "node/10003457281",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10003570276",
      "ref": "node/10003570276",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10003613245",
      "ref": "node/10003613245",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10006414604",
      "ref": "node/10006414604",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10006414609",
      "ref": "node/10006414609",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240752",
      "ref": "node/10008240752",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240753",
      "ref": "node/10008240753",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240754",
      "ref": "node/10008240754",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240755",
      "ref": "node/10008240755",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240756",
      "ref": "node/10008240756",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240757",
      "ref": "node/10008240757",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240760",
      "ref": "node/10008240760",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240761",
      "ref": "node/10008240761",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240762",
      "ref": "node/10008240762",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10008240764",
      "ref": "node/10008240764",
      "kind": "neighbourhood"
    },
    {
      "id": "district-10559395465",
      "ref": "node/10559395465",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-26385344",
      "ref": "way/26385344",
      "kind": "water"
    },
    {
      "id": "water-way-26386172",
      "ref": "way/26386172",
      "kind": "water"
    },
    {
      "id": "water-way-27362768",
      "ref": "way/27362768",
      "kind": "water"
    }
  ]
},
discovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),
landuse: landuseQuery, roads: roadsQuery,
water: inlandWaterQuery,
} satisfies DetailConfig
