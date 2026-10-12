import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "valletta",
  "name": "Valletta",
  "country": {
    "idISOlower": "mt",
    "name": "Malta"
  },
  "state": {
    "idunique": "mt-valletta",
    "name": "Valletta"
  },
  "timezone": "Europe/Malta",
  "centre": {
    "lon": 14.5136607,
    "lat": 35.8989979
  },
  "airport": {
    "id": "valletta-airport",
    "name": "Malta International Airport",
    "lon": 14.491546,
    "lat": 35.845932,
    "sourceUrl": "https://ourairports.com/airports/LMML/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/malta-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    14.291360579078136,
    35.71811701006602,
    14.735960820921866,
    36.07987878993398
  ],
  "names": {
    "area": "Valletta",
    "unit": "starter play zone",
    "roadHub": "Valletta Cruise Port"
  }
} satisfies DestinationFacts
