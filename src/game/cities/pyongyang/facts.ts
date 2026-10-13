import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "pyongyang",
  "name": "Pyongyang",
  "country": {
    "idISOlower": "kp",
    "name": "Korea (North)"
  },
  "state": {
    "idunique": "kp-pyongyang",
    "name": "Pyongyang"
  },
  "timezone": "Asia/Pyongyang",
  "centre": {
    "lon": 125.7526222,
    "lat": 39.0196585
  },
  "airport": {
    "id": "pyongyang-airport",
    "name": "Pyongyang Sunan International Airport",
    "lon": 125.669998,
    "lat": 39.224098,
    "sourceUrl": "https://ourairports.com/airports/ZKPY/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/north-korea-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    125.52078157518345,
    38.83877761006602,
    125.98446282481656,
    39.233142044496695
  ],
  "names": {
    "area": "Pyongyang",
    "unit": "starter play zone",
    "roadHub": "Puhŭng"
  }
} satisfies DestinationFacts
