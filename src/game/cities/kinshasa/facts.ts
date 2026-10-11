import type { DestinationFacts } from '../africa/types.ts'
export const FACTS = {
  "id": "kinshasa",
  "name": "Kinshasa",
  "country": {
    "idISOlower": "cd",
    "name": "Democratic Republic of the Congo"
  },
  "state": {
    "idunique": "cd-starter",
    "name": "Kinshasa"
  },
  "timezone": "Africa/Kinshasa",
  "centre": {
    "lon": 15.31,
    "lat": -4.33
  },
  "airport": {
    "id": "kinshasa-airport",
    "name": "Ndjili International Airport",
    "lon": 15.4446,
    "lat": -4.38575,
    "sourceUrl": "https://ourairports.com/airports/FZAA/"
  },
  "sourceLabel": "Natural Earth, OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "Natural Earth public domain; OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    15.15,
    -4.55,
    15.6,
    -4.2
  ],
  "coverageNote": "Kinshasa on the south bank of the Congo River and Malebo Pool: built-up extent from mapped land use, mapped inland water, main roads and named places from the dated Geofabrik Democratic Republic of the Congo PBF. This is not an administrative boundary. Airport coordinates are an OurAirports dataset point, not evidence of operations or schedules. Visitor services and homes are fictional game content set at real named places.",
  "names": {
    "area": "Kinshasa",
    "unit": "district",
    "roadHub": "Arrêt Zando"
  }
} satisfies DestinationFacts
