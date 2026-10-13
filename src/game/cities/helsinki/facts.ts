import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "helsinki",
  "name": "Helsinki",
  "country": {
    "idISOlower": "fi",
    "name": "Finland"
  },
  "state": {
    "idunique": "fi-helsinki",
    "name": "Helsinki"
  },
  "timezone": "Europe/Helsinki",
  "centre": {
    "lon": 24.9435408,
    "lat": 60.1666204
  },
  "airport": {
    "id": "helsinki-airport",
    "name": "Helsinki Vantaa Airport",
    "lon": 24.963341,
    "lat": 60.318363,
    "sourceUrl": "https://ourairports.com/airports/EFHK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/finland-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    24.762469653099558,
    60.07617995503301,
    25.124611946900444,
    60.327407044496695
  ],
  "names": {
    "area": "Helsinki",
    "unit": "starter play zone",
    "roadHub": "Helsinki"
  }
} satisfies DestinationFacts
