import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "monaco",
  "name": "Monaco",
  "country": {
    "idISOlower": "mc",
    "name": "Monaco"
  },
  "state": {
    "idunique": "mc-monaco",
    "name": "Monaco"
  },
  "timezone": "Europe/Paris",
  "centre": {
    "lon": 7.4209592,
    "lat": 43.7310164
  },
  "airport": {
    "id": "monaco-airport",
    "name": "Monaco Heliport",
    "lon": 7.419673,
    "lat": 43.725798,
    "sourceUrl": "https://ourairports.com/airports/LNMC/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/france/provence-alpes-cote-d-azur-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    7.171569331894352,
    43.55013551006602,
    7.670349068105649,
    43.91189728993398
  ],
  "names": {
    "area": "Monaco",
    "unit": "starter play zone",
    "roadHub": "Monaco - Monte Carlo"
  }
} satisfies DestinationFacts
