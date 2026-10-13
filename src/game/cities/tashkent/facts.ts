import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tashkent",
  "name": "Tashkent",
  "country": {
    "idISOlower": "uz",
    "name": "Uzbekistan"
  },
  "state": {
    "idunique": "uz-tashkent",
    "name": "Tashkent"
  },
  "timezone": "Asia/Tashkent",
  "centre": {
    "lon": 69.2787079,
    "lat": 41.3123363
  },
  "airport": {
    "id": "tashkent-airport",
    "name": "Tashkent International Airport",
    "lon": 69.281197,
    "lat": 41.2579,
    "sourceUrl": "https://ourairports.com/airports/UTTT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/uzbekistan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    69.03884936609705,
    41.13145541006602,
    69.51856643390295,
    41.49321718993398
  ],
  "names": {
    "area": "Tashkent",
    "unit": "starter play zone",
    "roadHub": "Novza (Hamza)"
  }
} satisfies DestinationFacts
