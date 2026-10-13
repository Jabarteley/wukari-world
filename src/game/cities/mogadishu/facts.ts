import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "mogadishu",
  "name": "Mogadishu",
  "country": {
    "idISOlower": "so",
    "name": "Somalia"
  },
  "state": {
    "idunique": "so-mogadishu",
    "name": "Mogadishu"
  },
  "timezone": "Africa/Nairobi",
  "centre": {
    "lon": 45.3419183,
    "lat": 2.0349312
  },
  "airport": {
    "id": "mogadishu-airport",
    "name": "Aden Adde International Airport",
    "lon": 45.304699,
    "lat": 2.01444,
    "sourceUrl": "https://ourairports.com/airports/HCMM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/somalia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    45.162121628217974,
    1.8540503100660215,
    45.52171497178203,
    2.2158120899339786
  ],
  "names": {
    "area": "Mogadishu",
    "unit": "starter play zone",
    "roadHub": "Isgoyska Xoosh"
  }
} satisfies DestinationFacts
