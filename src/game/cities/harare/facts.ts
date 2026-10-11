import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "harare",
  "name": "Harare",
  "country": {
    "idISOlower": "zw",
    "name": "Zimbabwe"
  },
  "state": {
    "idunique": "zw-harare",
    "name": "Harare"
  },
  "timezone": "Africa/Harare",
  "centre": {
    "lon": 31.045686,
    "lat": -17.831773
  },
  "airport": {
    "id": "harare-airport",
    "name": "Robert Gabriel Mugabe International Airport",
    "lon": 31.0928,
    "lat": -17.931801,
    "sourceUrl": "https://ourairports.com/airports/FVHA/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    30.92,
    -17.97,
    31.17,
    -17.73
  ],
  "coverageNote": "Harare: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), mapped inland water, main roads and named places mapped in OpenStreetMap. The airport coordinates are an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Harare",
    "unit": "district",
    "roadHub": "Harare"
  }
} satisfies DestinationFacts
