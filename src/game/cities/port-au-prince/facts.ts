import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "port-au-prince",
  "name": "Port-au-Prince",
  "country": {
    "idISOlower": "ht",
    "name": "Haiti"
  },
  "state": {
    "idunique": "ht",
    "name": "Port-au-Prince"
  },
  "timezone": "America/Port-au-Prince",
  "centre": {
    "lon": -72.3395928,
    "lat": 18.547327
  },
  "airport": {
    "id": "port-au-prince-airport",
    "name": "Toussaint Louverture International Airport",
    "lon": -72.292596,
    "lat": 18.580023,
    "sourceUrl": "https://ourairports.com/airports/MTPP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/haiti-and-domrep-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -72.5292995685392,
    18.366446110066022,
    -72.14988603146081,
    18.728207889933977
  ],
  "names": {
    "area": "Port-au-Prince",
    "unit": "starter play zone",
    "roadHub": "Portail Léogâne"
  }
} satisfies DestinationFacts
