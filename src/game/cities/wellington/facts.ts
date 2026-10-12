import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "wellington",
  "name": "Wellington",
  "country": {
    "idISOlower": "nz",
    "name": "New Zealand"
  },
  "state": {
    "idunique": "nz-wellington",
    "name": "Wellington"
  },
  "timezone": "Pacific/Auckland",
  "centre": {
    "lon": 174.7772114,
    "lat": -41.2887953
  },
  "airport": {
    "id": "wellington-airport",
    "name": "Wellington International Airport",
    "lon": 174.806862,
    "lat": -41.326839,
    "sourceUrl": "https://ourairports.com/airports/NZWN/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/new-zealand-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    174.53743998323975,
    -41.46967618993398,
    175.01698281676025,
    -41.107914410066016
  ],
  "names": {
    "area": "Wellington",
    "roadHub": "Crofton Downs",
    "unit": "suburb"
  }
} satisfies DestinationFacts
