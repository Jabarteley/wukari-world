import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "istanbul",
  "name": "Istanbul",
  "country": {
    "idISOlower": "tr",
    "name": "Turkey"
  },
  "state": {
    "idunique": "tr-istanbul",
    "name": "Istanbul"
  },
  "timezone": "Europe/Istanbul",
  "centre": {
    "lon": 28.9758715,
    "lat": 41.006381
  },
  "airport": {
    "id": "istanbul-airport",
    "name": "İstanbul Airport",
    "lon": 28.732136,
    "lat": 41.274874,
    "sourceUrl": "https://ourairports.com/airports/LTFM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/turkey-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    28.720181619192175,
    40.82550011006602,
    29.214605842962158,
    41.283918044496694
  ],
  "names": {
    "area": "Istanbul",
    "unit": "starter play zone",
    "roadHub": "Ayvansaray"
  }
} satisfies DestinationFacts
