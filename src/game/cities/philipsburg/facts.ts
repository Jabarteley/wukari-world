import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "philipsburg",
  "name": "Philipsburg",
  "country": {
    "idISOlower": "sx",
    "name": "St Maarten (Dutch)"
  },
  "state": {
    "idunique": "sx",
    "name": "Philipsburg"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -63.0483073,
    "lat": 18.0250713
  },
  "airport": {
    "id": "philipsburg-airport",
    "name": "Princess Juliana International Airport",
    "lon": -63.108898,
    "lat": 18.041,
    "sourceUrl": "https://ourairports.com/airports/TNCM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -63.23743746692212,
    17.844190410066023,
    -62.85917713307788,
    18.205952189933978
  ],
  "names": {
    "area": "Philipsburg",
    "unit": "starter play zone",
    "roadHub": "Anguilla-St. Maarten Ferry Terminal"
  }
} satisfies DestinationFacts
