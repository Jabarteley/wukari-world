import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "port-louis",
  "name": "Port Louis",
  "country": {
    "idISOlower": "mu",
    "name": "Mauritius"
  },
  "state": {
    "idunique": "mu-port-louis",
    "name": "Port Louis"
  },
  "timezone": "Indian/Mauritius",
  "centre": {
    "lon": 57.5028044,
    "lat": -20.1624522
  },
  "airport": {
    "id": "port-louis-airport",
    "name": "Sir Seewoosagur Ramgoolam International Airport",
    "lon": 57.683601,
    "lat": -20.430201,
    "sourceUrl": "https://ourairports.com/airports/FIMP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/mauritius-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    57.31119049223443,
    -20.439245044496698,
    57.694418307765574,
    -19.981571310066023
  ],
  "names": {
    "area": "Port Louis",
    "unit": "starter play zone",
    "roadHub": "Port Louis Victoria"
  }
} satisfies DestinationFacts
