import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "djibouti",
  "name": "Djibouti",
  "country": {
    "idISOlower": "dj",
    "name": "Djibouti"
  },
  "state": {
    "idunique": "dj-starter",
    "name": "Djibouti"
  },
  "timezone": "Africa/Djibouti",
  "centre": {
    "lon": 43.15,
    "lat": 11.6
  },
  "airport": {
    "id": "djibouti-airport",
    "name": "Djibouti-Ambouli Airport",
    "lon": 43.1595,
    "lat": 11.5473,
    "sourceUrl": "https://ourairports.com/airports/HDAM/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    43.03,
    11.5,
    43.27,
    11.7
  ],
  "coverageNote": "Djibouti city, from the mapped land use and named places. The dated offline source includes the Gulf of Tadjoura coastline, port basins and Ambouli water features. Coastal water is represented as a band along the sourced shore. The airport coordinates are an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Djibouti",
    "unit": "district",
    "roadHub": "Gare Routière Centrale"
  }
} satisfies DestinationFacts
