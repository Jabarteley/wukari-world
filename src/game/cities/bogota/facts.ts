import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "bogota",
  "name": "Bogota",
  "country": {
    "idISOlower": "co",
    "name": "Colombia"
  },
  "state": {
    "idunique": "co-bogota",
    "name": "Bogota"
  },
  "timezone": "America/Bogota",
  "centre": {
    "lon": -74.0836331,
    "lat": 4.6533817
  },
  "airport": {
    "id": "bogota-airport",
    "name": "El Dorado International Airport",
    "lon": -74.1469,
    "lat": 4.70159,
    "sourceUrl": "https://ourairports.com/airports/SKBO/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/colombia-261010.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -74.26393673956612,
    4.4725008100660215,
    -73.90332946043388,
    4.834262589933978
  ],
  "names": {
    "area": "Bogota",
    "unit": "starter play zone",
    "roadHub": "Estación Intermedia Bicentenario"
  }
} satisfies DestinationFacts
