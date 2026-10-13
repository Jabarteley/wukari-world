import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "kathmandu",
  "name": "Kathmandu",
  "country": {
    "idISOlower": "np",
    "name": "Nepal"
  },
  "state": {
    "idunique": "np-kathmandu",
    "name": "Kathmandu"
  },
  "timezone": "Asia/Kathmandu",
  "centre": {
    "lon": 85.3205817,
    "lat": 27.708317
  },
  "airport": {
    "id": "kathmandu-airport",
    "name": "Tribhuvan International Airport",
    "lon": 85.3591,
    "lat": 27.6966,
    "sourceUrl": "https://ourairports.com/airports/VNKT/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/nepal-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    85.11731026752476,
    27.527436110066024,
    85.52385313247525,
    27.88919788993398
  ],
  "names": {
    "area": "Kathmandu",
    "unit": "starter play zone",
    "roadHub": "Pasang Lhamu Ticket Counter - Trishuli, Dhunche, Syabrubeshi, Chilime, Timure"
  }
} satisfies DestinationFacts
