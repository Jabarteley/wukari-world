import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "prague",
  "name": "Prague",
  "country": {
    "idISOlower": "cz",
    "name": "Czech Republic"
  },
  "state": {
    "idunique": "cz-prague",
    "name": "Prague"
  },
  "timezone": "Europe/Prague",
  "centre": {
    "lon": 14.4212535,
    "lat": 50.0874654
  },
  "airport": {
    "id": "prague-airport",
    "name": "Václav Havel Airport Prague",
    "lon": 14.259911,
    "lat": 50.100874,
    "sourceUrl": "https://ourairports.com/airports/LKPR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/czech-republic-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    14.140176742559426,
    49.90658451006602,
    14.702330257440575,
    50.26834628993398
  ],
  "names": {
    "area": "Prague",
    "unit": "starter play zone",
    "roadHub": "I. P. Pavlova"
  }
} satisfies DestinationFacts
