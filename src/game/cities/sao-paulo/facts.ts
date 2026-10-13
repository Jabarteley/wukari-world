import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "sao-paulo",
  "name": "São Paulo",
  "country": {
    "idISOlower": "br",
    "name": "Brazil"
  },
  "state": {
    "idunique": "br-sao-paulo",
    "name": "São Paulo"
  },
  "timezone": "America/Sao_Paulo",
  "centre": {
    "lon": -46.6333824,
    "lat": -23.5506507
  },
  "airport": {
    "id": "sao-paulo-airport",
    "name": "São Paulo/Guarulhos–Governor André Franco Montoro International Airport",
    "lon": -46.469954,
    "lat": -23.431274,
    "sourceUrl": "https://ourairports.com/airports/SBGR/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/brazil-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -46.82963992592198,
    -23.731531589933976,
    -46.43712487407802,
    -23.36976981006602
  ],
  "names": {
    "area": "São Paulo",
    "unit": "starter play zone",
    "roadHub": "Vila Madalena"
  }
} satisfies DestinationFacts
