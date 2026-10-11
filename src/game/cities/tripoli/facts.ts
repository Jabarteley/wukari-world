import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tripoli",
  "name": "Tripoli",
  "country": {
    "idISOlower": "ly",
    "name": "Libya"
  },
  "state": {
    "idunique": "ly-tripoli",
    "name": "Tripoli"
  },
  "timezone": "Africa/Tripoli",
  "centre": {
    "lon": 13.18,
    "lat": 32.89
  },
  "airport": {
    "id": "mitiga-international-airport",
    "name": "Mitiga International Airport",
    "lon": 13.287878,
    "lat": 32.89177,
    "sourceUrl": "https://ourairports.com/airports/HLLM/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    13.08,
    32.79,
    13.32,
    32.99
  ],
  "coverageNote": "Tripoli: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), the Mediterranean Sea and mapped inland water, roads, neighbourhoods and named places from OpenStreetMap. The arrival point for Mitiga International Airport (MJI/HLLM) comes from the OurAirports dataset and is not evidence of current operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Tripoli",
    "unit": "neighbourhood",
    "roadHub": "Ad Dahra Bus Station"
  }
} satisfies DestinationFacts
