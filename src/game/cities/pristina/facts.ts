import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "pristina",
  "name": "Pristina",
  "country": {
    "idISOlower": "xk",
    "name": "Kosovo"
  },
  "state": {
    "idunique": "xk-pristina",
    "name": "Pristina"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 21.1640849,
    "lat": 42.6638771
  },
  "airport": {
    "id": "pristina-airport",
    "name": "Priština Adem Jashari International Airport",
    "lon": 21.035801,
    "lat": 42.5728,
    "sourceUrl": "https://ourairports.com/airports/BKPR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/kosovo-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    20.919046015952425,
    42.48299621006602,
    21.409123784047573,
    42.84475798993398
  ],
  "names": {
    "area": "Pristina",
    "unit": "starter play zone",
    "roadHub": "Prishtinë"
  }
} satisfies DestinationFacts
