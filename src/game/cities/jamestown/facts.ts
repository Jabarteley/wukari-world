import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "jamestown",
  "name": "Jamestown",
  "country": {
    "idISOlower": "sh",
    "name": "St Helena"
  },
  "state": {
    "idunique": "sh-jamestown",
    "name": "Jamestown"
  },
  "timezone": "Africa/Abidjan",
  "centre": {
    "lon": -5.7160872,
    "lat": -15.9277296
  },
  "airport": {
    "id": "jamestown-airport",
    "name": "Saint Helena International Airport",
    "lon": -5.646066,
    "lat": -15.958898,
    "sourceUrl": "https://ourairports.com/airports/FHSH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/saint-helena-ascension-and-tristan-da-cunha-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -5.90309170536018,
    -16.108610489933977,
    -5.529082694639819,
    -15.74684871006602
  ],
  "names": {
    "area": "Jamestown",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
