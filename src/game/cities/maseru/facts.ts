import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "maseru",
  "name": "Maseru",
  "country": {
    "idISOlower": "ls",
    "name": "Lesotho"
  },
  "state": {
    "idunique": "ls-maseru",
    "name": "Maseru"
  },
  "timezone": "Africa/Maseru",
  "centre": {
    "lon": 27.478222,
    "lat": -29.310054
  },
  "airport": {
    "id": "maseru-airport",
    "name": "Moshoeshoe I International Airport",
    "lon": 27.554456,
    "lat": -29.456277,
    "sourceUrl": "https://ourairports.com/airports/FXMM/"
  },
  "sourceLabel": "OpenStreetMap contributors, Geofabrik Lesotho extract and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    27.35,
    -29.49,
    27.6,
    -29.21
  ],
  "coverageNote": "Maseru from the mapped built-up land around the city centre and its surrounding neighbourhoods: a sketch of the built-up extent traced from mapped land use, mapped inland water, main roads and named places from OpenStreetMap. The airport point is a published OurAirports dataset point, not an official aviation reference point or evidence of current schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Maseru",
    "unit": "district",
    "roadHub": "Maseru"
  }
} satisfies DestinationFacts
