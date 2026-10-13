import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "amsterdam",
  "name": "Amsterdam",
  "country": {
    "idISOlower": "nl",
    "name": "Netherlands"
  },
  "state": {
    "idunique": "nl-amsterdam",
    "name": "Amsterdam"
  },
  "timezone": "Europe/Brussels",
  "centre": {
    "lon": 4.8924534,
    "lat": 52.3730796
  },
  "airport": {
    "id": "amsterdam-airport",
    "name": "Amsterdam Airport Schiphol",
    "lon": 4.76389,
    "lat": 52.308601,
    "sourceUrl": "https://ourairports.com/airports/EHAM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/netherlands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    4.596963101338747,
    52.192198710066016,
    5.187943698661253,
    52.55396048993398
  ],
  "names": {
    "area": "Amsterdam",
    "unit": "starter play zone",
    "roadHub": "Nieuw Vennep"
  }
} satisfies DestinationFacts
