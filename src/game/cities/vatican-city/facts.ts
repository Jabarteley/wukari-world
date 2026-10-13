import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "vatican-city",
  "name": "Vatican City",
  "country": {
    "idISOlower": "va",
    "name": "Vatican City"
  },
  "state": {
    "idunique": "va",
    "name": "Vatican City"
  },
  "timezone": "Europe/Rome",
  "centre": {
    "lon": 12.4528349,
    "lat": 41.9034912
  },
  "airport": {
    "id": "vatican-city-airport",
    "name": "Eliporto Internazionale della Città del Vaticano",
    "lon": 12.4465,
    "lat": 41.902,
    "sourceUrl": "https://ourairports.com/airports/VA-0001/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/italy/centro-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    12.210754277159126,
    41.72261031006602,
    12.694915522840873,
    42.08437208993398
  ],
  "names": {
    "area": "Vatican City",
    "unit": "starter play zone",
    "roadHub": "Vatican City"
  }
} satisfies DestinationFacts
