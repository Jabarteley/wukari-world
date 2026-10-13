import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kyiv",
  "name": "Kyiv",
  "country": {
    "idISOlower": "ua",
    "name": "Ukraine"
  },
  "state": {
    "idunique": "ua-kyiv",
    "name": "Kyiv"
  },
  "timezone": "Europe/Kyiv",
  "centre": {
    "lon": 30.5241361,
    "lat": 50.4500336
  },
  "airport": {
    "id": "kyiv-airport",
    "name": "Boryspil International Airport",
    "lon": 30.894699,
    "lat": 50.345001,
    "sourceUrl": "https://ourairports.com/airports/UKBB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/ukraine-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    30.24089722954983,
    50.26915271006602,
    30.90877819032727,
    50.63091448993398
  ],
  "names": {
    "area": "Kyiv",
    "unit": "starter play zone",
    "roadHub": "Prospekt Nauky"
  }
} satisfies DestinationFacts
