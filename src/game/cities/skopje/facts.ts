import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "skopje",
  "name": "Skopje",
  "country": {
    "idISOlower": "mk",
    "name": "North Macedonia"
  },
  "state": {
    "idunique": "mk-skopje",
    "name": "Skopje"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 21.4318881,
    "lat": 41.9962054
  },
  "airport": {
    "id": "skopje-airport",
    "name": "Skopje International Airport",
    "lon": 21.622581,
    "lat": 41.958087,
    "sourceUrl": "https://ourairports.com/airports/LWSK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/macedonia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    21.18945288314154,
    41.81532451006602,
    21.674323316858455,
    42.17708628993398
  ],
  "names": {
    "area": "Skopje",
    "unit": "starter play zone",
    "roadHub": "Kadina Reka"
  }
} satisfies DestinationFacts
