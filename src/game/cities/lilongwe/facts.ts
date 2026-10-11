import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "lilongwe",
  "name": "Lilongwe",
  "country": {
    "idISOlower": "mw",
    "name": "Malawi"
  },
  "state": {
    "idunique": "mw-lilongwe",
    "name": "Lilongwe"
  },
  "timezone": "Africa/Blantyre",
  "centre": {
    "lon": 33.768144,
    "lat": -13.9875107
  },
  "airport": {
    "id": "kamuzu-international-airport",
    "name": "Kamuzu International Airport",
    "lon": 33.780998,
    "lat": -13.7894,
    "sourceUrl": "https://ourairports.com/airports/FWKI/"
  },
  "sourceLabel": "OpenStreetMap contributors via verified Geofabrik Malawi PBF extract",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0",
  "bounds": [
    33.64,
    -14.09,
    33.89,
    -13.75
  ],
  "coverageNote": "Lilongwe from mapped built-up land, inland water, roads and named places in a verified Malawi PBF extract. The airport point is a published directory reference, not an airport boundary or evidence of current schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Lilongwe",
    "unit": "district",
    "roadHub": "Bus Terminal Lilongwe"
  }
} satisfies DestinationFacts
