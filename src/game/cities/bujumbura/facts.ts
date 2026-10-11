import type { DestinationFacts } from '../africa/types.ts'
export const FACTS = {
  "id": "bujumbura",
  "name": "Bujumbura",
  "country": {
    "idISOlower": "bi",
    "name": "Burundi"
  },
  "state": {
    "idunique": "bi-starter",
    "name": "Bujumbura"
  },
  "timezone": "Africa/Bujumbura",
  "centre": {
    "lon": 29.36,
    "lat": -3.38
  },
  "airport": {
    "id": "bujumbura-airport",
    "name": "Bujumbura Melchior Ndadaye International Airport",
    "lon": 29.318501,
    "lat": -3.32402,
    "sourceUrl": "https://ourairports.com/airports/HBBA/"
  },
  "sourceLabel": "Natural Earth, OpenStreetMap contributors via Geofabrik Burundi 2026-10-09, and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "Natural Earth public domain; OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    29.24,
    -3.48,
    29.48,
    -3.28
  ],
  "coverageNote": "Bujumbura: built-up ground traced from mapped land use, actual Lake Tanganyika and river polygons, roads and named places in the dated Burundi OpenStreetMap PBF. Airport coordinates are an OurAirports dataset point, not proof of operations or schedules. Visitor services and homes are fictional game content at real places.",
  "names": {
    "area": "Bujumbura",
    "unit": "district",
    "roadHub": "Bujumbura Bus Station (Siyoni)"
  }
} satisfies DestinationFacts
