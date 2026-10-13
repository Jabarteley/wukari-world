import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "roseau",
  "name": "Roseau",
  "country": {
    "idISOlower": "dm",
    "name": "Dominica"
  },
  "state": {
    "idunique": "dm-roseau",
    "name": "Roseau"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -61.3872868,
    "lat": 15.2991923
  },
  "airport": {
    "id": "roseau-airport",
    "name": "Douglas-Charles Airport",
    "lon": -61.301082,
    "lat": 15.546673,
    "sourceUrl": "https://ourairports.com/airports/TDPD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -61.573711916042896,
    15.11831141006602,
    -61.2008616839571,
    15.5557170444967
  ],
  "names": {
    "area": "Roseau",
    "unit": "starter play zone",
    "roadHub": "Roseau"
  }
} satisfies DestinationFacts
