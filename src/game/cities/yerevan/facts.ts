import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "yerevan",
  "name": "Yerevan",
  "country": {
    "idISOlower": "am",
    "name": "Armenia"
  },
  "state": {
    "idunique": "am-yerevan",
    "name": "Yerevan"
  },
  "timezone": "Asia/Yerevan",
  "centre": {
    "lon": 44.5126233,
    "lat": 40.1777112
  },
  "airport": {
    "id": "yerevan-airport",
    "name": "Zvartnots International Airport",
    "lon": 44.397887,
    "lat": 40.148941,
    "sourceUrl": "https://ourairports.com/airports/UDYZ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/armenia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    44.2768481023053,
    39.99683031006602,
    44.7483984976947,
    40.35859208993398
  ],
  "names": {
    "area": "Yerevan",
    "unit": "starter play zone",
    "roadHub": "Sasuntsi David"
  }
} satisfies DestinationFacts
