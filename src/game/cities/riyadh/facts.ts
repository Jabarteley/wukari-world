import type { DestinationFacts } from '../africa/types.ts'

export const FACTS = {
  "id": "riyadh",
  "name": "Riyadh",
  "country": {
    "idISOlower": "sa",
    "name": "Saudi Arabia"
  },
  "state": {
    "idunique": "sa-riyadh",
    "name": "Riyadh"
  },
  "timezone": "Asia/Riyadh",
  "centre": {
    "lon": 46.7160104,
    "lat": 24.638916
  },
  "airport": {
    "id": "riyadh-airport",
    "name": "King Khalid International Airport",
    "lon": 46.698799,
    "lat": 24.9576,
    "sourceUrl": "https://ourairports.com/airports/OERK/"
  },
  "sourceLabel": "OpenStreetMap country PBF and OurAirports dated CSV",
  "sourceUrl": "https://download.geofabrik.de/asia/gcc-states-261011.osm.pbf",
  "licence": "OpenStreetMap ODbL-1.0; OurAirports public-domain dataset",
  "coverageNote": "Source-sampling bounds from a mapped city node and airport record; city grouping is not an administrative-boundary claim. Airport records do not establish current operations.",
  "bounds": [
    46.51806438549398,
    24.45803511006602,
    46.913956414506025,
    24.966644044496697
  ],
  "names": {
    "area": "Riyadh",
    "unit": "starter play zone",
    "roadHub": "Riyadh Railway Station"
  }
} satisfies DestinationFacts
