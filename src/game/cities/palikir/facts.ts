import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "palikir",
  "name": "Palikir",
  "country": {
    "idISOlower": "fm",
    "name": "Micronesia"
  },
  "state": {
    "idunique": "fm-palikir",
    "name": "Palikir"
  },
  "timezone": "Pacific/Guadalcanal",
  "centre": {
    "lon": 158.1627143,
    "lat": 6.920744
  },
  "airport": {
    "id": "palikir-airport",
    "name": "Pohnpei International Airport",
    "lon": 158.20992,
    "lat": 6.985082,
    "sourceUrl": "https://ourairports.com/airports/PTPN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/micronesia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    157.98166311858617,
    6.739863110066022,
    158.34376548141384,
    7.101624889933978
  ],
  "names": {
    "area": "Palikir",
    "unit": "starter play zone",
    "roadHub": "City transit stop (game venue)"
  }
} satisfies DestinationFacts
