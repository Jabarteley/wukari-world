import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "moroni",
  "name": "Moroni",
  "country": {
    "idISOlower": "km",
    "name": "Comoros"
  },
  "state": {
    "idunique": "km-moroni",
    "name": "Moroni"
  },
  "timezone": "Africa/Nairobi",
  "centre": {
    "lon": 43.251909,
    "lat": -11.7040306
  },
  "airport": {
    "id": "moroni-airport",
    "name": "Prince Said Ibrahim International Airport",
    "lon": 43.2719,
    "lat": -11.5337,
    "sourceUrl": "https://ourairports.com/airports/FMCH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/comores-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    43.068311021747114,
    -11.884911489933979,
    43.43550697825288,
    -11.52314971006602
  ],
  "names": {
    "area": "Moroni",
    "unit": "starter play zone",
    "roadHub": "Gare du Nord"
  }
} satisfies DestinationFacts
