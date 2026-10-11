import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "luanda",
  "name": "Luanda",
  "country": {
    "idISOlower": "ao",
    "name": "Angola"
  },
  "state": {
    "idunique": "ao-luanda",
    "name": "Luanda"
  },
  "timezone": "Africa/Luanda",
  "centre": {
    "lon": 13.2439512,
    "lat": -8.8272699
  },
  "airport": {
    "id": "luanda-airport",
    "name": "Dr. Antonio Agostinho Neto International Airport",
    "lon": 13.499078,
    "lat": -9.050734,
    "sourceUrl": "https://ourairports.com/airports/FNBJ/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    13.12,
    -9.09,
    13.53,
    -8.72
  ],
  "coverageNote": "Luanda: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), Luanda Bay as a coastal water band, main roads and named places mapped in OpenStreetMap. The arrival airport is Dr. Antonio Agostinho Neto International Airport (NBJ/FNBJ); its coordinates are an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Luanda",
    "unit": "district",
    "roadHub": "Bungo - Luanda Central Station"
  }
} satisfies DestinationFacts
