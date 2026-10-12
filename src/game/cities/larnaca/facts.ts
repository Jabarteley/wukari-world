import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "larnaca",
  "name": "Larnaca",
  "country": {
    "idISOlower": "cy",
    "name": "Cyprus"
  },
  "state": {
    "idunique": "cy-larnaca",
    "name": "Larnaca"
  },
  "timezone": "Asia/Nicosia",
  "centre": {
    "lon": 33.6236184,
    "lat": 34.9236095
  },
  "airport": {
    "id": "larnaca-airport",
    "name": "Larnaca International Airport",
    "lon": 33.624901,
    "lat": 34.875099,
    "sourceUrl": "https://ourairports.com/airports/LCLK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/cyprus-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    33.40401051135458,
    34.74272861006602,
    33.84322628864542,
    35.10449038993398
  ],
  "names": {
    "area": "Larnaca",
    "unit": "starter play zone",
    "roadHub": "Larnaca Central Station"
  }
} satisfies DestinationFacts
