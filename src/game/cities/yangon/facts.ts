import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "yangon",
  "name": "Yangon",
  "country": {
    "idISOlower": "mm",
    "name": "Myanmar (Burma)"
  },
  "state": {
    "idunique": "mm-yangon",
    "name": "Yangon"
  },
  "timezone": "Asia/Yangon",
  "centre": {
    "lon": 96.1609916,
    "lat": 16.7967129
  },
  "airport": {
    "id": "yangon-airport",
    "name": "Yangon International Airport",
    "lon": 96.1332015991,
    "lat": 16.907300949099998,
    "sourceUrl": "https://ourairports.com/airports/VYYY/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/myanmar-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    95.97314272669976,
    16.615832010066022,
    96.34884047330024,
    16.977593789933977
  ],
  "names": {
    "area": "Yangon",
    "unit": "starter play zone",
    "roadHub": "Paywetseikkon"
  }
} satisfies DestinationFacts
