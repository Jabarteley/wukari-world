import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "paris",
  "name": "Paris",
  "country": {
    "idISOlower": "fr",
    "name": "France"
  },
  "state": {
    "idunique": "fr-paris",
    "name": "Paris"
  },
  "timezone": "Europe/Paris",
  "centre": {
    "lon": 2.3483915,
    "lat": 48.8534951
  },
  "airport": {
    "id": "paris-airport",
    "name": "Charles de Gaulle International Airport",
    "lon": 2.554117,
    "lat": 49.00896,
    "sourceUrl": "https://ourairports.com/airports/LFPG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/france/ile-de-france-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    2.0881009083398387,
    48.68165825456273,
    2.608682091660161,
    49.02533194543728
  ],
  "names": {
    "area": "Paris",
    "unit": "starter play zone",
    "roadHub": "Malakoff - Rue Étienne Dolet"
  }
} satisfies DestinationFacts
