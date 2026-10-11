import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bamako",
  "name": "Bamako",
  "country": {
    "idISOlower": "ml",
    "name": "Mali"
  },
  "state": {
    "idunique": "ml-bamako",
    "name": "Bamako District"
  },
  "timezone": "Africa/Bamako",
  "centre": {
    "lon": -8,
    "lat": 12.65
  },
  "airport": {
    "id": "bamako-airport",
    "name": "Modibo Keita International Airport",
    "lon": -7.94994,
    "lat": 12.5335,
    "sourceUrl": "https://ourairports.com/airports/GABS/"
  },
  "sourceLabel": "OpenStreetMap contributors via the Geofabrik Mali PBF and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    -8.1,
    12.5,
    -7.88,
    12.75
  ],
  "coverageNote": "Bamako: a sketch of the built-up extent traced from mapped land use, explicitly mapped Niger River water and other water areas, main roads and named places in OpenStreetMap. Modibo Keita International Airport is the published OurAirports point, not an official reference point or evidence of current schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Bamako",
    "unit": "district",
    "roadHub": "Bamako"
  }
} satisfies DestinationFacts
