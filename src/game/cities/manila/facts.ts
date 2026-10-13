import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "manila",
  "name": "Manila",
  "country": {
    "idISOlower": "ph",
    "name": "Philippines"
  },
  "state": {
    "idunique": "ph-manila",
    "name": "Manila"
  },
  "timezone": "Asia/Manila",
  "centre": {
    "lon": 120.9803621,
    "lat": 14.5904492
  },
  "airport": {
    "id": "manila-airport",
    "name": "Ninoy Aquino International Airport",
    "lon": 121.019997,
    "lat": 14.5086,
    "sourceUrl": "https://ourairports.com/airports/RPLL/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/philippines-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    120.7945592842074,
    14.409568310066021,
    121.16616491579259,
    14.77133008993398
  ],
  "names": {
    "area": "Manila",
    "unit": "starter play zone",
    "roadHub": "Katipunan"
  }
} satisfies DestinationFacts
