import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "riga",
  "name": "Riga",
  "country": {
    "idISOlower": "lv",
    "name": "Latvia"
  },
  "state": {
    "idunique": "lv-riga",
    "name": "Riga"
  },
  "timezone": "Europe/Riga",
  "centre": {
    "lon": 24.1051846,
    "lat": 56.9493977
  },
  "airport": {
    "id": "riga-airport",
    "name": "Riga International Airport",
    "lon": 23.970711,
    "lat": 56.920752,
    "sourceUrl": "https://ourairports.com/airports/EVRA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/latvia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    23.77415072686342,
    56.76851681006602,
    24.43621847313658,
    57.13027858993398
  ],
  "names": {
    "area": "Riga",
    "unit": "starter play zone",
    "roadHub": "Kalngale"
  }
} satisfies DestinationFacts
