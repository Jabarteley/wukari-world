import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bsb",
  "name": "Bandar Seri Begawan",
  "country": {
    "idISOlower": "bn",
    "name": "Brunei"
  },
  "state": {
    "idunique": "bn-bsb",
    "name": "Bandar Seri Begawan"
  },
  "timezone": "Asia/Kuching",
  "centre": {
    "lon": 114.9417574,
    "lat": 4.8895453
  },
  "airport": {
    "id": "bsb-airport",
    "name": "Brunei International Airport",
    "lon": 114.928001,
    "lat": 4.9442,
    "sourceUrl": "https://ourairports.com/airports/WBSB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/malaysia-singapore-brunei-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    114.76138935172006,
    4.708664410066022,
    115.12212544827995,
    5.070426189933978
  ],
  "names": {
    "area": "Bandar Seri Begawan",
    "unit": "starter play zone",
    "roadHub": "Serasa Ferry Terminal"
  }
} satisfies DestinationFacts
