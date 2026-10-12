import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "auckland",
  "name": "Auckland",
  "country": {
    "idISOlower": "nz",
    "name": "New Zealand"
  },
  "state": {
    "idunique": "nz-auckland",
    "name": "Auckland"
  },
  "timezone": "Pacific/Auckland",
  "centre": {
    "lon": 174.7631803,
    "lat": -36.852095
  },
  "airport": {
    "id": "auckland-airport",
    "name": "Auckland International Airport",
    "lon": 174.786331,
    "lat": -37.01199,
    "sourceUrl": "https://ourairports.com/airports/NZAA/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/new-zealand-261009.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    174.5381211639701,
    -37.03297588993398,
    174.9882394360299,
    -36.67121411006602
  ],
  "names": {
    "area": "Auckland",
    "roadHub": "Glen Eden",
    "unit": "suburb"
  }
} satisfies DestinationFacts
