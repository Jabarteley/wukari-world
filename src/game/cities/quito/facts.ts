import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "quito",
  "name": "Quito",
  "country": {
    "idISOlower": "ec",
    "name": "Ecuador"
  },
  "state": {
    "idunique": "ec-quito",
    "name": "Quito"
  },
  "timezone": "America/Guayaquil",
  "centre": {
    "lon": -78.5123274,
    "lat": -0.2201641
  },
  "airport": {
    "id": "quito-airport",
    "name": "Mariscal Sucre International Airport",
    "lon": -78.354306,
    "lat": -0.125399,
    "sourceUrl": "https://ourairports.com/airports/SEQM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/ecuador-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -78.69199403625385,
    -0.40104498993397847,
    -78.33266076374616,
    -0.039283210066021534
  ],
  "names": {
    "area": "Quito",
    "unit": "starter play zone",
    "roadHub": "TelefériQo"
  }
} satisfies DestinationFacts
