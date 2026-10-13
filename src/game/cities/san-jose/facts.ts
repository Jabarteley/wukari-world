import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "san-jose",
  "name": "San José",
  "country": {
    "idISOlower": "cr",
    "name": "Costa Rica"
  },
  "state": {
    "idunique": "cr-san-jose",
    "name": "San José"
  },
  "timezone": "America/Costa_Rica",
  "centre": {
    "lon": -84.0796683,
    "lat": 9.9327373
  },
  "airport": {
    "id": "san-jose-airport",
    "name": "Juan Santamaría International Airport",
    "lon": -84.208801,
    "lat": 9.99386,
    "sourceUrl": "https://ourairports.com/airports/MROC/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/costa-rica-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -84.26216628530693,
    9.75185641006602,
    -83.89717031469306,
    10.113618189933979
  ],
  "names": {
    "area": "San José",
    "unit": "starter play zone",
    "roadHub": "Atlántico"
  }
} satisfies DestinationFacts
