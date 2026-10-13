import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "castries",
  "name": "Castries",
  "country": {
    "idISOlower": "lc",
    "name": "St Lucia"
  },
  "state": {
    "idunique": "lc-castries",
    "name": "Castries"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -60.9902359,
    "lat": 14.0095966
  },
  "airport": {
    "id": "castries-airport",
    "name": "Hewanorra International Airport",
    "lon": -60.952599,
    "lat": 13.7332,
    "sourceUrl": "https://ourairports.com/airports/TLPL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -61.17555287753564,
    13.724155955503301,
    -60.80491892246437,
    14.19047748993398
  ],
  "names": {
    "area": "Castries",
    "unit": "starter play zone",
    "roadHub": "Castries Ferry Terminal"
  }
} satisfies DestinationFacts
