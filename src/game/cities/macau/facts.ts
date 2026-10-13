import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "macau",
  "name": "Macau",
  "country": {
    "idISOlower": "mo",
    "name": "Macau"
  },
  "state": {
    "idunique": "mo-macau",
    "name": "Macau"
  },
  "timezone": "Asia/Macau",
  "centre": {
    "lon": 113.5380454,
    "lat": 22.1899448
  },
  "airport": {
    "id": "macau-airport",
    "name": "Macau International Airport",
    "lon": 113.592003,
    "lat": 22.149599,
    "sourceUrl": "https://ourairports.com/airports/VMMC/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/china/guangdong-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    113.34376133670828,
    22.009063910066022,
    113.73232946329172,
    22.370825689933977
  ],
  "names": {
    "area": "Macau",
    "unit": "starter play zone",
    "roadHub": "凱泉灣總站 Riviera Macau / Terminal"
  }
} satisfies DestinationFacts
