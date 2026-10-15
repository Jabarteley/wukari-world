import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ashmore",
  "name": "East Island",
  "country": {
    "idISOlower": "xa",
    "name": "Ashmore and Cartier Islands"
  },
  "state": {
    "idunique": "xa",
    "name": "East Island"
  },
  "timezone": "Australia/Perth",
  "centre": {
    "lon": 123.0956541,
    "lat": -12.2609346
  },
  "airport": {
    "id": "ashmore-airport",
    "name": "East Island",
    "lon": 123.0956705,
    "lat": -12.2590366,
    "sourceUrl": "https://www.openstreetmap.org/node/1717848188"
  },
  "sourceLabel": "OpenStreetMap country PBF",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/australia/ashmore-cartier-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0",
  "coverageNote": "Source-sampling bounds from a mapped place node and its mapped gateway node; the grouping is not an administrative-boundary claim. A mapped landing, heliport or track does not establish current operations or access.",
  "gateway": {
    "mode": "sea",
    "osmRef": "node/1717848188"
  },
  "bounds": [
    122.94848815470866,
    -12.315198866980195,
    123.15082224301472,
    -12.206670333019806
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "dili",
      "name": "Dili",
      "kind": "ship",
      "km": 494
    },
    {
      "to": "flying-fish-cove",
      "name": "Flying Fish Cove",
      "kind": "charter",
      "km": 1910
    }
  ],
  "names": {
    "area": "East Island",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
