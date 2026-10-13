import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "san-marino",
  "name": "City of San Marino",
  "country": {
    "idISOlower": "sm",
    "name": "San Marino"
  },
  "state": {
    "idunique": "sm-san-marino",
    "name": "City of San Marino"
  },
  "timezone": "Europe/Rome",
  "centre": {
    "lon": 12.4466991,
    "lat": 43.9363996
  },
  "airport": {
    "id": "san-marino-airport",
    "name": "Torraccia Airfield",
    "lon": 12.511411,
    "lat": 43.948895,
    "sourceUrl": "https://ourairports.com/airports/LIKD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/italy-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    12.196443999539392,
    43.75551871006602,
    12.696954200460608,
    44.11728048993398
  ],
  "names": {
    "area": "City of San Marino",
    "unit": "starter play zone",
    "roadHub": "San Marino - Rimini"
  }
} satisfies DestinationFacts
