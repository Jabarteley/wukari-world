import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "koror",
  "name": "Koror",
  "country": {
    "idISOlower": "pw",
    "name": "Palau"
  },
  "state": {
    "idunique": "pw-koror",
    "name": "Koror"
  },
  "timezone": "Pacific/Palau",
  "centre": {
    "lon": 134.4766767,
    "lat": 7.343275
  },
  "airport": {
    "id": "koror-airport",
    "name": "Roman Tmetuchl International Airport",
    "lon": 134.544085,
    "lat": 7.366965,
    "sourceUrl": "https://ourairports.com/airports/PTRO/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/palau-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    134.29545409185195,
    7.162394110066022,
    134.65789930814807,
    7.524155889933978
  ],
  "names": {
    "area": "Koror",
    "unit": "starter play zone",
    "roadHub": "Koror Port"
  }
} satisfies DestinationFacts
