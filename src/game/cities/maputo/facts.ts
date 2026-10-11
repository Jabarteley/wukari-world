import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "maputo",
  "name": "Maputo",
  "country": {
    "idISOlower": "mz",
    "name": "Mozambique"
  },
  "state": {
    "idunique": "mz-maputo",
    "name": "Maputo"
  },
  "timezone": "Africa/Maputo",
  "centre": {
    "lon": 32.56745,
    "lat": -25.966213
  },
  "airport": {
    "id": "maputo-airport",
    "name": "Maputo Airport",
    "lon": 32.572601,
    "lat": -25.920799,
    "sourceUrl": "https://ourairports.com/airports/FQMA/"
  },
  "sourceLabel": "OpenStreetMap contributors and OurAirports dataset",
  "sourceUrl": "https://www.openstreetmap.org/copyright",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "bounds": [
    32.44,
    -26.07,
    32.69,
    -25.86
  ],
  "coverageNote": "Maputo: a sketch of the built-up extent traced from mapped land use (not an administrative boundary), Maputo Bay as a coastal water band, main roads and named places mapped in OpenStreetMap. The airport coordinates are an OurAirports dataset point, not an official reference point or evidence of current operations or schedules. Visitor services and homes are fictional game content set at the real named places.",
  "names": {
    "area": "Maputo",
    "unit": "district",
    "roadHub": "Maputo Central Railway Station"
  }
} satisfies DestinationFacts
