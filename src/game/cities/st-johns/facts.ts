import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "st-johns",
  "name": "St. John's",
  "country": {
    "idISOlower": "ag",
    "name": "Antigua & Barbuda"
  },
  "state": {
    "idunique": "ag-st-johns",
    "name": "St. John's"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -61.8448509,
    "lat": 17.1184569
  },
  "airport": {
    "id": "st-johns-airport",
    "name": "V. C. Bird International Airport",
    "lon": -61.792702,
    "lat": 17.1367,
    "sourceUrl": "https://ourairports.com/airports/TAPA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -62.03302534992644,
    16.937576010066024,
    -61.656676450073554,
    17.29933778993398
  ],
  "names": {
    "area": "St. John's",
    "unit": "starter play zone",
    "roadHub": "East Bus Station"
  }
} satisfies DestinationFacts
