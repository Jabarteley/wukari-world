import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "manama",
  "name": "Manama",
  "country": {
    "idISOlower": "bh",
    "name": "Bahrain"
  },
  "state": {
    "idunique": "bh-manama",
    "name": "Manama"
  },
  "timezone": "Asia/Qatar",
  "centre": {
    "lon": 50.5822436,
    "lat": 26.2235041
  },
  "airport": {
    "id": "manama-airport",
    "name": "Bahrain International Airport",
    "lon": 50.63764,
    "lat": 26.267295,
    "sourceUrl": "https://ourairports.com/airports/OBBI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    50.381655565634965,
    26.042623210066022,
    50.78283163436503,
    26.404384989933977
  ],
  "names": {
    "area": "Manama",
    "unit": "starter play zone",
    "roadHub": "Manama Bus Terminal"
  }
} satisfies DestinationFacts
