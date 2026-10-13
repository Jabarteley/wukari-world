import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "taipei",
  "name": "Taipei",
  "country": {
    "idISOlower": "tw",
    "name": "Taiwan"
  },
  "state": {
    "idunique": "tw-taipei",
    "name": "Taipei"
  },
  "timezone": "Asia/Taipei",
  "centre": {
    "lon": 121.5636796,
    "lat": 25.0375198
  },
  "airport": {
    "id": "taipei-airport",
    "name": "Taipei Songshan International Airport",
    "lon": 121.552822,
    "lat": 25.067244,
    "sourceUrl": "https://ourairports.com/airports/RCSS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/taiwan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    121.36508982644351,
    24.85663891006602,
    121.76226937355649,
    25.218400689933976
  ],
  "names": {
    "area": "Taipei",
    "unit": "starter play zone",
    "roadHub": "Taipower Building"
  }
} satisfies DestinationFacts
