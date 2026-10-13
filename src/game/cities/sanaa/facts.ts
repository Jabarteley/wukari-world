import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "sanaa",
  "name": "Sana'a",
  "country": {
    "idISOlower": "ye",
    "name": "Yemen"
  },
  "state": {
    "idunique": "ye-sanaa",
    "name": "Sana'a"
  },
  "timezone": "Asia/Riyadh",
  "centre": {
    "lon": 44.2058841,
    "lat": 15.3538569
  },
  "airport": {
    "id": "sanaa-airport",
    "name": "Sanaa International Airport",
    "lon": 44.2197,
    "lat": 15.4763,
    "sourceUrl": "https://ourairports.com/airports/OYSN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/yemen-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    44.01940962662008,
    15.172976010066021,
    44.392358573379916,
    15.53473778993398
  ],
  "names": {
    "area": "Sana'a",
    "unit": "starter play zone",
    "roadHub": "Bab Alyemen Bus Station"
  }
} satisfies DestinationFacts
