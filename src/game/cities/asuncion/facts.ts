import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "asuncion",
  "name": "Asuncion",
  "country": {
    "idISOlower": "py",
    "name": "Paraguay"
  },
  "state": {
    "idunique": "py-asuncion",
    "name": "Asuncion"
  },
  "timezone": "America/Asuncion",
  "centre": {
    "lon": -57.6343814,
    "lat": -25.2800459
  },
  "airport": {
    "id": "asuncion-airport",
    "name": "Silvio Pettirossi International Airport",
    "lon": -57.519227,
    "lat": -25.240156,
    "sourceUrl": "https://ourairports.com/airports/SGAS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/paraguay-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -57.83336963854545,
    -25.46092678993398,
    -57.435393161454556,
    -25.099165010066024
  ],
  "names": {
    "area": "Asuncion",
    "unit": "starter play zone",
    "roadHub": "Línea 52"
  }
} satisfies DestinationFacts
