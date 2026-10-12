import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dublin",
  "name": "Dublin",
  "country": {
    "idISOlower": "ie",
    "name": "Ireland"
  },
  "state": {
    "idunique": "ie-dublin",
    "name": "Dublin"
  },
  "timezone": "Europe/Dublin",
  "centre": {
    "lon": -6.2605593,
    "lat": 53.3493795
  },
  "airport": {
    "id": "dublin-airport",
    "name": "Dublin Airport",
    "lon": -6.262121,
    "lat": 53.428713,
    "sourceUrl": "https://ourairports.com/airports/EIDW/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/ireland-and-northern-ireland-261008.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "playerIntro": "Explore Dublin through its mapped neighborhoods, roads, and local places.",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -6.562818373934496,
    53.16849861006602,
    -5.958300226065504,
    53.53026038993398
  ],
  "names": {
    "area": "Dublin",
    "unit": "neighbourhood",
    "roadHub": "Adamstown"
  }
} satisfies DestinationFacts
