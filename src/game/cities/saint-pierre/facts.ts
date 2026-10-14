import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "saint-pierre",
  "name": "Saint-Pierre",
  "country": {
    "idISOlower": "pm",
    "name": "St Pierre & Miquelon"
  },
  "state": {
    "idunique": "pm",
    "name": "Saint-Pierre"
  },
  "timezone": "America/Miquelon",
  "centre": {
    "lon": -56.1768672,
    "lat": 46.7775497
  },
  "airport": {
    "id": "saint-pierre-airport",
    "name": "Saint-Pierre Pointe-Blanche Airport",
    "lon": -56.17499,
    "lat": 46.762651,
    "sourceUrl": "https://ourairports.com/airports/LFVP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-saint-pierre-et-miquelon-wholeways-261013.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -56.44009746434139,
    46.59666881006602,
    -55.9136369356586,
    46.95843058993398
  ],
  "names": {
    "area": "Saint-Pierre",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
