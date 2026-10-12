import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "niamey",
  "name": "Niamey",
  "country": {
    "idISOlower": "ne",
    "name": "Niger"
  },
  "state": {
    "idunique": "ne-niamey",
    "name": "Niamey"
  },
  "timezone": "Africa/Lagos",
  "centre": {
    "lon": 2.109823,
    "lat": 13.524834
  },
  "airport": {
    "id": "niamey-airport",
    "name": "Diori Hamani International Airport",
    "lon": 2.18361,
    "lat": 13.4815,
    "sourceUrl": "https://ourairports.com/airports/DRRN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/niger-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    1.9248950321127272,
    13.343953110066021,
    2.294750967887273,
    13.70571488993398
  ],
  "names": {
    "area": "Niamey",
    "unit": "starter play zone",
    "roadHub": "Sonef Tranport Voyageurs"
  }
} satisfies DestinationFacts
