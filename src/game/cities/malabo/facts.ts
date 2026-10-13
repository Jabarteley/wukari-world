import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "malabo",
  "name": "Malabo",
  "country": {
    "idISOlower": "gq",
    "name": "Equatorial Guinea"
  },
  "state": {
    "idunique": "gq-malabo",
    "name": "Malabo"
  },
  "timezone": "Africa/Lagos",
  "centre": {
    "lon": 8.7740663,
    "lat": 3.741877
  },
  "airport": {
    "id": "malabo-airport",
    "name": "Malabo International Airport",
    "lon": 8.70872,
    "lat": 3.75527,
    "sourceUrl": "https://ourairports.com/airports/FGSL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/equatorial-guinea-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    8.593982161081565,
    3.5609961100660215,
    8.954150438918434,
    3.922757889933979
  ],
  "names": {
    "area": "Malabo",
    "unit": "starter play zone",
    "roadHub": "Puerto de Malabo"
  }
} satisfies DestinationFacts
