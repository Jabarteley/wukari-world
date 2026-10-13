import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "port-vila",
  "name": "Port Vila",
  "country": {
    "idISOlower": "vu",
    "name": "Vanuatu"
  },
  "state": {
    "idunique": "vu-port-vila",
    "name": "Port Vila"
  },
  "timezone": "Pacific/Efate",
  "centre": {
    "lon": 168.3150163,
    "lat": -17.7414972
  },
  "airport": {
    "id": "port-vila-airport",
    "name": "Bauerfield International Airport",
    "lon": 168.320007,
    "lat": -17.699301,
    "sourceUrl": "https://ourairports.com/airports/NVVV/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/vanuatu-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    168.1261911919271,
    -17.92237808993398,
    168.5038414080729,
    -17.560616310066024
  ],
  "names": {
    "area": "Port Vila",
    "unit": "starter play zone",
    "roadHub": "Local Bus"
  }
} satisfies DestinationFacts
