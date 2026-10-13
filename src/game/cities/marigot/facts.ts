import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "marigot",
  "name": "Marigot",
  "country": {
    "idISOlower": "mf",
    "name": "St Martin (French)"
  },
  "state": {
    "idunique": "mf-marigot",
    "name": "Marigot"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -63.0848869,
    "lat": 18.0668544
  },
  "airport": {
    "id": "marigot-airport",
    "name": "Grand Case-l'Espérance Airport",
    "lon": -63.047444,
    "lat": 18.100057,
    "sourceUrl": "https://ourairports.com/airports/TFFG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -63.27406249099159,
    17.885973510066023,
    -62.89571130900841,
    18.247735289933978
  ],
  "names": {
    "area": "Marigot",
    "unit": "starter play zone",
    "roadHub": "Voyage de Standing"
  }
} satisfies DestinationFacts
