import type { DestinationFacts } from '../africa/types.ts'
export const FACTS = {
  "id": "brazzaville",
  "name": "Brazzaville",
  "country": {
    "idISOlower": "cg",
    "name": "Congo"
  },
  "state": {
    "idunique": "cg-starter",
    "name": "Brazzaville"
  },
  "timezone": "Africa/Brazzaville",
  "centre": {
    "lon": 15.28,
    "lat": -4.26
  },
  "airport": {
    "id": "brazzaville-airport",
    "name": "Maya-Maya International Airport",
    "lon": 15.253,
    "lat": -4.2517,
    "sourceUrl": "https://ourairports.com/airports/FCBB/"
  },
  "sourceLabel": "Natural Earth, OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "Natural Earth public domain; OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    15.16,
    -4.36,
    15.4,
    -4.16
  ],
  "coverageNote": "Brazzaville on the north bank of the Congo River: built-up extent traced from mapped land use, mapped river geometry, main roads and named places from the dated Geofabrik Republic of the Congo PBF. This is not an administrative boundary. The airport coordinates are an OurAirports dataset point, not evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Brazzaville",
    "unit": "district",
    "roadHub": "Gare CFCO"
  }
} satisfies DestinationFacts
