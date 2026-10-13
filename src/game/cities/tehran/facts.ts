import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tehran",
  "name": "Tehran",
  "country": {
    "idISOlower": "ir",
    "name": "Iran"
  },
  "state": {
    "idunique": "ir-tehran",
    "name": "Tehran"
  },
  "timezone": "Asia/Tehran",
  "centre": {
    "lon": 51.3896004,
    "lat": 35.6892523
  },
  "airport": {
    "id": "tehran-airport",
    "name": "Imam Khomeini International Airport",
    "lon": 51.152198791503906,
    "lat": 35.416099548339844,
    "sourceUrl": "https://ourairports.com/airports/OIIE/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/iran-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    51.14117485750729,
    35.40705550384315,
    51.6113105965208,
    35.87013318993398
  ],
  "names": {
    "area": "Tehran",
    "unit": "starter play zone",
    "roadHub": "Shahid Hemmat"
  }
} satisfies DestinationFacts
