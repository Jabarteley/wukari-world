import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kyrenia",
  "name": "Kyrenia",
  "country": {
    "idISOlower": "xn",
    "name": "Northern Cyprus"
  },
  "state": {
    "idunique": "xn-kyrenia",
    "name": "Kyrenia"
  },
  "timezone": "Asia/Famagusta",
  "centre": {
    "lon": 33.3205287,
    "lat": 35.3396291
  },
  "airport": {
    "id": "kyrenia-airport",
    "name": "Ercan International Airport",
    "lon": 33.507352,
    "lat": 35.153064,
    "sourceUrl": "https://ourairports.com/airports/LCEN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/cyprus-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    33.09978836489444,
    35.1440199555033,
    33.54126903510556,
    35.520509989933984
  ],
  "names": {
    "area": "Kyrenia",
    "unit": "starter play zone",
    "roadHub": "Kyrenia Port"
  }
} satisfies DestinationFacts
