import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "monrovia",
  "name": "Monrovia",
  "country": {
    "idISOlower": "lr",
    "name": "Liberia"
  },
  "state": {
    "idunique": "lr-monrovia",
    "name": "Monrovia"
  },
  "timezone": "Africa/Monrovia",
  "centre": {
    "lon": -10.8060492,
    "lat": 6.3203562
  },
  "airport": {
    "id": "monrovia-airport",
    "name": "Roberts International Airport",
    "lon": -10.3623,
    "lat": 6.23379,
    "sourceUrl": "https://ourairports.com/airports/GLRB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/liberia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -10.986874246509581,
    6.139475310066022,
    -10.3532633001353,
    6.501237089933978
  ],
  "names": {
    "area": "Monrovia",
    "unit": "starter play zone",
    "roadHub": "Shared Taxi Station to Bo waterside"
  }
} satisfies DestinationFacts
