import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "santiago",
  "name": "Santiago",
  "country": {
    "idISOlower": "cl",
    "name": "Chile"
  },
  "state": {
    "idunique": "cl-santiago",
    "name": "Santiago"
  },
  "timezone": "America/Santiago",
  "centre": {
    "lon": -70.6510671,
    "lat": -33.4376995
  },
  "airport": {
    "id": "santiago-airport",
    "name": "Comodoro Arturo Merino Benítez International Airport",
    "lon": -70.78579711914062,
    "lat": -33.393001556396484,
    "sourceUrl": "https://ourairports.com/airports/SCEL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/chile-261010.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -70.86681494446434,
    -33.61858038993398,
    -70.43531925553567,
    -33.25681861006602
  ],
  "names": {
    "area": "Santiago",
    "unit": "starter play zone",
    "roadHub": "Toesca"
  }
} satisfies DestinationFacts
