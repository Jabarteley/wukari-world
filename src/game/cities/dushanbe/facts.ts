import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dushanbe",
  "name": "Dushanbe",
  "country": {
    "idISOlower": "tj",
    "name": "Tajikistan"
  },
  "state": {
    "idunique": "tj-dushanbe",
    "name": "Dushanbe"
  },
  "timezone": "Asia/Dushanbe",
  "centre": {
    "lon": 68.785433,
    "lat": 38.5767045
  },
  "airport": {
    "id": "dushanbe-airport",
    "name": "Dushanbe International Airport",
    "lon": 68.822977,
    "lat": 38.543746,
    "sourceUrl": "https://ourairports.com/airports/UTDD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/tajikistan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    68.55503820132188,
    38.39582361006602,
    69.01582779867812,
    38.75758538993398
  ],
  "names": {
    "area": "Dushanbe",
    "unit": "starter play zone",
    "roadHub": "Dushanbe"
  }
} satisfies DestinationFacts
