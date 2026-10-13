import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "hamilton",
  "name": "Hamilton",
  "country": {
    "idISOlower": "bm",
    "name": "Bermuda"
  },
  "state": {
    "idunique": "bm-hamilton",
    "name": "Hamilton"
  },
  "timezone": "Atlantic/Bermuda",
  "centre": {
    "lon": -64.7853167,
    "lat": 32.2942679
  },
  "airport": {
    "id": "hamilton-airport",
    "name": "L.F. Wade International Airport",
    "lon": -64.67824,
    "lat": 32.363802,
    "sourceUrl": "https://ourairports.com/airports/TXKF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/united-kingdom/bermuda-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -64.99828141790888,
    32.11338701006602,
    -64.5723519820911,
    32.47514878993398
  ],
  "names": {
    "area": "Hamilton",
    "unit": "starter play zone",
    "roadHub": "St. George's Ferry Terminal"
  }
} satisfies DestinationFacts
