import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "zagreb",
  "name": "Zagreb",
  "country": {
    "idISOlower": "hr",
    "name": "Croatia"
  },
  "state": {
    "idunique": "hr-zagreb",
    "name": "Zagreb"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 15.9772795,
    "lat": 45.8130967
  },
  "airport": {
    "id": "zagreb-airport",
    "name": "Zagreb Franjo Tuđman International Airport",
    "lon": 16.0688,
    "lat": 45.742901,
    "sourceUrl": "https://ourairports.com/airports/LDZA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/croatia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    15.718673701335272,
    45.63221581006602,
    16.235885298664726,
    45.99397758993398
  ],
  "names": {
    "area": "Zagreb",
    "unit": "starter play zone",
    "roadHub": "Zagreb Zapadni kolodvor"
  }
} satisfies DestinationFacts
