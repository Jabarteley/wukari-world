import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kingstown",
  "name": "Kingstown",
  "country": {
    "idISOlower": "vc",
    "name": "St Vincent"
  },
  "state": {
    "idunique": "vc-kingstown",
    "name": "Kingstown"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -61.2279621,
    "lat": 13.1561864
  },
  "airport": {
    "id": "kingstown-airport",
    "name": "Argyle International Airport",
    "lon": -61.148801,
    "lat": 13.159725,
    "sourceUrl": "https://ourairports.com/airports/TVSA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -61.41260416105407,
    12.97530551006602,
    -61.04332003894593,
    13.337067289933978
  ],
  "names": {
    "area": "Kingstown",
    "unit": "starter play zone",
    "roadHub": "Kingstown"
  }
} satisfies DestinationFacts
