import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ramallah",
  "name": "Ramallah",
  "country": {
    "idISOlower": "ps",
    "name": "Palestine"
  },
  "state": {
    "idunique": "ps-ramallah",
    "name": "Ramallah"
  },
  "timezone": "Asia/Hebron",
  "centre": {
    "lon": 35.1952255,
    "lat": 31.9030543
  },
  "airport": {
    "id": "ramallah-airport",
    "name": "Ramallah Heliport",
    "lon": 35.20756,
    "lat": 31.91123,
    "sourceUrl": "https://ourairports.com/airports/ZDM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/israel-and-palestine-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    34.983177336342926,
    31.722173410066024,
    35.40727366365707,
    32.08393518993398
  ],
  "names": {
    "area": "Ramallah",
    "unit": "starter play zone",
    "roadHub": "Ramallah Bus And Taxi Center Station"
  }
} satisfies DestinationFacts
