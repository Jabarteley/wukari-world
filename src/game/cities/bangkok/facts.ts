import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bangkok",
  "name": "Bangkok",
  "country": {
    "idISOlower": "th",
    "name": "Thailand"
  },
  "state": {
    "idunique": "th-bangkok",
    "name": "Bangkok"
  },
  "timezone": "Asia/Bangkok",
  "centre": {
    "lon": 100.4935089,
    "lat": 13.7524938
  },
  "airport": {
    "id": "bangkok-airport",
    "name": "Suvarnabhumi Airport",
    "lon": 100.747002,
    "lat": 13.6811,
    "sourceUrl": "https://ourairports.com/airports/VTBS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/thailand-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    100.30840009468739,
    13.57161291006602,
    100.75624778595025,
    13.933374689933979
  ],
  "names": {
    "area": "Bangkok",
    "unit": "starter play zone",
    "roadHub": "Sala Ya"
  }
} satisfies DestinationFacts
