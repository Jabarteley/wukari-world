import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "khartoum",
  "name": "Khartoum",
  "country": {
    "idISOlower": "sd",
    "name": "Sudan"
  },
  "state": {
    "idunique": "sd-khartoum",
    "name": "Khartoum"
  },
  "timezone": "Africa/Khartoum",
  "centre": {
    "lon": 32.5349123,
    "lat": 15.5635972
  },
  "airport": {
    "id": "khartoum-airport",
    "name": "Khartoum International Airport",
    "lon": 32.5532,
    "lat": 15.5895,
    "sourceUrl": "https://ourairports.com/airports/HSSK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/sudan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    32.34824662889724,
    15.382716310066021,
    32.72157797110276,
    15.74447808993398
  ],
  "names": {
    "area": "Khartoum",
    "unit": "starter play zone",
    "roadHub": "صينية القندول"
  }
} satisfies DestinationFacts
