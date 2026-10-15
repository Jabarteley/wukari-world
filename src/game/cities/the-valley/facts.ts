import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "the-valley",
  "name": "The Valley",
  "country": {
    "idISOlower": "ai",
    "name": "Anguilla"
  },
  "state": {
    "idunique": "ai-the-valley",
    "name": "The Valley"
  },
  "timezone": "America/Puerto_Rico",
  "centre": {
    "lon": -63.0517759,
    "lat": 18.2145861
  },
  "airport": {
    "id": "the-valley-airport",
    "name": "Clayton J. Lloyd International Airport",
    "lon": -63.05383,
    "lat": 18.204773,
    "sourceUrl": "https://ourairports.com/airports/TQPF/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/central-america-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -63.24111307900157,
    18.135993353323684,
    -62.86243872099843,
    18.395466989933976
  ],
  "names": {
    "area": "The Valley",
    "unit": "starter play zone",
    "roadHub": "Blowing Point Ferry Terminal"
  }
} satisfies DestinationFacts
