import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kingston",
  "name": "Kingston",
  "country": {
    "idISOlower": "jm",
    "name": "Jamaica"
  },
  "state": {
    "idunique": "jm-kingston",
    "name": "Kingston"
  },
  "timezone": "America/Jamaica",
  "centre": {
    "lon": -76.7928128,
    "lat": 17.9712148
  },
  "airport": {
    "id": "kingston-airport",
    "name": "Norman Manley International Airport",
    "lon": -76.7874984741211,
    "lat": 17.935699462890625,
    "sourceUrl": "https://ourairports.com/airports/MKJP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/jamaica-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -76.98188459783609,
    17.79033391006602,
    -76.6037410021639,
    18.152095689933976
  ],
  "names": {
    "area": "Kingston",
    "unit": "starter play zone",
    "roadHub": "Spanish Town Railway Station"
  }
} satisfies DestinationFacts
