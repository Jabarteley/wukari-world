import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "luxembourg",
  "name": "Luxembourg",
  "country": {
    "idISOlower": "lu",
    "name": "Luxembourg"
  },
  "state": {
    "idunique": "lu-luxembourg",
    "name": "Luxembourg"
  },
  "timezone": "Europe/Brussels",
  "centre": {
    "lon": 6.129799,
    "lat": 49.6112768
  },
  "airport": {
    "id": "luxembourg-airport",
    "name": "Luxembourg-Findel International Airport",
    "lon": 6.212134,
    "lat": 49.626845,
    "sourceUrl": "https://ourairports.com/airports/ELLX/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/luxembourg-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    5.851495487379748,
    49.43039591006602,
    6.408102512620252,
    49.79215768993398
  ],
  "names": {
    "area": "Luxembourg",
    "unit": "starter play zone",
    "roadHub": "Cents-Hamm"
  }
} satisfies DestinationFacts
