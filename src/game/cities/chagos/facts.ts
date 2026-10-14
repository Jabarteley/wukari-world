import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "chagos",
  "name": "Île Boddam",
  "country": {
    "idISOlower": "io",
    "name": "British Indian Ocean Territory"
  },
  "state": {
    "idunique": "io",
    "name": "Île Boddam"
  },
  "timezone": "Indian/Chagos",
  "centre": {
    "lon": 72.2049217,
    "lat": -5.3574343
  },
  "airport": {
    "id": "chagos-airport",
    "name": "Île Boddam",
    "lon": 72.207191,
    "lat": -5.3556818,
    "sourceUrl": "https://www.openstreetmap.org/node/6436644966"
  },
  "sourceLabel": "OpenStreetMap country PBF",
  "sourceUrl": "https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-british-indian-ocean-territory-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0",
  "coverageNote": "Source-sampling bounds from a mapped place node and its mapped gateway node; the grouping is not an administrative-boundary claim. A mapped landing, heliport or track does not establish current operations or access.",
  "gateway": {
    "mode": "sea",
    "osmRef": "node/6436644966"
  },
  "bounds": [
    72.1327328879786,
    -5.429786655973592,
    72.2771105120214,
    -5.285081944026409
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "male",
      "name": "Malé",
      "kind": "ship",
      "km": 1070
    },
    {
      "to": "victoria",
      "name": "Victoria",
      "kind": "ship",
      "km": 1857
    }
  ],
  "names": {
    "area": "Île Boddam",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
