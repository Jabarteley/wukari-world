import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "vienna",
  "name": "Vienna",
  "country": {
    "idISOlower": "at",
    "name": "Austria"
  },
  "state": {
    "idunique": "at-vienna",
    "name": "Vienna"
  },
  "timezone": "Europe/Vienna",
  "centre": {
    "lon": 16.3725042,
    "lat": 48.2083537
  },
  "airport": {
    "id": "vienna-airport",
    "name": "Vienna International Airport",
    "lon": 16.5697,
    "lat": 48.110298,
    "sourceUrl": "https://ourairports.com/airports/LOWW/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/austria-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    16.10195572445075,
    48.02747281006602,
    16.643052675549253,
    48.389234589933984
  ],
  "names": {
    "area": "Vienna",
    "unit": "starter play zone",
    "roadHub": "Wien Ottakring"
  }
} satisfies DestinationFacts
