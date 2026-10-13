import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "sydney",
  "name": "Sydney",
  "country": {
    "idISOlower": "au",
    "name": "Australia"
  },
  "state": {
    "idunique": "au-sydney",
    "name": "Sydney"
  },
  "timezone": "Australia/Sydney",
  "centre": {
    "lon": 151.2082848,
    "lat": -33.8698439
  },
  "airport": {
    "id": "sydney-airport",
    "name": "Sydney Kingsford Smith International Airport",
    "lon": 151.177002,
    "lat": -33.946098,
    "sourceUrl": "https://ourairports.com/airports/YSSY/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/australia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    150.9914434151979,
    -34.05072478993398,
    151.4251261848021,
    -33.68896301006602
  ],
  "names": {
    "area": "Sydney",
    "unit": "starter play zone",
    "roadHub": "St Leonards"
  }
} satisfies DestinationFacts
