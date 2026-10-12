import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tbilisi",
  "name": "Tbilisi",
  "country": {
    "idISOlower": "ge",
    "name": "Georgia"
  },
  "state": {
    "idunique": "ge-tbilisi",
    "name": "Tbilisi"
  },
  "timezone": "Asia/Tbilisi",
  "centre": {
    "lon": 44.8014495,
    "lat": 41.6934591
  },
  "airport": {
    "id": "tbilisi-airport",
    "name": "Tbilisi International Airport",
    "lon": 44.9547,
    "lat": 41.669201,
    "sourceUrl": "https://ourairports.com/airports/UGTB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/georgia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    44.560166009960646,
    41.51257821006602,
    45.04273299003935,
    41.87433998993398
  ],
  "names": {
    "area": "Tbilisi",
    "unit": "starter play zone",
    "roadHub": "300 Aragveli"
  }
} satisfies DestinationFacts
