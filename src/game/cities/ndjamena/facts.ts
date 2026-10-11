import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ndjamena",
  "name": "N'Djamena",
  "country": {
    "idISOlower": "td",
    "name": "Chad"
  },
  "state": {
    "idunique": "td-ndjamena",
    "name": "N'Djamena"
  },
  "timezone": "Africa/Ndjamena",
  "centre": {
    "lon": 15.0502758,
    "lat": 12.1191543
  },
  "airport": {
    "id": "ndjamena-airport",
    "name": "N'Djamena International Airport",
    "lon": 15.034,
    "lat": 12.1337,
    "sourceUrl": "https://ourairports.com/airports/FTTJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/chad-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    14.866392607896925,
    11.93827341006602,
    15.234158992103074,
    12.300035189933979
  ],
  "names": {
    "area": "N'Djamena",
    "roadHub": "Gare d'Abeché",
    "unit": "starter play zone"
  }
} satisfies DestinationFacts
