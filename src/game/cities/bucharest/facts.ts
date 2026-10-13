import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bucharest",
  "name": "Bucharest",
  "country": {
    "idISOlower": "ro",
    "name": "Romania"
  },
  "state": {
    "idunique": "ro-bucharest",
    "name": "Bucharest"
  },
  "timezone": "Europe/Bucharest",
  "centre": {
    "lon": 26.102684,
    "lat": 44.4361414
  },
  "airport": {
    "id": "bucharest-airport",
    "name": "Bucharest Henri Coandă International Airport",
    "lon": 26.103285,
    "lat": 44.571792,
    "sourceUrl": "https://ourairports.com/airports/LROP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/romania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    25.850284672761397,
    44.255260510066016,
    26.355083327238603,
    44.61702228993398
  ],
  "names": {
    "area": "Bucharest",
    "unit": "starter play zone",
    "roadHub": "Chitila"
  }
} satisfies DestinationFacts
