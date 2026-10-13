import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "chisinau",
  "name": "Chișinău",
  "country": {
    "idISOlower": "md",
    "name": "Moldova"
  },
  "state": {
    "idunique": "md-chisinau",
    "name": "Chișinău"
  },
  "timezone": "Europe/Chisinau",
  "centre": {
    "lon": 28.8322923,
    "lat": 47.0245117
  },
  "airport": {
    "id": "chisinau-airport",
    "name": "Chişinău International Airport",
    "lon": 28.931704,
    "lat": 46.92774,
    "sourceUrl": "https://ourairports.com/airports/LUKK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/moldova-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    28.56783899526906,
    46.84363081006602,
    29.096745604730938,
    47.20539258993398
  ],
  "names": {
    "area": "Chișinău",
    "unit": "starter play zone",
    "roadHub": "Chisinau"
  }
} satisfies DestinationFacts
