import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tirana",
  "name": "Tirana",
  "country": {
    "idISOlower": "al",
    "name": "Albania"
  },
  "state": {
    "idunique": "al-tirana",
    "name": "Tirana"
  },
  "timezone": "Europe/Tirane",
  "centre": {
    "lon": 19.8184435,
    "lat": 41.3281482
  },
  "airport": {
    "id": "tirana-airport",
    "name": "Tirana International Airport Mother Teresa",
    "lon": 19.7206,
    "lat": 41.4147,
    "sourceUrl": "https://ourairports.com/airports/LATI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/albania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    19.578526393401457,
    41.14726731006602,
    20.058360606598544,
    41.50902908993398
  ],
  "names": {
    "area": "Tirana",
    "unit": "starter play zone",
    "roadHub": "Tirana International Airport"
  }
} satisfies DestinationFacts
