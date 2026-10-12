import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "montevideo",
  "name": "Montevideo",
  "country": {
    "idISOlower": "uy",
    "name": "Uruguay"
  },
  "state": {
    "idunique": "uy-montevideo",
    "name": "Montevideo"
  },
  "timezone": "America/Montevideo",
  "centre": {
    "lon": -56.1913095,
    "lat": -34.9058916
  },
  "airport": {
    "id": "montevideo-airport",
    "name": "Carrasco General Cesáreo L. Berisso International Airport",
    "lon": -56.026497,
    "lat": -34.835647,
    "sourceUrl": "https://ourairports.com/airports/SUMU/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/uruguay-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -56.4108696731972,
    -35.08677248993398,
    -55.97174932680281,
    -34.725010710066016
  ],
  "names": {
    "area": "Montevideo",
    "unit": "starter play zone",
    "roadHub": "Terminal Tres Cruces"
  }
} satisfies DestinationFacts
