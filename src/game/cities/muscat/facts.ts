import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "muscat",
  "name": "Muscat",
  "country": {
    "idISOlower": "om",
    "name": "Oman"
  },
  "state": {
    "idunique": "om-muscat",
    "name": "Muscat"
  },
  "timezone": "Asia/Dubai",
  "centre": {
    "lon": 58.5938134,
    "lat": 23.6123628
  },
  "airport": {
    "id": "muscat-airport",
    "name": "Muscat International Airport",
    "lon": 58.285268,
    "lat": 23.600218,
    "sourceUrl": "https://ourairports.com/airports/OOMS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    58.27546429885594,
    23.431481910066022,
    58.790164014151664,
    23.793243689933977
  ],
  "names": {
    "area": "Muscat",
    "unit": "starter play zone",
    "roadHub": "desert king llc"
  }
} satisfies DestinationFacts
