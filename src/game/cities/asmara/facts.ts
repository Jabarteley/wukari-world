import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "asmara",
  "name": "Asmara",
  "country": {
    "idISOlower": "er",
    "name": "Eritrea"
  },
  "state": {
    "idunique": "er-asmara",
    "name": "Asmara"
  },
  "timezone": "Africa/Nairobi",
  "centre": {
    "lon": 38.9326763,
    "lat": 15.3389667
  },
  "airport": {
    "id": "asmara-airport",
    "name": "Asmara International Airport",
    "lon": 38.910702,
    "lat": 15.2919,
    "sourceUrl": "https://ourairports.com/airports/HHAS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/eritrea-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    38.746215290574156,
    15.158085810066021,
    39.11913730942584,
    15.51984758993398
  ],
  "names": {
    "area": "Asmara",
    "unit": "starter play zone",
    "roadHub": "Asmara"
  }
} satisfies DestinationFacts
