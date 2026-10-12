import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "buenos-aires",
  "name": "Buenos Aires",
  "country": {
    "idISOlower": "ar",
    "name": "Argentina"
  },
  "state": {
    "idunique": "ar-buenos-aires",
    "name": "Buenos Aires"
  },
  "timezone": "America/Argentina/Buenos_Aires",
  "centre": {
    "lon": -58.3887904,
    "lat": -34.6095579
  },
  "airport": {
    "id": "buenos-aires-airport",
    "name": "Ezeiza International Airport - Ministro Pistarini",
    "lon": -58.5358,
    "lat": -34.8222,
    "sourceUrl": "https://ourairports.com/airports/SAEZ/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/argentina-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -58.6075586829576,
    -34.8312440444967,
    -58.17002211704239,
    -34.42867701006602
  ],
  "names": {
    "area": "Buenos Aires",
    "unit": "starter play zone",
    "roadHub": "Avenida La Plata"
  }
} satisfies DestinationFacts
