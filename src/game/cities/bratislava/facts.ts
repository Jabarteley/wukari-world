import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bratislava",
  "name": "Bratislava",
  "country": {
    "idISOlower": "sk",
    "name": "Slovakia"
  },
  "state": {
    "idunique": "sk-bratislava",
    "name": "Bratislava"
  },
  "timezone": "Europe/Prague",
  "centre": {
    "lon": 17.1082867,
    "lat": 48.1435026
  },
  "airport": {
    "id": "bratislava-airport",
    "name": "M. R. Štefánik Airport",
    "lon": 17.2127,
    "lat": 48.1702,
    "sourceUrl": "https://ourairports.com/airports/LZIB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/slovakia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    16.838082391051863,
    47.96262171006602,
    17.37849100894814,
    48.32438348993398
  ],
  "names": {
    "area": "Bratislava",
    "unit": "starter play zone",
    "roadHub": "Bratislava predmestie"
  }
} satisfies DestinationFacts
