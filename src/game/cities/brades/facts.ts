import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "brades",
  "name": "Brades",
  "country": {
    "idISOlower": "ms",
    "name": "Montserrat"
  },
  "state": {
    "idunique": "ms-brades",
    "name": "Brades"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -62.2099434,
    "lat": 16.7898749
  },
  "airport": {
    "id": "brades-airport",
    "name": "John A. Osborne Airport",
    "lon": -62.193204,
    "lat": 16.791835,
    "sourceUrl": "https://ourairports.com/airports/TRPG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -62.37898494990648,
    16.62708209905942,
    -62.04090185009352,
    16.95266770094058
  ],
  "names": {
    "area": "Brades",
    "unit": "starter play zone",
    "roadHub": "Montserrat Ferry Terminal"
  }
} satisfies DestinationFacts
