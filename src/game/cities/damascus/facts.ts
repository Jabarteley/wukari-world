import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "damascus",
  "name": "Damascus",
  "country": {
    "idISOlower": "sy",
    "name": "Syria"
  },
  "state": {
    "idunique": "sy-damascus",
    "name": "Damascus"
  },
  "timezone": "Asia/Damascus",
  "centre": {
    "lon": 36.3095814,
    "lat": 33.5130695
  },
  "airport": {
    "id": "damascus-airport",
    "name": "Damascus International Airport",
    "lon": 36.51559829711914,
    "lat": 33.4114990234375,
    "sourceUrl": "https://ourairports.com/airports/OSDI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/syria-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    36.09364451013709,
    33.33218861006602,
    36.526361020459994,
    33.69395038993398
  ],
  "names": {
    "area": "Damascus",
    "unit": "starter play zone",
    "roadHub": "Hejaz Railway Station"
  }
} satisfies DestinationFacts
