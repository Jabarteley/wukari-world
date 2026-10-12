import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kuwait-city",
  "name": "Kuwait City",
  "country": {
    "idISOlower": "kw",
    "name": "Kuwait"
  },
  "state": {
    "idunique": "kw-kuwait-city",
    "name": "Kuwait City"
  },
  "timezone": "Asia/Riyadh",
  "centre": {
    "lon": 47.9734174,
    "lat": 29.3796532
  },
  "airport": {
    "id": "kuwait-city-airport",
    "name": "Kuwait International Airport",
    "lon": 47.969813,
    "lat": 29.224487,
    "sourceUrl": "https://ourairports.com/airports/OKKK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    47.766869900506066,
    29.198772310066023,
    48.17996489949394,
    29.560534089933977
  ],
  "names": {
    "area": "Kuwait City",
    "unit": "starter play zone",
    "roadHub": "Hassawi"
  }
} satisfies DestinationFacts
