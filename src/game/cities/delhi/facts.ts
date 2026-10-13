import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "delhi",
  "name": "Delhi",
  "country": {
    "idISOlower": "in",
    "name": "India"
  },
  "state": {
    "idunique": "in-delhi",
    "name": "Delhi"
  },
  "timezone": "Asia/Kolkata",
  "centre": {
    "lon": 77.2169781,
    "lat": 28.6664535
  },
  "airport": {
    "id": "delhi-airport",
    "name": "Indira Gandhi International Airport",
    "lon": 77.09519,
    "lat": 28.55563,
    "sourceUrl": "https://ourairports.com/airports/VIDP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/india-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    77.01186277269433,
    28.485572610066022,
    77.42209342730568,
    28.847334389933977
  ],
  "names": {
    "area": "Delhi",
    "unit": "starter play zone",
    "roadHub": "Ramesh Nagar"
  }
} satisfies DestinationFacts
