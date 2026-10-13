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
  "name": "Djibouti",
  "box": [
    11.412809410066021,
    42.96374846370639,
    11.77457118993398,
    43.33079633629361
  ],
  "core": [
    11.548470077516505,
    43.101413920675924,
    11.638910522483496,
    43.19313087932407
  ],
  "places": [
    {
      "slot": "transit",
      "kind": "hub",
      "category": "civic",
      "icon": "bus",
      "ref": "way/568000828",
      "line": "Nagad Station, a mapped place for the game."
    },
    {
      "slot": "meal",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4958783931",
      "line": "Kiosque Lac-Abbé, a mapped place for the game."
    },
    {
      "slot": "community",
      "kind": "office",
      "category": "work",
      "icon": "office",
      "ref": "node/5417133614",
      "line": "Collège de Hayel Saïd, a mapped place for the game."
    },
    {
      "slot": "clinic",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/550937696",
      "line": "Hôpital Militaire, a mapped place for the game."
    },
    {
      "slot": "recreation",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/754578032",
      "line": "Rond-point du Progrès, a mapped place for the game."
    },
    {
      "slot": "market",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/7270748069",
      "line": "Djiba Djibouti, a mapped place for the game."
    },
    {
      "slot": "worship",
      "kind": "worship",
      "category": "fun",
      "icon": "worship",
      "ref": "way/228251516",
      "line": "Cathédrale Notre-Dame du Bon-Pasteur, a mapped place for the game."
    },
    {
      "slot": "polling",
      "kind": "polling",
      "category": "civic",
      "icon": "poll",
      "ref": "node/8091941734",
      "line": "Place cheick Moussa; voting here is a fictional game activity."
    },
    {
      "slot": "government",
      "kind": "statehouse",
      "category": "civic",
      "icon": "civic",
      "ref": "way/778712166",
      "line": "Poste frontière 1184 entre Djibouti et la Somalie, a mapped place for the game."
    },
    {
      "key": "osm-node-5345093773",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "node/5345093773",
      "line": "American Institute, a mapped place for the game."
    },
    {
      "key": "osm-way-1051274500",
      "kind": "viewing",
      "category": "fun",
      "icon": "view",
      "ref": "way/1051274500",
      "line": "El-Hadj Hassan Gouled Aptidon Stadium, a mapped place for the game."
    },
    {
      "key": "osm-node-4787069324",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/4787069324",
      "line": "Air Ops, a mapped place for the game."
    },
    {
      "key": "osm-node-5380475275",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "node/5380475275",
      "line": "Centre de santé communautaire Tora-Dora, a mapped place for the game."
    },
    {
      "key": "osm-node-4932312785",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/4932312785",
      "line": "Pizzaiolo Haramous, a mapped place for the game."
    },
    {
      "key": "osm-node-5351742924",
      "kind": "buka",
      "category": "food",
      "icon": "food",
      "ref": "node/5351742924",
      "line": "Café Gourmand, a mapped place for the game."
    },
    {
      "key": "osm-way-711138844",
      "kind": "hospital",
      "category": "care",
      "icon": "health",
      "ref": "way/711138844",
      "line": "Al-Rahma Hospital, a mapped place for the game."
    },
    {
      "key": "osm-node-3789244393",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/3789244393",
      "line": "Marché de Hayableh, a mapped place for the game."
    },
    {
      "key": "osm-way-575079686",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/575079686",
      "line": "Université de Djibouti - Campus de Balbala, a mapped place for the game."
    },
    {
      "key": "osm-node-14221742154",
      "kind": "walk",
      "category": "fun",
      "icon": "walk",
      "ref": "node/14221742154",
      "line": "Mémorial du Barrage de Djibouti EEGA, a mapped place for the game."
    },
    {
      "key": "osm-node-5313235263",
      "kind": "market",
      "category": "work",
      "icon": "market",
      "ref": "node/5313235263",
      "line": "maché wahle, a mapped place for the game."
    },
    {
      "key": "osm-way-383773335",
      "kind": "park",
      "category": "fun",
      "icon": "park",
      "ref": "way/383773335",
      "line": "Jardin, a mapped place for the game."
    },
    {
      "key": "osm-way-114934833",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/114934833",
      "line": "Mosquée Nouri, a mapped place for the game."
    },
    {
      "key": "osm-way-549877936",
      "kind": "worship",
      "category": "fun",
      "icon": "walk",
      "ref": "way/549877936",
      "line": "ARKAM, a mapped place for the game."
    },
    {
      "key": "osm-way-266382353",
      "kind": "quad",
      "category": "work",
      "icon": "school",
      "ref": "way/266382353",
      "line": "Université de Djibouti, a mapped place for the game."
    }
  ],
  "names": [
    {
      "id": "district-13104776027",
      "ref": "node/13104776027",
      "kind": "neighbourhood"
    },
    {
      "id": "district-13104776028",
      "ref": "node/13104776028",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3590205063",
      "ref": "node/3590205063",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394339",
      "ref": "node/3594394339",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394340",
      "ref": "node/3594394340",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394342",
      "ref": "node/3594394342",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394343",
      "ref": "node/3594394343",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394344",
      "ref": "node/3594394344",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394345",
      "ref": "node/3594394345",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394346",
      "ref": "node/3594394346",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394347",
      "ref": "node/3594394347",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394348",
      "ref": "node/3594394348",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394349",
      "ref": "node/3594394349",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394350",
      "ref": "node/3594394350",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394351",
      "ref": "node/3594394351",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394352",
      "ref": "node/3594394352",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394356",
      "ref": "node/3594394356",
      "kind": "neighbourhood"
    },
    {
      "id": "district-3594394362",
      "ref": "node/3594394362",
      "kind": "neighbourhood"
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
