import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "honiara",
  "name": "Honiara",
  "country": {
    "idISOlower": "sb",
    "name": "Solomon Islands"
  },
  "state": {
    "idunique": "sb-honiara",
    "name": "Honiara"
  },
  "timezone": "Pacific/Guadalcanal",
  "centre": {
    "lon": 159.9552552,
    "lat": -9.4310769
  },
  "airport": {
    "id": "honiara-airport",
    "name": "Honiara International Airport",
    "lon": 160.054993,
    "lat": -9.428,
    "sourceUrl": "https://ourairports.com/airports/AGGH/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/solomon-islands-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    159.77303481132108,
    -9.61195778993398,
    160.13747558867894,
    -9.250196010066022
  ],
  "names": {
    "area": "Honiara",
    "unit": "starter play zone",
    "roadHub": "Lunga"
  }
} satisfies DestinationFacts
