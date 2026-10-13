import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "vaduz",
  "name": "Vaduz",
  "country": {
    "idISOlower": "li",
    "name": "Liechtenstein"
  },
  "state": {
    "idunique": "li-vaduz",
    "name": "Vaduz"
  },
  "timezone": "Europe/Zurich",
  "centre": {
    "lon": 9.5227962,
    "lat": 47.1392862
  },
  "airport": {
    "id": "vaduz-airport",
    "name": "Balzers Heliport",
    "lon": 9.480774,
    "lat": 47.067908,
    "sourceUrl": "https://ourairports.com/airports/LSXB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/liechtenstein-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    9.257768935005949,
    46.95840531006602,
    9.787823464994052,
    47.32016708993398
  ],
  "names": {
    "area": "Vaduz",
    "unit": "starter play zone",
    "roadHub": "Nendeln"
  }
} satisfies DestinationFacts
