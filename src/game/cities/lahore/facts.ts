import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "lahore",
  "name": "Lahore",
  "country": {
    "idISOlower": "pk",
    "name": "Pakistan"
  },
  "state": {
    "idunique": "pk-lahore",
    "name": "Lahore"
  },
  "timezone": "Asia/Karachi",
  "centre": {
    "lon": 74.3141829,
    "lat": 31.5656822
  },
  "airport": {
    "id": "lahore-airport",
    "name": "Allama Iqbal International Airport",
    "lon": 74.403603,
    "lat": 31.521601,
    "sourceUrl": "https://ourairports.com/airports/OPLA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/pakistan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    74.10291095737459,
    31.384801310066024,
    74.52545484262542,
    31.74656308993398
  ],
  "names": {
    "area": "Lahore",
    "unit": "starter play zone",
    "roadHub": "Jallo Manhala"
  }
} satisfies DestinationFacts
