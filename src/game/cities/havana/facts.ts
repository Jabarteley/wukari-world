import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "havana",
  "name": "Havana",
  "country": {
    "idISOlower": "cu",
    "name": "Cuba"
  },
  "state": {
    "idunique": "cu-havana",
    "name": "Havana"
  },
  "timezone": "America/Havana",
  "centre": {
    "lon": -82.3589631,
    "lat": 23.135305
  },
  "airport": {
    "id": "havana-airport",
    "name": "José Martí International Airport",
    "lon": -82.40910339355469,
    "lat": 22.989200592041016,
    "sourceUrl": "https://ourairports.com/airports/MUHA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/cuba-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -82.5546022865957,
    22.95442411006602,
    -82.1633239134043,
    23.316185889933976
  ],
  "names": {
    "area": "Havana",
    "unit": "starter play zone",
    "roadHub": "Havana"
  }
} satisfies DestinationFacts
