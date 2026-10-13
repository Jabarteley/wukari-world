import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "baku",
  "name": "Baku",
  "country": {
    "idISOlower": "az",
    "name": "Azerbaijan"
  },
  "state": {
    "idunique": "az-baku",
    "name": "Baku"
  },
  "timezone": "Asia/Baku",
  "centre": {
    "lon": 49.8328009,
    "lat": 40.3755885
  },
  "airport": {
    "id": "baku-airport",
    "name": "Heydar Aliyev International Airport",
    "lon": 50.050931,
    "lat": 40.47278,
    "sourceUrl": "https://ourairports.com/airports/UBBB/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/azerbaijan-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    49.59633026354774,
    40.19470761006602,
    50.06927153645226,
    40.55646938993398
  ],
  "names": {
    "area": "Baku",
    "unit": "starter play zone",
    "roadHub": "Shah Ismail Khatai"
  }
} satisfies DestinationFacts
