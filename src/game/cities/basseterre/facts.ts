import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "basseterre",
  "name": "Basseterre",
  "country": {
    "idISOlower": "kn",
    "name": "St Kitts & Nevis"
  },
  "state": {
    "idunique": "kn-basseterre",
    "name": "Basseterre"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -62.722301,
    "lat": 17.2960919
  },
  "airport": {
    "id": "basseterre-airport",
    "name": "Robert L. Bradshaw International Airport",
    "lon": -62.719117,
    "lat": 17.310845,
    "sourceUrl": "https://ourairports.com/airports/TKPK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -62.91065823289697,
    17.115211010066023,
    -62.53394376710303,
    17.476972789933978
  ],
  "names": {
    "area": "Basseterre",
    "unit": "starter play zone",
    "roadHub": "Seabridge"
  }
} satisfies DestinationFacts
