import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "adamstown",
  "name": "Adamstown",
  "country": {
    "idISOlower": "pn",
    "name": "Pitcairn"
  },
  "state": {
    "idunique": "pn-adamstown",
    "name": "Adamstown"
  },
  "timezone": "Pacific/Pitcairn",
  "centre": {
    "lon": -130.100205,
    "lat": -25.066667
  },
  "airport": {
    "id": "adamstown-airport",
    "name": "Pitcairn",
    "lon": -130.096143,
    "lat": -25.068685,
    "sourceUrl": "https://www.openstreetmap.org/node/9392374700"
  },
  "sourceLabel": "OpenStreetMap country PBF",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/pitcairn-islands-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0",
  "coverageNote": "Source-sampling bounds from a mapped place node and its mapped gateway node; the grouping is not an administrative-boundary claim. A mapped landing, heliport or track does not establish current operations or access.",
  "gateway": {
    "mode": "sea",
    "osmRef": "node/9392374700"
  },
  "bounds": [
    -130.1498091000751,
    -25.111887222483492,
    -130.0506008999249,
    -25.021446777516505
  ],
  "generatedLinkPolicy": "authored-only",
  "links": [
    {
      "to": "auckland",
      "name": "Auckland",
      "kind": "ship",
      "km": 5343
    },
    {
      "to": "santiago",
      "name": "Santiago",
      "kind": "ship",
      "km": 5766
    }
  ],
  "names": {
    "area": "Adamstown",
    "unit": "starter play zone",
    "roadHub": "Pitcairn"
  }
} satisfies DestinationFacts
