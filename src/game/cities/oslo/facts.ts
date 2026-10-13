import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "oslo",
  "name": "Oslo",
  "country": {
    "idISOlower": "no",
    "name": "Norway"
  },
  "state": {
    "idunique": "no-oslo",
    "name": "Oslo"
  },
  "timezone": "Europe/Berlin",
  "centre": {
    "lon": 10.7389701,
    "lat": 59.9133301
  },
  "airport": {
    "id": "oslo-airport",
    "name": "Oslo-Gardermoen International Airport",
    "lon": 11.1004,
    "lat": 60.193901,
    "sourceUrl": "https://ourairports.com/airports/ENGM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/europe/norway-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    10.378618864005034,
    59.73244921006602,
    11.118477241021512,
    60.202945044496694
  ],
  "names": {
    "area": "Oslo",
    "unit": "starter play zone",
    "roadHub": "Oslo Central Station"
  }
} satisfies DestinationFacts
