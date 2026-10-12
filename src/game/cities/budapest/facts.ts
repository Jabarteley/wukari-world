import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "budapest",
  "name": "Budapest",
  "country": {
    "idISOlower": "hu",
    "name": "Hungary"
  },
  "state": {
    "idunique": "hu-budapest",
    "name": "Budapest"
  },
  "timezone": "Europe/Budapest",
  "centre": {
    "lon": 19.0402383,
    "lat": 47.4978789
  },
  "airport": {
    "id": "budapest-airport",
    "name": "Budapest Liszt Ferenc International Airport",
    "lon": 19.262393,
    "lat": 47.43018,
    "sourceUrl": "https://ourairports.com/airports/LHBP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/hungary-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    18.773394700609295,
    47.31699801006602,
    19.307081899390703,
    47.678759789933984
  ],
  "names": {
    "area": "Budapest",
    "unit": "starter play zone",
    "roadHub": "Érd, autóbusz-állomás"
  }
} satisfies DestinationFacts
