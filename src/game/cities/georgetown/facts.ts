import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "georgetown",
  "name": "Georgetown",
  "country": {
    "idISOlower": "gy",
    "name": "Guyana"
  },
  "state": {
    "idunique": "gy-georgetown",
    "name": "Georgetown"
  },
  "timezone": "America/Guyana",
  "centre": {
    "lon": -58.1455403,
    "lat": 6.8032561
  },
  "airport": {
    "id": "georgetown-airport",
    "name": "Cheddi Jagan International Airport",
    "lon": -58.254101,
    "lat": 6.49855,
    "sourceUrl": "https://ourairports.com/airports/SYCJ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/guyana-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -58.32654562080386,
    6.489505955503301,
    -57.96453497919614,
    6.984136989933978
  ],
  "names": {
    "area": "Georgetown",
    "unit": "starter play zone",
    "roadHub": "West Bank Bus Park"
  }
} satisfies DestinationFacts
