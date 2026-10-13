import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "san-salvador",
  "name": "San Salvador",
  "country": {
    "idISOlower": "sv",
    "name": "El Salvador"
  },
  "state": {
    "idunique": "sv-san-salvador",
    "name": "San Salvador"
  },
  "timezone": "America/El_Salvador",
  "centre": {
    "lon": -89.191156,
    "lat": 13.697629
  },
  "airport": {
    "id": "san-salvador-airport",
    "name": "El Salvador International Airport Saint Óscar Arnulfo Romero y Galdámez",
    "lon": -89.055784,
    "lat": 13.44447,
    "sourceUrl": "https://ourairports.com/airports/MSLP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/el-salvador-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -89.37622092484835,
    13.435425955503302,
    -89.00609107515166,
    13.878509889933978
  ],
  "names": {
    "area": "San Salvador",
    "unit": "starter play zone",
    "roadHub": "Estación de Tren FENADESAL"
  }
} satisfies DestinationFacts
