import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bangui",
  "name": "Bangui",
  "country": {
    "idISOlower": "cf",
    "name": "Central African Rep."
  },
  "state": {
    "idunique": "cf-bangui",
    "name": "Bangui"
  },
  "timezone": "Africa/Lagos",
  "centre": {
    "lon": 18.5835913,
    "lat": 4.3635118
  },
  "airport": {
    "id": "bangui-airport",
    "name": "Bangui M'Poko International Airport",
    "lon": 18.518801,
    "lat": 4.39848,
    "sourceUrl": "https://ourairports.com/airports/FEFF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/central-african-republic-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    18.403362469626906,
    4.182630910066022,
    18.76382013037309,
    4.544392689933979
  ],
  "names": {
    "area": "Bangui",
    "unit": "starter play zone",
    "roadHub": "Terminal Nord"
  }
} satisfies DestinationFacts
