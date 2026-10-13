import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "minsk",
  "name": "Minsk",
  "country": {
    "idISOlower": "by",
    "name": "Belarus"
  },
  "state": {
    "idunique": "by-minsk",
    "name": "Minsk"
  },
  "timezone": "Europe/Minsk",
  "centre": {
    "lon": 27.5618225,
    "lat": 53.9024716
  },
  "airport": {
    "id": "minsk-airport",
    "name": "Minsk National Airport",
    "lon": 28.039964,
    "lat": 53.888071,
    "sourceUrl": "https://ourairports.com/airports/UMMS/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/belarus-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    27.25554926623365,
    53.72159071006602,
    28.055209327656982,
    54.08335248993398
  ],
  "names": {
    "area": "Minsk",
    "unit": "starter play zone",
    "roadHub": "Kamiennaja Horka"
  }
} satisfies DestinationFacts
