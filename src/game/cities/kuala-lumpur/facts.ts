import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kuala-lumpur",
  "name": "Kuala Lumpur",
  "country": {
    "idISOlower": "my",
    "name": "Malaysia"
  },
  "state": {
    "idunique": "my-kuala-lumpur",
    "name": "Kuala Lumpur"
  },
  "timezone": "Asia/Singapore",
  "centre": {
    "lon": 101.6942371,
    "lat": 3.1516964
  },
  "airport": {
    "id": "kuala-lumpur-airport",
    "name": "Kuala Lumpur International Airport",
    "lon": 101.709999,
    "lat": 2.74558,
    "sourceUrl": "https://ourairports.com/airports/WMKK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/malaysia-singapore-brunei-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    101.51427052810885,
    2.736535955503301,
    101.87420367189114,
    3.3325772899339787
  ],
  "names": {
    "area": "Kuala Lumpur",
    "unit": "starter play zone",
    "roadHub": "Kepong Sentral"
  }
} satisfies DestinationFacts
