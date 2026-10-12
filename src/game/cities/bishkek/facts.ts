import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bishkek",
  "name": "Bishkek",
  "country": {
    "idISOlower": "kg",
    "name": "Kyrgyzstan"
  },
  "state": {
    "idunique": "kg-bishkek",
    "name": "Bishkek"
  },
  "timezone": "Asia/Bishkek",
  "centre": {
    "lon": 74.6036724,
    "lat": 42.8761424
  },
  "airport": {
    "id": "bishkek-airport",
    "name": "Manas International Airport",
    "lon": 74.4776,
    "lat": 43.061298,
    "sourceUrl": "https://ourairports.com/airports/UAFM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/kyrgyzstan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    74.35778696922806,
    42.69526151006602,
    74.84955783077193,
    43.0703420444967
  ],
  "names": {
    "area": "Bishkek",
    "unit": "starter play zone",
    "roadHub": "Bishkek 2"
  }
} satisfies DestinationFacts
