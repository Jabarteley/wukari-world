import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "noumea",
  "name": "Nouméa",
  "country": {
    "idISOlower": "nc",
    "name": "New Caledonia"
  },
  "state": {
    "idunique": "nc-noumea",
    "name": "Nouméa"
  },
  "timezone": "Pacific/Noumea",
  "centre": {
    "lon": 166.442419,
    "lat": -22.2745264
  },
  "airport": {
    "id": "noumea-airport",
    "name": "Nouméa Magenta Airport",
    "lon": 166.472822,
    "lat": -22.257706,
    "sourceUrl": "https://ourairports.com/airports/NWWM/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/australia-oceania/new-caledonia-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    166.24801661034195,
    -22.455407289933977,
    166.63682138965805,
    -22.093645510066022
  ],
  "names": {
    "area": "Nouméa",
    "unit": "starter play zone",
    "roadHub": "PAITA CENTRE"
  }
} satisfies DestinationFacts
