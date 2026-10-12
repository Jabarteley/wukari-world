import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "sofia",
  "name": "Sofia",
  "country": {
    "idISOlower": "bg",
    "name": "Bulgaria"
  },
  "state": {
    "idunique": "bg-sofia",
    "name": "Sofia"
  },
  "timezone": "Europe/Sofia",
  "centre": {
    "lon": 23.3217359,
    "lat": 42.6977028
  },
  "airport": {
    "id": "sofia-airport",
    "name": "Sofia Airport",
    "lon": 23.417671,
    "lat": 42.696357,
    "sourceUrl": "https://ourairports.com/airports/LBSF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/bulgaria-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    23.076562729712798,
    42.51682191006602,
    23.566909070287203,
    42.87858368993398
  ],
  "names": {
    "area": "Sofia",
    "unit": "starter play zone",
    "roadHub": "Obelya"
  }
} satisfies DestinationFacts
