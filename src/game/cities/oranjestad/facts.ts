import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "oranjestad",
  "name": "Oranjestad",
  "country": {
    "idISOlower": "aw",
    "name": "Aruba"
  },
  "state": {
    "idunique": "aw-oranjestad",
    "name": "Oranjestad"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -70.0371329,
    "lat": 12.5201024
  },
  "airport": {
    "id": "oranjestad-airport",
    "name": "Queen Beatrix International Airport",
    "lon": -70.014281,
    "lat": 12.501056,
    "sourceUrl": "https://ourairports.com/airports/TNCA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -70.22130160114335,
    12.339221510066022,
    -69.85296419885665,
    12.70098328993398
  ],
  "names": {
    "area": "Oranjestad",
    "unit": "starter play zone",
    "roadHub": "De Palm Island Ferry Teminal"
  }
} satisfies DestinationFacts
