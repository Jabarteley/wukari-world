import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "port-of-spain",
  "name": "Port of Spain",
  "country": {
    "idISOlower": "tt",
    "name": "Trinidad & Tobago"
  },
  "state": {
    "idunique": "tt",
    "name": "Port of Spain"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -61.5180173,
    "lat": 10.6572678
  },
  "airport": {
    "id": "port-of-spain-airport",
    "name": "Piarco International Airport",
    "lon": -61.337568,
    "lat": 10.59535,
    "sourceUrl": "https://ourairports.com/airports/TTPP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -61.70094250528619,
    10.47638691006602,
    -61.32842880207231,
    10.838148689933979
  ],
  "names": {
    "area": "Port of Spain",
    "unit": "starter play zone",
    "roadHub": "San Juan Bus Station"
  }
} satisfies DestinationFacts
