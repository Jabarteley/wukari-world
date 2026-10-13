import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "st-georges",
  "name": "St. George's",
  "country": {
    "idISOlower": "gd",
    "name": "Grenada"
  },
  "state": {
    "idunique": "gd-st-georges",
    "name": "St. George's"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -61.751805,
    "lat": 12.0535331
  },
  "airport": {
    "id": "st-georges-airport",
    "name": "Maurice Bishop International Airport",
    "lon": -61.785302,
    "lat": 12.003996,
    "sourceUrl": "https://ourairports.com/airports/TGPY/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -61.93564240520758,
    11.87265221006602,
    -61.567967594792414,
    12.234413989933978
  ],
  "names": {
    "area": "St. George's",
    "unit": "starter play zone",
    "roadHub": "St George's Bus Terminus"
  }
} satisfies DestinationFacts
