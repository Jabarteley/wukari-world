import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "mariehamn",
  "name": "Mariehamn",
  "country": {
    "idISOlower": "ax",
    "name": "Åland Islands"
  },
  "state": {
    "idunique": "ax-mariehamn",
    "name": "Mariehamn"
  },
  "timezone": "Europe/Helsinki",
  "centre": {
    "lon": 19.94126,
    "lat": 60.102423
  },
  "airport": {
    "id": "mariehamn-airport",
    "name": "Mariehamn Airport",
    "lon": 19.898199,
    "lat": 60.1222,
    "sourceUrl": "https://ourairports.com/airports/EFMA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/finland-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    19.79676611367186,
    60.03007064402641,
    20.08575388632814,
    60.174775355973594
  ],
  "names": {
    "area": "Mariehamn",
    "unit": "starter play zone",
    "roadHub": "Mariehamn Western Harbour"
  }
} satisfies DestinationFacts
