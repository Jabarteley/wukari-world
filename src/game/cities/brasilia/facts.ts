import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "brasilia",
  "name": "Brasília",
  "country": {
    "idISOlower": "br",
    "name": "Brazil"
  },
  "state": {
    "idunique": "br-brasilia",
    "name": "Brasília"
  },
  "timezone": "America/Sao_Paulo",
  "centre": {
    "lon": -47.8828,
    "lat": -15.7939869
  },
  "airport": {
    "id": "brasilia-airport",
    "name": "Presidente Juscelino Kubitschek International Airport",
    "lon": -47.920834,
    "lat": -15.869167,
    "sourceUrl": "https://ourairports.com/airports/SBBR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/brazil-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -48.06967903443277,
    -15.97486778993398,
    -47.69592096556724,
    -15.613106010066021
  ],
  "names": {
    "area": "Brasília",
    "unit": "starter play zone",
    "roadHub": "Brasília"
  }
} satisfies DestinationFacts
