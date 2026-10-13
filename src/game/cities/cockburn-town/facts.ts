import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "cockburn-town",
  "name": "Cockburn Town",
  "country": {
    "idISOlower": "tc",
    "name": "Turks & Caicos Is"
  },
  "state": {
    "idunique": "tc",
    "name": "Cockburn Town"
  },
  "timezone": "America/Grand_Turk",
  "centre": {
    "lon": -71.1399956,
    "lat": 21.4607723
  },
  "airport": {
    "id": "cockburn-town-airport",
    "name": "JAGS McCartney International Airport",
    "lon": -71.142303,
    "lat": 21.4445,
    "sourceUrl": "https://ourairports.com/airports/MBGT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -71.33328292548742,
    21.27989141006602,
    -70.94670827451259,
    21.641653189933976
  ],
  "names": {
    "area": "Cockburn Town",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
