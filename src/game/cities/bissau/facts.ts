import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bissau",
  "name": "Bissau",
  "country": {
    "idISOlower": "gw",
    "name": "Guinea-Bissau"
  },
  "state": {
    "idunique": "gw-bissau",
    "name": "Bissau"
  },
  "timezone": "Africa/Bissau",
  "centre": {
    "lon": -15.583055,
    "lat": 11.861324
  },
  "airport": {
    "id": "bissau-airport",
    "name": "Osvaldo Vieira International Airport",
    "lon": -15.653596,
    "lat": 11.894262,
    "sourceUrl": "https://ourairports.com/airports/GGOV/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/guinea-bissau-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -15.766759809105654,
    11.68044311006602,
    -15.399350190894346,
    12.042204889933979
  ],
  "names": {
    "area": "Bissau",
    "unit": "starter play zone",
    "roadHub": "Paragem Central"
  }
} satisfies DestinationFacts
