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
  "name": "St. John's",
  "box": [
    16.937576010066024,
    -62.03302534992644,
    17.29933778993398,
    -61.656676450073554
  ],
  "core": [
    17.07323667751651,
    -61.89185997817698,
    17.163677122483495,
    -61.79784182182301
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "node/208524019",
      "line": "East Bus Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/727564216",
      "line": "Abracadabra, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "relation/5969216",
      "line": "American University of Antigua, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/13790139925",
      "line": "Clare Hill Health Center, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/749853682",
      "line": "all saints park, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "relation/7553158",
      "line": "Heritage Market, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/396955695",
      "line": "St Georges Church, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "slotFallback": {
        "slot": "polling",
        "used": "amenity=courthouse",
        "ref": "way/150128834"
      },
      "ref": "way/150128834",
      "line": "High Court; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "node/4557434091",
      "line": "Antigua & Barbuda Transport Board Headquarters, a mapped place for the game."
    },
    {
      "key": "osm-node-13459831357",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/13459831357",
      "line": "University of Health Sciences Antigua (Dow’s Hill Campus), a mapped place for the game."
    },
    {
      "key": "osm-way-19881528",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/19881528",
      "line": "Sir Vivian Richards Stadium, a mapped place for the game."
    },
    {
      "key": "osm-way-1031834593",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1031834593",
      "line": "Fort James, a mapped place for the game."
    },
    {
      "key": "osm-way-19881453",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/19881453",
      "line": "Coolidge Cricket Ground, a mapped place for the game."
    },
    {
      "key": "osm-way-182023855",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/182023855",
      "line": "Clarence House, a mapped place for the game."
    },
    {
      "key": "osm-node-8761557614",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "node/8761557614",
      "line": "Ebenezer Methodist Church, a mapped place for the game."
    },
    {
      "key": "osm-way-1245381574",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "way/1245381574",
      "line": "Antigua Naval Dockyard and Related Archaeological Sites, a mapped place for the game."
    },
    {
      "key": "osm-way-150145638",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/150145638",
      "line": "Holy Family Cathedral, a mapped place for the game."
    },
    {
      "key": "osm-node-1264199603",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "node/1264199603",
      "line": "Devil's Bridge, a mapped place for the game."
    },
    {
      "key": "osm-node-4709905915",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4709905915",
      "line": "Turners Beach Bar, a mapped place for the game."
    },
    {
      "key": "osm-node-10243462034",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/10243462034",
      "line": "Beach Bum Bar & Cafe, a mapped place for the game."
    },
    {
      "key": "osm-way-347984242",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/347984242",
      "line": "Adelin Medical Centre, a mapped place for the game."
    },
    {
      "key": "osm-way-555984831",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/555984831",
      "line": "National Hero's Park, a mapped place for the game."
    },
    {
      "key": "osm-way-459204144",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/459204144",
      "line": "Sea View Farm Playfield, a mapped place for the game."
    },
    {
      "key": "osm-relation-5964183",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "relation/5964183",
      "line": "Antigua and Barbuda Hospitality Training Institute, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-14086359597",
      "ref": "node/14086359597",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14086359598",
      "ref": "node/14086359598",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14086359599",
      "ref": "node/14086359599",
      "kind": "neighbourhood"
    },
    {
      "id": "district-14086412802",
      "ref": "node/14086412802",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3637393539",
      "ref": "node/3637393539",
      "kind": "neighbourhood"
    },
    {
      "id": "district-5435642864",
      "ref": "node/5435642864",
      "kind": "neighbourhood"
    },
    {
      "id": "water-way-15104878",
      "ref": "way/15104878",
      "kind": "water"
    },
    {
      "id": "water-way-15105066",
      "ref": "way/15105066",
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
