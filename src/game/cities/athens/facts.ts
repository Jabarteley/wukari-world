import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "athens",
  "name": "Athens",
  "country": {
    "idISOlower": "gr",
    "name": "Greece"
  },
  "state": {
    "idunique": "gr-athens",
    "name": "Athens"
  },
  "timezone": "Europe/Athens",
  "centre": {
    "lon": 23.7348324,
    "lat": 37.9755648
  },
  "airport": {
    "id": "athens-airport",
    "name": "Athens Eleftherios Venizelos International Airport",
    "lon": 23.9445,
    "lat": 37.936401,
    "sourceUrl": "https://ourairports.com/airports/LGAV/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/greece-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    23.506349478745935,
    37.79468391006602,
    23.96331532125406,
    38.15644568993398
  ],
  "names": {
    "area": "Athens",
    "unit": "starter play zone",
    "roadHub": "Megaro Mousikis"
  }
} satisfies DestinationFacts
