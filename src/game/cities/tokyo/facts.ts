import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tokyo",
  "name": "Tokyo",
  "country": {
    "idISOlower": "jp",
    "name": "Japan"
  },
  "state": {
    "idunique": "jp-tokyo",
    "name": "Tokyo"
  },
  "timezone": "Asia/Tokyo",
  "centre": {
    "lon": 139.7638947,
    "lat": 35.6768601
  },
  "airport": {
    "id": "tokyo-airport",
    "name": "Tokyo Haneda International Airport",
    "lon": 139.786958,
    "lat": 35.549678,
    "sourceUrl": "https://ourairports.com/airports/RJTT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/japan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    139.54221916662937,
    35.49597921006602,
    139.98557023337065,
    35.85774098993398
  ],
  "names": {
    "area": "Tokyo",
    "unit": "starter play zone",
    "roadHub": "Nippori"
  }
} satisfies DestinationFacts
