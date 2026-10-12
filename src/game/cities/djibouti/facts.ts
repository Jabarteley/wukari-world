import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "djibouti",
  "name": "Djibouti",
  "country": {
    "idISOlower": "dj",
    "name": "Djibouti"
  },
  "state": {
    "idunique": "dj-djibouti",
    "name": "Djibouti"
  },
  "timezone": "Africa/Nairobi",
  "centre": {
    "lon": 43.1472724,
    "lat": 11.5936903
  },
  "airport": {
    "id": "djibouti-airport",
    "name": "Djibouti-Ambouli Airport",
    "lon": 43.1595,
    "lat": 11.5473,
    "sourceUrl": "https://ourairports.com/airports/HDAM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/djibouti-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    42.96374846370639,
    11.412809410066021,
    43.33079633629361,
    11.77457118993398
  ],
  "names": {
    "area": "Djibouti",
    "unit": "starter play zone",
    "roadHub": "Nagad Station"
  }
} satisfies DestinationFacts
