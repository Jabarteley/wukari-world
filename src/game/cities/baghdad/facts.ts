import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "baghdad",
  "name": "Baghdad",
  "country": {
    "idISOlower": "iq",
    "name": "Iraq"
  },
  "state": {
    "idunique": "iq-baghdad",
    "name": "Baghdad"
  },
  "timezone": "Asia/Baghdad",
  "centre": {
    "lon": 44.3872213,
    "lat": 33.3061701
  },
  "airport": {
    "id": "baghdad-airport",
    "name": "Baghdad International Airport / New Al Muthana Air Base",
    "lon": 44.2346,
    "lat": 33.262501,
    "sourceUrl": "https://ourairports.com/airports/ORBI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/iraq-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    44.17180167835458,
    33.12528921006602,
    44.60264092164542,
    33.487050989933984
  ],
  "names": {
    "area": "Baghdad",
    "unit": "starter play zone",
    "roadHub": "Allawi bus station"
  }
} satisfies DestinationFacts
