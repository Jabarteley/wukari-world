import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "apia",
  "name": "Apia",
  "country": {
    "idISOlower": "ws",
    "name": "Samoa (western)"
  },
  "state": {
    "idunique": "ws-apia",
    "name": "Apia"
  },
  "timezone": "Pacific/Apia",
  "centre": {
    "lon": -171.7630955,
    "lat": -13.8345235
  },
  "airport": {
    "id": "apia-airport",
    "name": "Faleolo International Airport",
    "lon": -172.007996,
    "lat": -13.83,
    "sourceUrl": "https://ourairports.com/airports/NSFA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/samoa-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    -172.01724767390576,
    -14.015404389933979,
    -171.57792073229658,
    -13.65364261006602
  ],
  "names": {
    "area": "Apia",
    "unit": "starter play zone",
    "roadHub": "Apia Ferry Terminal"
  }
} satisfies DestinationFacts
