import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "caracas",
  "name": "Caracas",
  "country": {
    "idISOlower": "ve",
    "name": "Venezuela"
  },
  "state": {
    "idunique": "ve-caracas",
    "name": "Caracas"
  },
  "timezone": "America/Caracas",
  "centre": {
    "lon": -66.9146008,
    "lat": 10.5060934
  },
  "airport": {
    "id": "caracas-airport",
    "name": "Maiquetía Simón Bolívar International Airport",
    "lon": -66.991174,
    "lat": 10.602214,
    "sourceUrl": "https://ourairports.com/airports/SVMI/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/venezuela-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -67.09743428529598,
    10.32521251006602,
    -66.73176731470403,
    10.686974289933978
  ],
  "names": {
    "area": "Caracas",
    "unit": "starter play zone",
    "roadHub": "La Hoyada"
  }
} satisfies DestinationFacts
