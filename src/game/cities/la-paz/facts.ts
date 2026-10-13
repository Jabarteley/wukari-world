import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "la-paz",
  "name": "La Paz",
  "country": {
    "idISOlower": "bo",
    "name": "Bolivia"
  },
  "state": {
    "idunique": "bo-la-paz",
    "name": "La Paz"
  },
  "timezone": "America/La_Paz",
  "centre": {
    "lon": -68.1336229,
    "lat": -16.4955455
  },
  "airport": {
    "id": "la-paz-airport",
    "name": "El Alto International Airport",
    "lon": -68.189416,
    "lat": -16.510272,
    "sourceUrl": "https://ourairports.com/airports/SLLP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/bolivia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -68.32117338762112,
    -16.676426389933976,
    -67.9460724123789,
    -16.31466461006602
  ],
  "names": {
    "area": "La Paz",
    "unit": "starter play zone",
    "roadHub": "Terminal de Buses La Paz"
  }
} satisfies DestinationFacts
