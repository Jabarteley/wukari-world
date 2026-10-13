import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "ho-chi-minh-city",
  "name": "Ho Chi Minh City",
  "country": {
    "idISOlower": "vn",
    "name": "Vietnam"
  },
  "state": {
    "idunique": "vn",
    "name": "Ho Chi Minh City"
  },
  "timezone": "Asia/Ho_Chi_Minh",
  "centre": {
    "lon": 106.7166008,
    "lat": 10.7737261
  },
  "airport": {
    "id": "ho-chi-minh-city-airport",
    "name": "Tan Son Nhat International Airport",
    "lon": 106.652,
    "lat": 10.8188,
    "sourceUrl": "https://ourairports.com/airports/VVTS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/vietnam-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    106.53360400569034,
    10.59284521006602,
    106.89959759430965,
    10.954606989933978
  ],
  "names": {
    "area": "Ho Chi Minh City",
    "unit": "starter play zone",
    "roadHub": "Gò Vấp"
  }
} satisfies DestinationFacts
