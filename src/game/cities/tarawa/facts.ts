import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tarawa",
  "name": "South Tarawa",
  "country": {
    "idISOlower": "ki",
    "name": "Kiribati"
  },
  "state": {
    "idunique": "ki-tarawa",
    "name": "South Tarawa"
  },
  "timezone": "Pacific/Tarawa",
  "centre": {
    "lon": 173.0386512,
    "lat": 1.3490778
  },
  "airport": {
    "id": "tarawa-airport",
    "name": "Bonriki International Airport",
    "lon": 173.147003,
    "lat": 1.38164,
    "sourceUrl": "https://ourairports.com/airports/NGTA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/kiribati-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    172.858924892749,
    1.1681969100660217,
    173.218377507251,
    1.5299586899339785
  ],
  "names": {
    "area": "South Tarawa",
    "unit": "starter play zone",
    "roadHub": "Ferry to North Tarawa"
  }
} satisfies DestinationFacts
