import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "new-york",
  "name": "New York",
  "country": {
    "idISOlower": "us",
    "name": "United States"
  },
  "state": {
    "idunique": "us-new-york",
    "name": "New York"
  },
  "timezone": "America/New_York",
  "centre": {
    "lon": -74.0060152,
    "lat": 40.7127281
  },
  "airport": {
    "id": "new-york-airport",
    "name": "John F. Kennedy International Airport",
    "lon": -73.779317,
    "lat": 40.639447,
    "sourceUrl": "https://ourairports.com/airports/KJFK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/north-america/us-northeast-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -74.24368676689816,
    40.53184721006602,
    -73.76747717952446,
    40.89360898993398
  ],
  "names": {
    "area": "New York",
    "unit": "starter play zone",
    "roadHub": "183rd Street"
  }
} satisfies DestinationFacts
