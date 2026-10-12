import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dubai",
  "name": "Dubai",
  "country": {
    "idISOlower": "ae",
    "name": "United Arab Emirates"
  },
  "state": {
    "idunique": "ae-dubai",
    "name": "Dubai"
  },
  "timezone": "Asia/Dubai",
  "centre": {
    "lon": 55.2924146,
    "lat": 25.2647227
  },
  "airport": {
    "id": "dubai-airport",
    "name": "Dubai International Airport",
    "lon": 55.370992,
    "lat": 25.24979,
    "sourceUrl": "https://ourairports.com/airports/OMDB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    55.09345169001182,
    25.083841810066023,
    55.49137750998818,
    25.445603589933977
  ],
  "names": {
    "area": "Dubai",
    "unit": "starter play zone",
    "roadHub": "Burj Khalifa / Dubai Mall"
  }
} satisfies DestinationFacts
