import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "warsaw",
  "name": "Warsaw",
  "country": {
    "idISOlower": "pl",
    "name": "Poland"
  },
  "state": {
    "idunique": "pl-warsaw",
    "name": "Warsaw"
  },
  "timezone": "Europe/Warsaw",
  "centre": {
    "lon": 21.0067249,
    "lat": 52.2319581
  },
  "airport": {
    "id": "warsaw-airport",
    "name": "Warsaw Chopin Airport",
    "lon": 20.9671,
    "lat": 52.165699,
    "sourceUrl": "https://ourairports.com/airports/EPWA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/poland-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    20.712181006214685,
    52.05107721006602,
    21.30126879378531,
    52.41283898993398
  ],
  "names": {
    "area": "Warsaw",
    "unit": "starter play zone",
    "roadHub": "Warsaw East"
  }
} satisfies DestinationFacts
