import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "praia",
  "name": "Praia",
  "country": {
    "idISOlower": "cv",
    "name": "Cape Verde"
  },
  "state": {
    "idunique": "cv-praia",
    "name": "Praia"
  },
  "timezone": "Atlantic/Cape_Verde",
  "centre": {
    "lon": -23.5095095,
    "lat": 14.9162811
  },
  "airport": {
    "id": "praia-airport",
    "name": "Nelson Mandela International Airport",
    "lon": -23.484728,
    "lat": 14.941126,
    "sourceUrl": "https://ourairports.com/airports/GVNP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/cape-verde-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -23.695594354538553,
    14.735400210066022,
    -23.323424645461447,
    15.09716198993398
  ],
  "names": {
    "area": "Praia",
    "unit": "starter play zone",
    "roadHub": "Porto da Praia"
  }
} satisfies DestinationFacts
