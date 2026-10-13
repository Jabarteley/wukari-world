import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "flying-fish-cove",
  "name": "Flying Fish Cove",
  "country": {
    "idISOlower": "cx",
    "name": "Christmas Island"
  },
  "state": {
    "idunique": "cx",
    "name": "Flying Fish Cove"
  },
  "timezone": "Asia/Bangkok",
  "centre": {
    "lon": 105.674413,
    "lat": -10.4213344
  },
  "airport": {
    "id": "flying-fish-cove-airport",
    "name": "Christmas Island International Airport",
    "lon": 105.6911,
    "lat": -10.450387,
    "sourceUrl": "https://ourairports.com/airports/YPXM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/australia/christmas-island-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    105.49163034263032,
    -10.602215289933978,
    105.85719565736969,
    -10.24045351006602
  ],
  "names": {
    "area": "Flying Fish Cove",
    "unit": "starter play zone",
    "roadHub": "Flying Fish Cove"
  }
} satisfies DestinationFacts
