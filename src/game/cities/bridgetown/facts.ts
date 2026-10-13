import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bridgetown",
  "name": "Bridgetown",
  "country": {
    "idISOlower": "bb",
    "name": "Barbados"
  },
  "state": {
    "idunique": "bb-bridgetown",
    "name": "Bridgetown"
  },
  "timezone": "America/Barbados",
  "centre": {
    "lon": -59.6184184,
    "lat": 13.0977832
  },
  "airport": {
    "id": "bridgetown-airport",
    "name": "Grantley Adams International Airport",
    "lon": -59.491034,
    "lat": 13.074667,
    "sourceUrl": "https://ourairports.com/airports/TBPB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -59.803015947974664,
    12.916902310066021,
    -59.43382085202534,
    13.27866408993398
  ],
  "names": {
    "area": "Bridgetown",
    "unit": "starter play zone",
    "roadHub": "Speightstown Bus Terminal"
  }
} satisfies DestinationFacts
