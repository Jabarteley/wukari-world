import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "doha",
  "name": "Doha",
  "country": {
    "idISOlower": "qa",
    "name": "Qatar"
  },
  "state": {
    "idunique": "qa-doha",
    "name": "Doha"
  },
  "timezone": "Asia/Qatar",
  "centre": {
    "lon": 51.5264162,
    "lat": 25.2856329
  },
  "airport": {
    "id": "doha-airport",
    "name": "Hamad International Airport",
    "lon": 51.608056,
    "lat": 25.273056,
    "sourceUrl": "https://ourairports.com/airports/OTHH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    51.32741872125049,
    25.104752010066022,
    51.72541367874951,
    25.466513789933977
  ],
  "names": {
    "area": "Doha",
    "unit": "starter play zone",
    "roadHub": "National Museum"
  }
} satisfies DestinationFacts
