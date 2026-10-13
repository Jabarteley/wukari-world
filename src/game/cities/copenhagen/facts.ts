import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "copenhagen",
  "name": "Copenhagen",
  "country": {
    "idISOlower": "dk",
    "name": "Denmark"
  },
  "state": {
    "idunique": "dk-copenhagen",
    "name": "Copenhagen"
  },
  "timezone": "Europe/Berlin",
  "centre": {
    "lon": 12.5700724,
    "lat": 55.6867243
  },
  "airport": {
    "id": "copenhagen-airport",
    "name": "Copenhagen Kastrup Airport",
    "lon": 12.656000137329,
    "lat": 55.617900848389,
    "sourceUrl": "https://ourairports.com/airports/EKCH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/denmark-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    12.249879981907252,
    55.50584341006602,
    12.89026481809275,
    55.86760518993398
  ],
  "names": {
    "area": "Copenhagen",
    "unit": "starter play zone",
    "roadHub": "Jægersborg"
  }
} satisfies DestinationFacts
