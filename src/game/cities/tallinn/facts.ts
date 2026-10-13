import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tallinn",
  "name": "Tallinn",
  "country": {
    "idISOlower": "ee",
    "name": "Estonia"
  },
  "state": {
    "idunique": "ee-tallinn",
    "name": "Tallinn"
  },
  "timezone": "Europe/Tallinn",
  "centre": {
    "lon": 24.7572693,
    "lat": 59.437242
  },
  "airport": {
    "id": "tallinn-airport",
    "name": "Lennart Meri Tallinn Airport",
    "lon": 24.83264,
    "lat": 59.413246,
    "sourceUrl": "https://ourairports.com/airports/EETN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/estonia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    24.402037752620263,
    59.25636111006602,
    25.11250084737974,
    59.61812288993398
  ],
  "names": {
    "area": "Tallinn",
    "unit": "starter play zone",
    "roadHub": "Saue"
  }
} satisfies DestinationFacts
