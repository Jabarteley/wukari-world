import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "nuuk",
  "name": "Nuuk",
  "country": {
    "idISOlower": "gl",
    "name": "Greenland"
  },
  "state": {
    "idunique": "gl-nuuk",
    "name": "Nuuk"
  },
  "timezone": "America/Nuuk",
  "centre": {
    "lon": -51.7361444,
    "lat": 64.1767049
  },
  "airport": {
    "id": "nuuk-airport",
    "name": "Nuuk International Airport",
    "lon": -51.67914,
    "lat": 64.191066,
    "sourceUrl": "https://ourairports.com/airports/BGGH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/north-america/greenland-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -52.15130533577506,
    63.99582401006602,
    -51.320983464224945,
    64.35758578993398
  ],
  "names": {
    "area": "Nuuk",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
