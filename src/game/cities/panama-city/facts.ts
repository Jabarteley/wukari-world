import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "panama-city",
  "name": "Panama City",
  "country": {
    "idISOlower": "pa",
    "name": "Panama"
  },
  "state": {
    "idunique": "pa-panama-city",
    "name": "Panama City"
  },
  "timezone": "America/Panama",
  "centre": {
    "lon": -79.5341802,
    "lat": 8.9714493
  },
  "airport": {
    "id": "panama-city-airport",
    "name": "Tocumen International Airport",
    "lon": -79.383499,
    "lat": 9.07136,
    "sourceUrl": "https://ourairports.com/airports/MPTO/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/panama-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -79.71615922013568,
    8.79056841006602,
    -79.35220117986431,
    9.152330189933979
  ],
  "names": {
    "area": "Panama City",
    "unit": "starter play zone",
    "roadHub": "5 de Mayo"
  }
} satisfies DestinationFacts
