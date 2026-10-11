import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "libreville",
  "name": "Libreville",
  "country": {
    "idISOlower": "ga",
    "name": "Gabon"
  },
  "state": {
    "idunique": "ga-libreville",
    "name": "Libreville"
  },
  "timezone": "Africa/Libreville",
  "centre": {
    "lon": 9.46,
    "lat": 0.39
  },
  "airport": {
    "id": "libreville-airport",
    "name": "Libreville Leon M'ba International Airport",
    "lon": 9.41214,
    "lat": 0.458951,
    "sourceUrl": "https://ourairports.com/airports/FOOL/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    9.34,
    0.29,
    9.58,
    0.49
  ],
  "coverageNote": "Libreville: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), the Gulf of Guinea coast, estuary and inland water, main roads and named places mapped in OpenStreetMap. The arrival airport is Libreville Leon M'ba International Airport (LBV/FOOL); its coordinates are a cached OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Libreville",
    "unit": "district",
    "roadHub": "Gare Routière"
  }
} satisfies DestinationFacts
