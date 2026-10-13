import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "nassau",
  "name": "Nassau",
  "country": {
    "idISOlower": "bs",
    "name": "Bahamas"
  },
  "state": {
    "idunique": "bs-nassau",
    "name": "Nassau"
  },
  "timezone": "America/Toronto",
  "centre": {
    "lon": -77.3383438,
    "lat": 25.0782266
  },
  "airport": {
    "id": "nassau-airport",
    "name": "Lynden Pindling International Airport",
    "lon": -77.466202,
    "lat": 25.039,
    "sourceUrl": "https://ourairports.com/airports/MYNN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/bahamas-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -77.53700009397514,
    24.897345710066023,
    -77.13968750602487,
    25.259107489933978
  ],
  "names": {
    "area": "Nassau",
    "unit": "starter play zone",
    "roadHub": "Paradise Island Ferry Terminal"
  }
} satisfies DestinationFacts
