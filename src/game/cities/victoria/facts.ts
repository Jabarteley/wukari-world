import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "victoria",
  "name": "Victoria",
  "country": {
    "idISOlower": "sc",
    "name": "Seychelles"
  },
  "state": {
    "idunique": "sc-victoria",
    "name": "Victoria"
  },
  "timezone": "Asia/Dubai",
  "centre": {
    "lon": 55.452359,
    "lat": -4.6232085
  },
  "airport": {
    "id": "victoria-airport",
    "name": "Seychelles International Airport",
    "lon": 55.521801,
    "lat": -4.67434,
    "sourceUrl": "https://ourairports.com/airports/FSIA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/africa/seychelles-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    55.272063365586185,
    -4.804089389933978,
    55.63265463441382,
    -4.442327610066021
  ],
  "names": {
    "area": "Victoria",
    "unit": "starter play zone",
    "roadHub": "Port Launay Turning Point"
  }
} satisfies DestinationFacts
