import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "amman",
  "name": "Amman",
  "country": {
    "idISOlower": "jo",
    "name": "Jordan"
  },
  "state": {
    "idunique": "jo-amman",
    "name": "Amman"
  },
  "timezone": "Asia/Amman",
  "centre": {
    "lon": 35.9239625,
    "lat": 31.9515694
  },
  "airport": {
    "id": "amman-airport",
    "name": "Queen Alia International Airport",
    "lon": 35.9931983948,
    "lat": 31.7226009369,
    "sourceUrl": "https://ourairports.com/airports/OJAI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/jordan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    35.71180163823021,
    31.713556892403304,
    36.13612336176979,
    32.13245028993398
  ],
  "names": {
    "area": "Amman",
    "unit": "starter play zone",
    "roadHub": "Qasr Station"
  }
} satisfies DestinationFacts
