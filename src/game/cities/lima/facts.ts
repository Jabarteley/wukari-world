import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "lima",
  "name": "Lima",
  "country": {
    "idISOlower": "pe",
    "name": "Peru"
  },
  "state": {
    "idunique": "pe-lima",
    "name": "Lima"
  },
  "timezone": "America/Lima",
  "centre": {
    "lon": -77.0305912,
    "lat": -12.0459808
  },
  "airport": {
    "id": "lima-airport",
    "name": "Jorge Chávez International Airport",
    "lon": -77.114305,
    "lat": -12.0219,
    "sourceUrl": "https://ourairports.com/airports/SPIM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/peru-261010.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -77.21442335255911,
    -12.22686168993398,
    -76.8467590474409,
    -11.865099910066021
  ],
  "names": {
    "area": "Lima",
    "unit": "starter play zone",
    "roadHub": "Estación Estadio Nacional"
  }
} satisfies DestinationFacts
