import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "singapore",
  "name": "Singapore",
  "country": {
    "idISOlower": "sg",
    "name": "Singapore"
  },
  "state": {
    "idunique": "sg-singapore",
    "name": "Singapore"
  },
  "timezone": "Asia/Singapore",
  "centre": {
    "lon": 103.8519072,
    "lat": 1.2899175
  },
  "airport": {
    "id": "singapore-airport",
    "name": "Singapore Changi Airport",
    "lon": 103.994003,
    "lat": 1.35019,
    "sourceUrl": "https://ourairports.com/airports/WSSS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/malaysia-singapore-brunei-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    103.67218575336207,
    1.1090366100660216,
    104.03162864663793,
    1.4707983899339785
  ],
  "names": {
    "area": "Singapore",
    "unit": "starter play zone",
    "roadHub": "Aljunied"
  }
} satisfies DestinationFacts
