import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "dhaka",
  "name": "Dhaka",
  "country": {
    "idISOlower": "bd",
    "name": "Bangladesh"
  },
  "state": {
    "idunique": "bd-dhaka",
    "name": "Dhaka"
  },
  "timezone": "Asia/Dhaka",
  "centre": {
    "lon": 90.3890144,
    "lat": 23.7643863
  },
  "airport": {
    "id": "dhaka-airport",
    "name": "Hazrat Shahjalal International Airport",
    "lon": 90.397783,
    "lat": 23.843347,
    "sourceUrl": "https://ourairports.com/airports/VGHS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/bangladesh-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    90.19243311848332,
    23.583505410066024,
    90.58559568151666,
    23.94526718993398
  ],
  "names": {
    "area": "Dhaka",
    "unit": "starter play zone",
    "roadHub": "Dhaka Airport Railway Station"
  }
} satisfies DestinationFacts
