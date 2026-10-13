import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "beirut",
  "name": "Beirut",
  "country": {
    "idISOlower": "lb",
    "name": "Lebanon"
  },
  "state": {
    "idunique": "lb-beirut",
    "name": "Beirut"
  },
  "timezone": "Asia/Beirut",
  "centre": {
    "lon": 35.47843,
    "lat": 33.8959203
  },
  "airport": {
    "id": "beirut-airport",
    "name": "Beirut Rafic Hariri International Airport",
    "lon": 35.487443,
    "lat": 33.819833,
    "sourceUrl": "https://ourairports.com/airports/OLBA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/lebanon-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    35.261521878683276,
    33.71503941006602,
    35.69533812131673,
    34.07680118993398
  ],
  "names": {
    "area": "Beirut",
    "unit": "starter play zone",
    "roadHub": "Charles Hélou Bus Station"
  }
} satisfies DestinationFacts
