import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "vilnius",
  "name": "Vilnius",
  "country": {
    "idISOlower": "lt",
    "name": "Lithuania"
  },
  "state": {
    "idunique": "lt-vilnius",
    "name": "Vilnius"
  },
  "timezone": "Europe/Vilnius",
  "centre": {
    "lon": 25.2829111,
    "lat": 54.6870458
  },
  "airport": {
    "id": "vilnius-airport",
    "name": "Vilnius International Airport",
    "lon": 25.285801,
    "lat": 54.634102,
    "sourceUrl": "https://ourairports.com/airports/EYVI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/lithuania-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    24.970706513008302,
    54.50616491006602,
    25.595115686991697,
    54.86792668993398
  ],
  "names": {
    "area": "Vilnius",
    "unit": "starter play zone",
    "roadHub": "Lentvaris"
  }
} satisfies DestinationFacts
