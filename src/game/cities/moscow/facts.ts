import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "moscow",
  "name": "Moscow",
  "country": {
    "idISOlower": "ru",
    "name": "Russia"
  },
  "state": {
    "idunique": "ru-moscow",
    "name": "Moscow"
  },
  "timezone": "Europe/Moscow",
  "centre": {
    "lon": 37.6174782,
    "lat": 55.7505412
  },
  "airport": {
    "id": "moscow-airport",
    "name": "Sheremetyevo International Airport",
    "lon": 37.386677,
    "lat": 55.977486,
    "sourceUrl": "https://ourairports.com/airports/UUEE/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/russia/central-fed-district-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    37.29675860998793,
    55.56966031006602,
    37.93819779001207,
    55.986530044496696
  ],
  "names": {
    "area": "Moscow",
    "unit": "starter play zone",
    "roadHub": "Черкизово"
  }
} satisfies DestinationFacts
