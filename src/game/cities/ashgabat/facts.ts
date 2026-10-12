import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ashgabat",
  "name": "Ashgabat",
  "country": {
    "idISOlower": "tm",
    "name": "Turkmenistan"
  },
  "state": {
    "idunique": "tm-ashgabat",
    "name": "Ashgabat"
  },
  "timezone": "Asia/Ashgabat",
  "centre": {
    "lon": 58.3823487,
    "lat": 37.9404648
  },
  "airport": {
    "id": "ashgabat-airport",
    "name": "Ashgabat International Airport",
    "lon": 58.361,
    "lat": 37.986801,
    "sourceUrl": "https://ourairports.com/airports/UTAA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/turkmenistan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    58.15397565716856,
    37.75958391006602,
    58.610721742831444,
    38.12134568993398
  ],
  "names": {
    "area": "Ashgabat",
    "unit": "starter play zone",
    "roadHub": "Ashgabat"
  }
} satisfies DestinationFacts
