import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "shanghai",
  "name": "Shanghai",
  "country": {
    "idISOlower": "cn",
    "name": "China"
  },
  "state": {
    "idunique": "cn-shanghai",
    "name": "Shanghai"
  },
  "timezone": "Asia/Shanghai",
  "centre": {
    "lon": 121.4691024,
    "lat": 31.2323437
  },
  "airport": {
    "id": "shanghai-airport",
    "name": "Shanghai Pudong International Airport",
    "lon": 121.805,
    "lat": 31.1434,
    "sourceUrl": "https://ourairports.com/airports/ZSPD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/china/shanghai-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    121.25858469409144,
    31.051462810066024,
    121.81549681636386,
    31.41322458993398
  ],
  "names": {
    "area": "Shanghai",
    "unit": "starter play zone",
    "roadHub": "East Nanjing Road"
  }
} satisfies DestinationFacts
