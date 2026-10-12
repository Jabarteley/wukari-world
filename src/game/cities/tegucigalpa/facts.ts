import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "tegucigalpa",
  "name": "Tegucigalpa",
  "country": {
    "idISOlower": "hn",
    "name": "Honduras"
  },
  "state": {
    "idunique": "hn-tegucigalpa",
    "name": "Tegucigalpa"
  },
  "timezone": "America/Tegucigalpa",
  "centre": {
    "lon": -87.2047053,
    "lat": 14.1058135
  },
  "airport": {
    "id": "tegucigalpa-airport",
    "name": "Toncontín Airport",
    "lon": -87.217201,
    "lat": 14.0609,
    "sourceUrl": "https://ourairports.com/airports/MHTG/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america/honduras-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -87.39010126391533,
    13.924932610066021,
    -87.01930933608467,
    14.286694389933979
  ],
  "names": {
    "area": "Tegucigalpa",
    "unit": "starter play zone",
    "roadHub": "Empresa Aurora"
  }
} satisfies DestinationFacts
