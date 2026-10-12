import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "sao-tome",
  "name": "São Tomé",
  "country": {
    "idISOlower": "st",
    "name": "Sao Tome & Principe"
  },
  "state": {
    "idunique": "st-sao-tome",
    "name": "São Tomé"
  },
  "timezone": "Africa/Sao_Tome",
  "centre": {
    "lon": 6.7313031,
    "lat": 0.3389242
  },
  "airport": {
    "id": "sao-tome-airport",
    "name": "São Tomé International Airport",
    "lon": 6.71215,
    "lat": 0.378175,
    "sourceUrl": "https://ourairports.com/airports/FPST/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/sao-tome-and-principe-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    6.5516334710351485,
    0.15804331006602154,
    6.910972728964851,
    0.5198050899339784
  ],
  "names": {
    "area": "São Tomé",
    "unit": "starter play zone",
    "roadHub": "Comunidade local"
  }
} satisfies DestinationFacts
