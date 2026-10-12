import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "phnom-penh",
  "name": "Phnom Penh",
  "country": {
    "idISOlower": "kh",
    "name": "Cambodia"
  },
  "state": {
    "idunique": "kh-phnom-penh",
    "name": "Phnom Penh"
  },
  "timezone": "Asia/Bangkok",
  "centre": {
    "lon": 104.9224426,
    "lat": 11.568271
  },
  "airport": {
    "id": "phnom-penh-airport",
    "name": "Techo International Airport",
    "lon": 104.921272,
    "lat": 11.359987,
    "sourceUrl": "https://ourairports.com/airports/KH-0002/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/cambodia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    104.73893561599425,
    11.350942955503301,
    105.10594958400574,
    11.749151889933978
  ],
  "names": {
    "area": "Phnom Penh",
    "unit": "starter play zone",
    "roadHub": "Phnom Penh"
  }
} satisfies DestinationFacts
