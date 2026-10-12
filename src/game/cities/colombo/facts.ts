import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "colombo",
  "name": "Colombo",
  "country": {
    "idISOlower": "lk",
    "name": "Sri Lanka"
  },
  "state": {
    "idunique": "lk-colombo",
    "name": "Colombo"
  },
  "timezone": "Asia/Colombo",
  "centre": {
    "lon": 79.8542005,
    "lat": 6.9388614
  },
  "airport": {
    "id": "colombo-airport",
    "name": "Bandaranaike International Colombo Airport",
    "lon": 79.88410186767578,
    "lat": 7.180759906768799,
    "sourceUrl": "https://ourairports.com/airports/VCBI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/sri-lanka-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    79.67314217675448,
    6.757980510066022,
    80.03525882324553,
    7.189803951265498
  ],
  "names": {
    "area": "Colombo",
    "unit": "starter play zone",
    "roadHub": "Maradana Railway Station"
  }
} satisfies DestinationFacts
