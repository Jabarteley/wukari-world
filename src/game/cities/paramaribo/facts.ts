import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "paramaribo",
  "name": "Paramaribo",
  "country": {
    "idISOlower": "sr",
    "name": "Suriname"
  },
  "state": {
    "idunique": "sr-paramaribo",
    "name": "Paramaribo"
  },
  "timezone": "America/Paramaribo",
  "centre": {
    "lon": -55.1703941,
    "lat": 5.8247628
  },
  "airport": {
    "id": "paramaribo-airport",
    "name": "Johan Adolf Pengel International Airport",
    "lon": -55.187801,
    "lat": 5.45283,
    "sourceUrl": "https://ourairports.com/airports/SMJP/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/south-america/suriname-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -55.35104783597648,
    5.443785955503301,
    -54.989740364023525,
    6.0056436899339785
  ],
  "names": {
    "area": "Paramaribo",
    "unit": "starter play zone",
    "roadHub": "Line 5 bus station"
  }
} satisfies DestinationFacts
