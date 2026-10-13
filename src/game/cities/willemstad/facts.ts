import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "willemstad",
  "name": "Willemstad",
  "country": {
    "idISOlower": "cw",
    "name": "Curaçao"
  },
  "state": {
    "idunique": "cw-willemstad",
    "name": "Willemstad"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -68.9351307,
    "lat": 12.1066695
  },
  "airport": {
    "id": "willemstad-airport",
    "name": "Hato International Airport",
    "lon": -68.959801,
    "lat": 12.1889,
    "sourceUrl": "https://ourairports.com/airports/TNCC/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -69.11900516055373,
    11.925788610066022,
    -68.75125623944628,
    12.28755038993398
  ],
  "names": {
    "area": "Willemstad",
    "unit": "starter play zone",
    "roadHub": "Punda Ferry Dock"
  }
} satisfies DestinationFacts
