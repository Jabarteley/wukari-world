import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "male",
  "name": "Malé",
  "country": {
    "idISOlower": "mv",
    "name": "Maldives"
  },
  "state": {
    "idunique": "mv-male",
    "name": "Malé"
  },
  "timezone": "Indian/Maldives",
  "centre": {
    "lon": 73.5107387,
    "lat": 4.1779879
  },
  "airport": {
    "id": "male-airport",
    "name": "Velana International Airport",
    "lon": 73.529099,
    "lat": 4.19183,
    "sourceUrl": "https://ourairports.com/airports/VRMM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/maldives-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    73.33055529711906,
    3.997107010066021,
    73.69092210288095,
    4.358868789933978
  ],
  "names": {
    "area": "Malé",
    "unit": "starter play zone",
    "roadHub": "Heinveru Ferry Terminal (public ferry to other atolls)"
  }
} satisfies DestinationFacts
