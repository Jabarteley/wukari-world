import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "rome",
  "name": "Rome",
  "country": {
    "idISOlower": "it",
    "name": "Italy"
  },
  "state": {
    "idunique": "it-rome",
    "name": "Rome"
  },
  "timezone": "Europe/Rome",
  "centre": {
    "lon": 12.4829321,
    "lat": 41.8933203
  },
  "airport": {
    "id": "rome-airport",
    "name": "Rome–Fiumicino Leonardo da Vinci International Airport",
    "lon": 12.251998,
    "lat": 41.804532,
    "sourceUrl": "https://ourairports.com/airports/LIRF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/italy-261010.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "playerIntro": "Explore Rome through its mapped neighborhoods, roads, and local places.",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    12.239945277277313,
    41.71243941006602,
    12.724973924975998,
    42.07420118993398
  ],
  "names": {
    "area": "Rome",
    "unit": "quartiere",
    "roadHub": "Roma Prenestina"
  }
} satisfies DestinationFacts
