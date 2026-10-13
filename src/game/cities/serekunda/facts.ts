import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "serekunda",
  "name": "Serrekunda",
  "country": {
    "idISOlower": "gm",
    "name": "Gambia"
  },
  "state": {
    "idunique": "gm-serekunda",
    "name": "Serrekunda"
  },
  "timezone": "Africa/Abidjan",
  "centre": {
    "lon": -16.674807,
    "lat": 13.438762
  },
  "airport": {
    "id": "serekunda-airport",
    "name": "Banjul International Airport",
    "lon": -16.652201,
    "lat": 13.338,
    "sourceUrl": "https://ourairports.com/airports/GBYD/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/senegal-and-gambia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -16.85966745004166,
    13.257881110066021,
    -16.489946549958344,
    13.61964288993398
  ],
  "names": {
    "area": "Serrekunda",
    "unit": "starter play zone",
    "roadHub": "Garage Brufut"
  }
} satisfies DestinationFacts
