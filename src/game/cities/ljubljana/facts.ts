import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ljubljana",
  "name": "Ljubljana",
  "country": {
    "idISOlower": "si",
    "name": "Slovenia"
  },
  "state": {
    "idunique": "si-ljubljana",
    "name": "Ljubljana"
  },
  "timezone": "Europe/Belgrade",
  "centre": {
    "lon": 14.5069289,
    "lat": 46.0500268
  },
  "airport": {
    "id": "ljubljana-airport",
    "name": "Ljubljana Jože Pučnik Airport",
    "lon": 14.4576,
    "lat": 46.223701,
    "sourceUrl": "https://ourairports.com/airports/LJLJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/slovenia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    14.247208961813255,
    45.86914591006602,
    14.766648838186745,
    46.232745044496696
  ],
  "names": {
    "area": "Ljubljana",
    "unit": "starter play zone",
    "roadHub": "Trzin"
  }
} satisfies DestinationFacts
